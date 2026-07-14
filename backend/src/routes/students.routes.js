const router = require('express').Router();
const ctrl = require('../controllers/students.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { createStudentSchema, updateStudentSchema } = require('../validators/student.validator');

router.use(authenticate);

// reception + admin can read and create
router.get('/', authorize('admin', 'reception'), ctrl.list);
router.post('/', authorize('admin', 'reception'), validate(createStudentSchema), ctrl.create);
router.get('/:id', authorize('admin', 'reception'), ctrl.get);

// admin only can update/delete
router.put('/:id', authorize('admin'), validate(updateStudentSchema), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;
