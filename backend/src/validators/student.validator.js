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

// Course students (admin only): regular student fields plus a fixed AZN discount
// per exam, or FREE (100% discount), and a note explaining the discount.
const courseFields = {
  discount_amount: z.number().min(0).max(100000),
  is_free: z.boolean(),
  discount_note: z.string().trim().max(500).nullish(),
};

exports.createCourseStudentSchema = exports.createStudentSchema.extend({
  discount_amount: courseFields.discount_amount.default(0),
  is_free: courseFields.is_free.default(false),
  discount_note: courseFields.discount_note,
});

exports.updateCourseStudentSchema = exports.createStudentSchema.extend(courseFields).partial();
