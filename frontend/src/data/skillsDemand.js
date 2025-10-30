// Approximate market demand levels mapped to scores (0-100)
// You can extend this list; it's decoupled from backend and LLM.
export const SKILL_DEMAND = {
  'Python': 95,
  'Java': 80,
  'JavaScript': 90,
  'React': 85,
  'Node.js': 80,
  'Data Analysis': 92,
  'Machine Learning': 94,
  'SQL': 88,
  'AWS': 85,
  'Docker': 78,
  'Kubernetes': 75
};

export function demandFor(skill) {
  return SKILL_DEMAND[normalizeSkill(skill)] ?? 60; // default baseline
}

export function normalizeSkill(s) {
  return (s || '').toString().trim().replace(/\s+/g, ' ')
    .replace(/\bjs\b/i, 'JavaScript')
    .replace(/\bnode\b/i, 'Node.js')
    .replace(/\bml\b/i, 'Machine Learning')
    .replace(/\bsql\b/i, 'SQL')
    .replace(/\bpython\b/i, 'Python')
    .replace(/\bjava\b/i, 'Java');
}
