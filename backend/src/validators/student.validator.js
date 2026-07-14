const { z } = require('zod');

exports.createStudentSchema = z.object({
  student_number: z.string().min(1).max(50),
  full_name: z.string().min(1).max(150),
  email: z.string().email(),
  mobile_number: z.string().max(20).optional(),
  photo_url: z.string().url().optional(),
});

exports.updateStudentSchema = exports.createStudentSchema.partial();
