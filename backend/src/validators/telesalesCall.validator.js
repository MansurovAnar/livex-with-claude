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
  // Optional "Call back on": schedules a callback owned by the caller
  callback_at: z.preprocess(
    v => (v === '' ? null : v ?? null),
    z.string().datetime({ offset: true, message: 'Call back time is invalid' }).nullable()
  ),
})
  .refine(d => d.answer_id || d.answer, { message: 'Answer is required', path: ['answer'] })
  .refine(
    d => !d.callback_at || new Date(d.callback_at).getTime() > (d.called_at ? new Date(d.called_at).getTime() : Date.now()),
    { message: 'Call back time must be later than the call', path: ['callback_at'] }
  );
