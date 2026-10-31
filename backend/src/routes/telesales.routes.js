const router = require('express').Router();
const ctrl = require('../controllers/telesalesLeads.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { leadSchema } = require('../validators/telesalesLead.validator');

// Like middleware/validate, but the message is the first problem found, so the form can show it as-is
const validateLead = (req, res, next) => {
  const result = leadSchema.safeParse(req.body);
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
router.post('/leads', validateLead, ctrl.create);
router.put('/leads/:id', validateLead, ctrl.update);
router.patch('/leads/:id/phone-invalid', ctrl.setPhoneInvalid);

module.exports = router;
