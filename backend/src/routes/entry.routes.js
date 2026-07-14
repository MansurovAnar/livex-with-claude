const router = require('express').Router();
const ctrl = require('../controllers/entry.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { verifyAndLogSchema } = require('../validators/entry.validator');

router.use(authenticate, authorize('security', 'admin'));
router.post('/verify-and-log', validate(verifyAndLogSchema), ctrl.verifyAndLog);

module.exports = router;
