const router = require('express').Router();
const ctrl = require('../controllers/students.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { createCourseStudentSchema, updateCourseStudentSchema } = require('../validators/student.validator');

router.use(authenticate);

// admin + reception can view the course students list; only admin adds/edits them
router.get('/', authorize('admin', 'reception'), ctrl.listCourse);
router.post('/', authorize('admin'), validate(createCourseStudentSchema), ctrl.createCourse);
router.put('/:id', authorize('admin'), validate(updateCourseStudentSchema), ctrl.updateCourse);

module.exports = router;
