const { z } = require('zod');

exports.createStudentSchema = z.object({
  student_number: z.string().regex(/^\d{1,7}$/, 'Student number must be 1-7 digits'),
  full_name: z.string().min(1).max(150),
  email: z.string().email(),
  mobile_number: z.string().max(10).nullish(),
  class_level: z.number().int().min(1).max(11).nullish(),
  sector: z.string().max(20).nullish(),
  language: z.string().max(30).nullish(),
  photo_url: z.string().url().nullish(),
});

exports.updateStudentSchema = exports.createStudentSchema.partial();
