const router = require('express').Router();
const ctrl = require('../controllers/monitor.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate);
router.get('/today', authorize('admin', 'viewer'), ctrl.todayDashboard);
router.get('/exams/:examId', authorize('admin', 'viewer', 'reception'), ctrl.examMonitor);

module.exports = router;
