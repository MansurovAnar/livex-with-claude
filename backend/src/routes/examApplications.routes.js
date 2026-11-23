const router = require('express').Router();
const ctrl = require('../controllers/examApplications.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate);
router.get('/', authorize('admin', 'reception'), ctrl.list);
router.patch('/:id/moved', authorize('admin', 'reception'), ctrl.markMoved);

module.exports = router;
