const { z } = require('zod');

exports.createExamSchema = z.object({
  title: z.string().min(1).max(255),
  subject_code: z.string().max(50).optional(),
  exam_location: z.string().min(1).max(255),
  exam_cost: z.number().min(0).default(0),
  commission_amount: z.number().min(0).default(0),
  scheduled_at: z.string().datetime(),
  duration_mins: z.number().int().positive(),
  entry_opens_at: z.string().datetime(),
  entry_closes_at: z.string().datetime(),
});

exports.updateExamSchema = exports.createExamSchema.partial();

exports.updateStatusSchema = z.object({
  status: z.enum(['scheduled', 'ongoing', 'completed', 'cancelled']),
});
