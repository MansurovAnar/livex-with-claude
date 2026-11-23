// Public endpoints for the landing page, no authentication (LV#81)
const router = require('express').Router();
const ctrl = require('../controllers/examApplications.controller');
const validate = require('../middleware/validate');
const rateLimit = require('../middleware/rateLimit');
const { createApplicationSchema } = require('../validators/examApplication.validator');

router.get('/exams', rateLimit({ windowMs: 60 * 1000, max: 60 }), ctrl.listPublicExams);
router.post('/applications', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), validate(createApplicationSchema), ctrl.createPublic);

module.exports = router;
