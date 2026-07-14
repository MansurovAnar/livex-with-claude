const router = require('express').Router();
const ctrl = require('../controllers/monitor.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate, authorize('admin', 'viewer'));
router.get('/today', ctrl.todayDashboard);
router.get('/exams/:examId', ctrl.examMonitor);

module.exports = router;
