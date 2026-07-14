const { z } = require('zod');

exports.verifyAndLogSchema = z.object({
  exam_id: z.string().uuid(),
  student_number: z.string().min(1),
  event_type: z.enum(['entry', 'exit']),
  device_info: z.string().max(255).optional(),
  notes: z.string().max(500).optional(),
});
