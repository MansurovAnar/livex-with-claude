const router = require('express').Router();
const ctrl = require('../controllers/monitor.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { createExpenseSchema } = require('../validators/exam.validator');

router.use(authenticate);
router.get('/today', authorize('admin', 'viewer'), ctrl.todayDashboard);
router.get('/exams/:examId', authorize('admin', 'viewer', 'reception'), ctrl.examMonitor);
router.post('/exams/:examId/expenses', authorize('admin'), validate(createExpenseSchema), ctrl.addExpense);

module.exports = router;
