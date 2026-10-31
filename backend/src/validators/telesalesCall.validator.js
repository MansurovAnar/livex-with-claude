const { z } = require('zod');

// Optional text: trimmed, '' / null / undefined → null
const optionalText = (max, label) => z.preprocess(
  v => (typeof v === 'string' ? (v.trim() || null) : v ?? null),
  z.string().max(max, `${label} must be at most ${max} characters`).nullable()
);

// A call picks an existing answer (answer_id) or types a new one (answer)
exports.callSchema = z.object({
  answer_id: z.preprocess(v => (v === '' ? null : v ?? null), z.string().uuid('Answer is required').nullable()),
  answer: optionalText(150, 'Answer'),
  note: optionalText(2000, 'Note'),
  // When the call was made; defaults to now. Up to 5 minutes ahead is allowed for clock differences.
  called_at: z.preprocess(
    v => (v === '' ? null : v ?? null),
    z.string().datetime({ offset: true, message: 'Call date is invalid' }).nullable()
  ).refine(v => !v || new Date(v).getTime() <= Date.now() + 5 * 60 * 1000, 'Call date cannot be in the future'),
})
  .refine(d => d.answer_id || d.answer, { message: 'Answer is required', path: ['answer'] });
