// Lightweight name matching for the university/college catalog — used both
// when a student self-selects their institution (free text should land on
// an existing catalog entry, not create a near-duplicate) and when a TPO
// registers (should claim an existing unclaimed entry instead of creating
// a duplicate whenever a confident match exists).

const normalize = (name = '') =>
  String(name)
    .toLowerCase()
    .replace(/[.,()]/g, '')
    .replace(/\b(university|college|institute|of|technology|the|&|and)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Finds the best matching University document for a free-text name among
 * a list of candidates (already fetched — this repo's catalog is small
 * enough to compare in memory rather than needing a text-search query).
 * Returns the matching doc or null. Exact (normalized) match only — no
 * fuzzy/partial matching, since a wrong auto-claim (e.g. matching "IIT
 * Delhi" to "IIIT Delhi") would misattribute a real institution's account.
 */
function findBestMatch(rawName, candidates) {
  const target = normalize(rawName);
  if (!target) return null;

  const exact = candidates.find((c) => normalize(c.name) === target);
  if (exact) return exact;

  return null;
}

module.exports = { normalize, findBestMatch };
