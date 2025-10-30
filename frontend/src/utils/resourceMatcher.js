// Match LLM-proposed resources to a specific skill using simple keyword heuristics
export function matchResourcesForSkill(skill, resources = []) {
  if (!skill) return [];
  const k = normalize(skill);
  const scored = resources.map((r) => ({ r, score: scoreLine(k, r) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.r);
  // Fallback: if nothing matched, suggest generic learning plan
  if (scored.length === 0) {
    return [
      `Start with a beginner-friendly ${skill} course (video or interactive)`,
      `Read official docs for ${skill} and build a mini-project`,
      `Practice 2-3 challenges related to ${skill}`
    ];
  }
  return Array.from(new Set(scored)).slice(0, 6);
}

function scoreLine(skillKey, line) {
  const l = normalize(line);
  let score = 0;
  if (l.includes(skillKey)) score += 3;
  // Reward common synonyms
  if (skillKey === 'javascript' && /js\b/.test(l)) score += 2;
  if (skillKey === 'node.js' && /node\b/.test(l)) score += 2;
  if (skillKey === 'machine learning' && /ml\b/.test(l)) score += 2;
  if (/tutorial|guide|course|docs|book|playlist|roadmap|practice|project/i.test(line)) score += 1;
  return score;
}

function normalize(s) { return (s || '').toString().trim().toLowerCase(); }
