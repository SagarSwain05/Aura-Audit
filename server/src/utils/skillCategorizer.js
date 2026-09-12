// Heuristic classifier for student skills into 4 buckets. Not perfect by
// design — users can always override the category manually; this just picks
// a sensible default so newly-added/resume-synced skills aren't uncategorized.
const CATEGORY_KEYWORDS = {
  communication: [
    'communication', 'public speaking', 'presentation', 'technical writing',
    'documentation', 'negotiation', 'leadership', 'teamwork', 'collaboration',
    'mentoring', 'mentorship', 'client management', 'stakeholder management',
    'active listening', 'interpersonal', 'storytelling', 'copywriting',
    'content writing', 'cross-functional', 'conflict resolution',
  ],
  quantitative: [
    'excel', 'sql', 'statistics', 'statistical analysis', 'data analysis',
    'financial modeling', 'tableau', 'power bi', 'r programming', 'mathematics',
    'calculus', 'linear algebra', 'quantitative analysis', 'econometrics',
    'forecasting', 'a/b testing', 'numpy', 'pandas', 'data visualization',
    'business analytics', 'accounting', 'finance', 'probability',
  ],
  real_world: [
    'project management', 'problem solving', 'critical thinking', 'time management',
    'adaptability', 'customer service', 'sales', 'business development', 'operations',
    'supply chain', 'manufacturing', 'quality assurance', 'clinical research',
    'fieldwork', 'agile', 'scrum', 'itil', 'process improvement', 'vendor management',
    'budgeting', 'event planning', 'logistics',
  ],
  // 'technical' is the default fallback — covers languages, frameworks, tools,
  // cloud/infra, databases, and anything not matched above.
};

function categorizeSkill(name) {
  const lower = String(name || '').toLowerCase().trim();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower === k || lower.includes(k))) return category;
  }
  return 'technical';
}

module.exports = { categorizeSkill };
