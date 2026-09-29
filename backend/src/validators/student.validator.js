const { z } = require('zod');

exports.createStudentSchema = z.object({
  student_number: z.string().regex(/^\d{1,7}$/, 'Student number must be 1-7 digits'),
  full_name: z.string().min(1).max(150),
  email: z.string().email(),
  mobile_number: z.string().max(10).nullish(),
  photo_url: z.string().url().nullish(),
});

exports.updateStudentSchema = exports.createStudentSchema.partial();
