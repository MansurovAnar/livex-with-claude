const router = require('express').Router();
const ctrl = require('../controllers/registrations.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate);

// Mounted at /api/exams — so paths here are relative to that
// GET  /api/exams/:examId/registrations
// POST /api/exams/:examId/registrations
router.get('/:examId/registrations', authorize('admin', 'reception'), ctrl.listByExam);
router.post('/:examId/registrations', authorize('admin', 'reception'), ctrl.register);
// GET  /api/exams/:examId/registrations/removed
router.get('/:examId/registrations/removed', authorize('admin', 'reception'), ctrl.listRemovedByExam);

// PATCH /api/registrations/:id/payment
router.patch('/:id/payment', authorize('admin', 'reception'), ctrl.updatePayment);
// POST /api/registrations/:id/remove  { reason }  — soft remove from the exam
// POST /api/registrations/:id/restore
router.post('/:id/remove', authorize('admin', 'reception'), ctrl.remove);
router.post('/:id/restore', authorize('admin', 'reception'), ctrl.restore);
// DELETE /api/registrations/:id  — mounted separately in app.js
router.delete('/:id', authorize('admin'), ctrl.deregister);

module.exports = router;
