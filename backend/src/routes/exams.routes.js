const router = require('express').Router();
const ctrl = require('../controllers/exams.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { createExamSchema, updateExamSchema, updateStatusSchema } = require('../validators/exam.validator');

router.use(authenticate);
router.get('/', authorize('admin', 'security', 'viewer', 'reception'), ctrl.list);
router.get('/:id', authorize('admin', 'security', 'viewer', 'reception'), ctrl.get);
router.post('/', authorize('admin'), validate(createExamSchema), ctrl.create);
router.put('/:id', authorize('admin'), validate(updateExamSchema), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);
router.patch('/:id/status', authorize('admin'), validate(updateStatusSchema), ctrl.updateStatus);

module.exports = router;
