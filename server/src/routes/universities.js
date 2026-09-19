const router = require('express').Router();
const c = require('../controllers/universityCatalogController');

// Public — no auth. Browsing the catalog is needed before a student is even
// logged in to a particular affiliation, and by the registration flow.
router.get('/catalog', c.searchCatalog);
router.get('/states', c.getStates);

module.exports = router;
