const router = require('express').Router();
const ctrl = require('../controllers/telesalesLeads.controller');
const calls = require('../controllers/telesalesCalls.controller');
const reports = require('../controllers/telesalesReports.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { leadSchema } = require('../validators/telesalesLead.validator');
const { callSchema } = require('../validators/telesalesCall.validator');

// Like middleware/validate, but the message is the first problem found, so the form can show it as-is
const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: result.error.issues[0]?.message || 'Invalid request body',
        details: result.error.flatten().fieldErrors,
      },
    });
  }
  req.body = result.data;
  next();
};

// Every telesales user sees and edits all leads; admin can view and edit the whole list. No delete.
router.use(authenticate, authorize('admin', 'telesales'));

router.get('/leads', ctrl.list);
router.get('/leads/:id', ctrl.get);
router.post('/leads', validateBody(leadSchema), ctrl.create);
router.put('/leads/:id', validateBody(leadSchema), ctrl.update);
router.patch('/leads/:id/phone-invalid', ctrl.setPhoneInvalid);

// Call log: shared answer options + each lead's call history
router.get('/answer-options', calls.listAnswerOptions);
router.get('/leads/:id/calls', calls.listCalls);
router.post('/leads/:id/calls', validateBody(callSchema), calls.createCall);

// Callbacks scheduled while logging calls: visible to every telesales user
router.get('/callbacks', calls.listCallbacks);
router.get('/callbacks/count', calls.countDueCallbacks);

// Reporting is for admins only; telesales users just log their work
router.get('/reports', authorize('admin'), reports.report);

module.exports = router;
