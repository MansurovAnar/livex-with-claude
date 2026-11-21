const { z } = require('zod');

// Same options as the reception Add Student form
const SECTORS = ['Azerbaijan', 'Rus'];
const LANGUAGES = ['English', 'Russian', 'German', 'French'];
// Azerbaijani mobile: operator prefix + 7 digits
const MOBILE_RE = /^(010|050|051|055|070|077|099)\d{7}$/;

const namePart = z.string().trim().min(1).max(50);

exports.createApplicationSchema = z.object({
  exam_id: z.string().uuid(),
  first_name: namePart,
  last_name: namePart,
  father_name: namePart,
  class_level: z.number().int().min(1).max(11),
  sector: z.enum(SECTORS),
  language: z.enum(LANGUAGES),
  mobile_number: z.string().regex(MOBILE_RE, 'Invalid mobile number'),
});
