const University = require('../models/University');

// GET /api/universities/catalog — public browse/search across every seeded
// + registered university and college. Used by students picking their
// institution and (client-side) during TPO registration to offer "claim an
// existing entry" instead of creating a duplicate.
exports.searchCatalog = async (req, res) => {
  const { search, state, type } = req.query;
  const filter = {};
  if (state) filter.state = state;
  if (type) filter.type = type;
  if (search) filter.name = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const results = await University.find(filter)
    .select('name state city type parentUniversity userId totalStudents')
    .populate('parentUniversity', 'name')
    .sort({ name: 1 })
    .limit(200);

  res.json({
    universities: results.map((u) => ({
      id: u._id,
      name: u.name,
      state: u.state,
      type: u.type,
      parentUniversity: u.parentUniversity ? { id: u.parentUniversity._id, name: u.parentUniversity.name } : null,
      claimed: !!u.userId,
      totalStudents: u.totalStudents || 0,
    })),
  });
};

// GET /api/universities/states — distinct state list for a filter dropdown
exports.getStates = async (req, res) => {
  const states = await University.distinct('state', { state: { $ne: '' } });
  res.json({ states: states.sort() });
};
