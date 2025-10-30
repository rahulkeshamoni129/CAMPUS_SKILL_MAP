// Lightweight parser to extract structured hints from the LLM's free-text recommendation
// Does not require backend changes. Falls back gracefully if signals are absent.

export function parseRecommendationText(text = '') {
  // First try to parse any JSON the LLM might have included.
  const json = extractFirstJsonObject(text);
  const fromJson = json ? normalizeJsonShape(json) : {};

  const lower = text.toLowerCase();

  const extractListAfter = (label) => {
    const idx = lower.indexOf(label.toLowerCase());
    if (idx === -1) return [];
    // Grab substring after label; split by newline or comma; strip bullets
    const after = text.slice(idx + label.length);
    const lines = after.split(/\n|,/).map(s => s
      .replace(/^[-*\d.)\s]+/, '')
      .trim())
      .filter(Boolean);
    // Stop at next section-like keyword
    const stopIdx = lines.findIndex(l => /roles|salary|range|resources|read|learn|skills?:/i.test(l));
    return (stopIdx !== -1 ? lines.slice(0, stopIdx) : lines)
      .map(s => s.replace(/\.$/, ''));
  };

  // Heuristic labels the model may use (only used if JSON didn't provide these)
  const missingSkills = [
    ...extractListAfter('Missing skills:'),
    ...extractListAfter('Skills to learn:'),
    ...extractListAfter('Skill gaps:')
  ].map(s => titleCase(s));

  const roles = [
    ...extractListAfter('Suitable job roles:'),
    ...extractListAfter('Recommended roles:'),
  ].map(s => titleCase(s));

  const resources = [
    ...extractListAfter('Resources:'),
    ...extractListAfter('What to read:'),
    ...extractListAfter('Learning plan:')
  ];

  // Salary range (grab first currency-like or range pattern)
  const salaryMatch = text.match(/\b(\$|₹|INR|USD)?\s?\d+(?:,\d+)*(?:\s?-\s?\d+(?:,\d+)*)?\b/);
  const salaryRange = salaryMatch ? salaryMatch[0] : '';

  return {
    missingSkills: uniqueNonEmpty([...(fromJson.missingSkills || []), ...missingSkills]),
    roles: uniqueNonEmpty([...(fromJson.roles || []), ...roles]),
    resources: uniqueNonEmpty([...(fromJson.resources || []), ...resources]),
    salaryRange: fromJson.salaryRange || salaryRange,
    // Structured extras if available from JSON or heuristics
    skillScores: fromJson.skillScores || extractSkillScores(text),
    skillDemand: fromJson.skillDemand || {},
    skillCurrent: fromJson.skillCurrent || {},
    resourcesBySkill: fromJson.resourcesBySkill || mapResourcesToSkills((fromJson.resources || []).concat(resources))
  };
}

export function titleCase(s) {
  return s.replace(/_/g, ' ').replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase()).trim();
}

function uniqueNonEmpty(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

// Attempt to extract the first JSON object embedded in the text.
export function extractFirstJsonObject(text) {
  if (!text) return null;
  // Prefer fenced ```json blocks
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidates = [];
  if (fenced && fenced[1]) candidates.push(fenced[1]);
  // Fallback: any {...} that looks like an object
  const brace = text.match(/\{[\s\S]*\}/);
  if (brace) candidates.push(brace[0]);
  for (const c of candidates) {
    try {
      const o = JSON.parse(stripTrailingCommas(c));
      if (o && typeof o === 'object') return o;
    } catch {}
  }
  return null;
}

function stripTrailingCommas(s) {
  return s.replace(/,\s*([}\]])/g, '$1');
}

// Normalize varying JSON shapes to a common structure
function normalizeJsonShape(o) {
  const missingSkills = uniqueNonEmpty(
    (o.missingSkills?.map(ms => (typeof ms === 'string' ? ms : ms?.name)) || [])
      .filter(Boolean)
  );
  const roles = uniqueNonEmpty(
    (o.roles?.map(r => (typeof r === 'string' ? r : r?.title)) || [])
      .filter(Boolean)
  );
  const resources = uniqueNonEmpty(
    (o.resources?.map(r => (typeof r === 'string' ? r : r?.title || `${r?.title || ''} ${r?.url || ''}`)) || [])
      .filter(Boolean)
  );
  const resourcesBySkill = {};
  if (Array.isArray(o.resources)) {
    for (const r of o.resources) {
      const skill = (typeof r === 'object' && r?.skill) ? titleCase(r.skill) : null;
      if (skill) {
        if (!resourcesBySkill[skill]) resourcesBySkill[skill] = [];
        const label = r.url ? `${r.title || r.url} (${r.url})` : (r.title || 'Resource');
        resourcesBySkill[skill].push(label);
      }
    }
  }

  const skillScores = {};
  if (Array.isArray(o.skillGaps)) {
    for (const g of o.skillGaps) {
      const name = titleCase(g.name || g.skill || '');
      if (!name) continue;
      if (typeof g.priority === 'number') skillScores[name] = g.priority;
      else if (typeof g.gapScore === 'number') skillScores[name] = g.gapScore;
      else if (typeof g.demand === 'number') skillScores[name] = g.demand;
    }
  }

  const skillCurrent = {};
  const skillDemand = {};
  if (Array.isArray(o.skillGaps)) {
    for (const g of o.skillGaps) {
      const name = titleCase(g.name || g.skill || '');
      if (!name) continue;
      if (typeof g.currentLevel === 'number') skillCurrent[name] = clamp100(g.currentLevel);
      if (typeof g.targetLevel === 'number') skillDemand[name] = clamp100(g.targetLevel);
      if (typeof g.demand === 'number') skillDemand[name] = clamp100(g.demand);
    }
  }

  return {
    missingSkills,
    roles,
    resources,
    resourcesBySkill,
    salaryRange: o.salaryRange || o.salary || '',
    skillScores,
    skillDemand,
    skillCurrent
  };
}

function clamp100(n){
  n = Number(n);
  if (Number.isNaN(n)) return undefined;
  return Math.max(0, Math.min(100, n));
}

// Extract simple patterns like "Python: 70/100", "SQL current 40 demand 90"
function extractSkillScores(text) {
  const lines = text.split(/\n/).map(s => s.trim());
  const scores = {};
  for (const line of lines) {
    const m1 = line.match(/^([A-Za-z0-9.+#\-\s]+):\s*(\d{1,3})\s*(?:\/\s*100)?/);
    if (m1) {
      const skill = titleCase(m1[1]);
      const val = clamp100(Number(m1[2]));
      if (skill && typeof val === 'number') scores[skill] = val;
      continue;
    }
  }
  return scores;
}

function mapResourcesToSkills(resources){
  const map = {};
  const skills = new Set();
  // Guess skill tokens by capitalized words or known tech names appearing in lines
  for (const raw of resources || []) {
    const line = String(raw);
    const tokens = line.match(/[A-Z][a-zA-Z+.#-]{1,}/g) || [];
    for (const t of tokens) skills.add(titleCase(t));
  }
  for (const s of skills) map[s] = [];
  for (const raw of resources || []) {
    const line = String(raw);
    for (const s of skills) {
      if (new RegExp(`\\b${s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(line)) {
        map[s].push(line);
      }
    }
  }
  return map;
}
