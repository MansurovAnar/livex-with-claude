const { z } = require('zod');

exports.EXTRA_INFO_FLAGS = [
  'birthday',
  'marriage_ceremony',
  'another_student_at_home',
  'someone_died_recently',
  'someone_in_hospital',
  'father_in_russia',
  'mother_died',
  'father_died',
];

// Optional text: trimmed, '' / null / undefined → null
const optionalText = (max, label) => z.preprocess(
  v => (typeof v === 'string' ? (v.trim() || null) : v ?? null),
  z.string().max(max, `${label} must be at most ${max} characters`).nullable()
);

const requiredText = (max, label) => z.string({ required_error: `${label} is required`, invalid_type_error: `${label} is required` })
  .trim()
  .min(1, `${label} is required`)
  .max(max, `${label} must be at most ${max} characters`);

const classLevel = (label) => z.coerce.number({ invalid_type_error: `${label} is required` })
  .int(`${label} must be between 1 and 11`)
  .min(1, `${label} must be between 1 and 11`)
  .max(11, `${label} must be between 1 and 11`);

const phoneSchema = z.object({
  phone_number: z.string({ required_error: 'Phone number is required' })
    .trim()
    .min(1, 'Phone number is required')
    .max(20, 'Phone number must be at most 20 characters')
    .refine(v => /^[\d\s()+-]+$/.test(v), 'Phone number may contain only digits, spaces, +, - and brackets')
    .refine(v => { const n = v.replace(/\D/g, '').length; return n >= 7 && n <= 15; }, 'Phone number must have 7 to 15 digits'),
  owner_label: optionalText(50, 'Phone owner'),
});

// Same shape for create and update: the form always sends the whole lead
exports.leadSchema = z.object({
  first_name: requiredText(100, 'Name'),
  last_name: requiredText(100, 'Surname'),
  father_name: optionalText(100, 'Father name'),
  parent_name: optionalText(150, 'Parent name'),
  parent_relation: optionalText(50, 'Parent relation'),
  school_id: z.string({ required_error: 'School is required', invalid_type_error: 'School is required' }).uuid('School is required'),
  village_id: z.preprocess(v => (v === '' ? null : v ?? null), z.string().uuid('Village not found').nullable()),
  class_level: classLevel('Class'),
  sector: requiredText(20, 'Sector'),
  language: requiredText(30, 'Language'),
  income_source: optionalText(2000, 'Income source'),
  extra_info: z.array(z.enum(exports.EXTRA_INFO_FLAGS, { errorMap: () => ({ message: 'Unknown extra info option' }) }))
    .default([])
    .transform(list => [...new Set(list)]),
  another_student_class: z.preprocess(v => (v === '' ? null : v ?? null), classLevel('Other student\'s class').nullable()),
  extra_info_other: optionalText(2000, 'Other information'),
  knows_hedef_student: z.boolean().default(false),
  hedef_student_name: optionalText(150, 'HƏDƏF student name'),
  phones: z.array(phoneSchema, { required_error: 'At least one phone number is required' })
    .min(1, 'At least one phone number is required')
    .max(10, 'At most 10 phone numbers per lead'),
})
  .refine(d => !d.knows_hedef_student || d.hedef_student_name, {
    message: 'Enter the name of the person studying in HƏDƏF', path: ['hedef_student_name'],
  })
  .refine(d => new Set(d.phones.map(p => p.phone_number.replace(/\D/g, ''))).size === d.phones.length, {
    message: 'The same phone number is entered twice', path: ['phones'],
  })
  .transform(d => ({
    ...d,
    // Dependent fields are only kept when their switch is on
    another_student_class: d.extra_info.includes('another_student_at_home') ? d.another_student_class : null,
    hedef_student_name: d.knows_hedef_student ? d.hedef_student_name : null,
  }));
