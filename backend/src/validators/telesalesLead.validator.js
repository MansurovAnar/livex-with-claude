const { z } = require('zod');
const { capitalizeName } = require('../services/studentEmail.service');

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

// Mobile operator prefixes offered in the lead form (LV#50)
exports.PHONE_PREFIXES = ['010', '050', '051', '055', '060', '070', '077', '099'];

// Any spacing is accepted; the number must be a known prefix + exactly 7 digits
// and is stored as "0XX XXX XX XX"
const phoneNumber = z.string({ required_error: 'Phone number is required', invalid_type_error: 'Phone number is required' })
  .trim()
  .min(1, 'Phone number is required')
  .transform(v => v.replace(/\D/g, ''))
  .refine(d => d.length === 10 && exports.PHONE_PREFIXES.includes(d.slice(0, 3)),
    'Phone number must be a valid prefix followed by 7 digits')
  .transform(d => `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`);

const phoneSchema = z.object({
  phone_number: phoneNumber,
  owner_label: optionalText(50, 'Phone owner'),
});

// Optional calendar date 'YYYY-MM-DD'; '' / null / undefined → null
const optionalDate = (label) => z.preprocess(
  v => (typeof v === 'string' ? (v.trim() || null) : v ?? null),
  z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} is not a valid date`)
    .refine(v => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v),
      `${label} is not a valid date`)
    .nullable()
);

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
  birthday_date: optionalDate('Birthday date'),
  birthday_whose: optionalText(100, 'Whose birthday'),
  marriage_date: optionalDate('Marriage ceremony date'),
  marriage_whose: optionalText(100, 'Whose marriage'),
  death_date: optionalDate('Date of death'),
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
    first_name: capitalizeName(d.first_name),
    last_name: capitalizeName(d.last_name),
    father_name: capitalizeName(d.father_name),
    // Dependent fields are only kept when their switch is on
    another_student_class: d.extra_info.includes('another_student_at_home') ? d.another_student_class : null,
    birthday_date: d.extra_info.includes('birthday') ? d.birthday_date : null,
    birthday_whose: d.extra_info.includes('birthday') ? d.birthday_whose : null,
    marriage_date: d.extra_info.includes('marriage_ceremony') ? d.marriage_date : null,
    marriage_whose: d.extra_info.includes('marriage_ceremony') ? d.marriage_whose : null,
    death_date: d.extra_info.includes('someone_died_recently') ? d.death_date : null,
    hedef_student_name: d.knows_hedef_student ? d.hedef_student_name : null,
  }));
