const { CATALOG, ALIASES, allSkills } = require('../data/skillCatalog');

// Heuristic classifier — used only as a fallback when a skill name can't be
// matched to the catalog at all (see matchSkillToCatalog below). Users can
// always override the category manually.
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
  // 'technical' is the default fallback.
};

function categorizeSkill(name) {
  const lower = String(name || '').toLowerCase().trim();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower === k || lower.includes(k))) return category;
  }
  return 'technical';
}

// Build a lowercase-name -> {name, category} index once, from both the
// catalog itself and every alias (aliases resolve to their canonical
// entry's category).
const _index = new Map();
for (const { name, category } of allSkills()) {
  _index.set(name.toLowerCase(), { name, category });
}
for (const [alias, canonicalName] of Object.entries(ALIASES)) {
  const target = _index.get(canonicalName.toLowerCase());
  if (target) _index.set(alias.toLowerCase(), target);
}

function _normalize(s) {
  return String(s || '').toLowerCase().trim().replace(/[.\-_]/g, ' ').replace(/\s+/g, ' ');
}

/**
 * Match a free-text skill name (e.g. from resume extraction or manual entry)
 * to the canonical catalog entry, so the profile stores consistent names
 * ("Node.js" not "NodeJS"/"Node"/"node.js" as three different skills) with a
 * real category instead of a guess.
 *
 * Returns { name, category, matched }: matched=true means it resolved to a
 * real catalog entry (name is the canonical form); matched=false means no
 * confident match was found — name is the original input, category is a
 * best-effort heuristic guess. Callers should still add unmatched skills
 * (don't silently drop real skills just because they're not in the catalog).
 */
function matchSkillToCatalog(rawName) {
  const raw = String(rawName || '').trim();
  if (!raw) return { name: raw, category: 'technical', matched: false };

  const exact = _index.get(raw.toLowerCase());
  if (exact) return { name: exact.name, category: exact.category, matched: true };

  const normalized = _normalize(raw);
  const normalizedExact = _index.get(normalized);
  if (normalizedExact) return { name: normalizedExact.name, category: normalizedExact.category, matched: true };

  // Best-effort partial match: catalog entry is a whole-word substring of
  // the input or vice versa. Guards against 1-2 char inputs matching everything.
  if (normalized.length >= 3) {
    for (const [key, entry] of _index) {
      if (key.length < 3) continue;
      if (normalized === key) return { name: entry.name, category: entry.category, matched: true };
      const words = normalized.split(' ');
      const keyWords = key.split(' ');
      if (words.length === 1 && keyWords.includes(normalized)) {
        return { name: entry.name, category: entry.category, matched: true };
      }
      if (keyWords.length === 1 && words.includes(key)) {
        return { name: entry.name, category: entry.category, matched: true };
      }
    }
  }

  return { name: raw, category: categorizeSkill(raw), matched: false };
}

module.exports = { categorizeSkill, matchSkillToCatalog, CATALOG };
