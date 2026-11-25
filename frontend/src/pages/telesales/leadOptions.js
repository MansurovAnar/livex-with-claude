// Option lists shared by the telesales lead form, list and details modal
export const CLASSES = Array.from({ length: 11 }, (_, i) => i + 1);
export const SECTORS = ['Azerbaijan', 'Rus'];
export const LANGUAGES = ['English', 'Russian', 'German', 'French'];

// Extra-info checkboxes are managed by admins (LV#72) and loaded with useExtraInfoOptions().
// This built-in option opens the "class of the other student" picker.
export const ANOTHER_STUDENT_KEY = 'another_student_at_home';

// Label of an extra-info option in the selected UI language (AZ falls back to English)
export const extraInfoLabel = (option, lang) => (lang === 'az' && option.label_az) || option.label;
