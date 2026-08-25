/** Client-side mirrors of the Hibernate Validator rules on the backend. */

export const MOBILE_RE = /^[6-9][0-9]{9}$/;
export const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,50}$/;
export const PERSON_NAME_RE = /^[A-Za-z][A-Za-z .'-]{1,99}$/;
export const TEXT_NAME_RE = /^[A-Za-z][A-Za-z0-9 &/()-]{1,79}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const CARD_RE = /^[0-9]{13,19}$/;
export const CVV_RE = /^[0-9]{3,4}$/;
export const EXPIRY_RE = /^(0[1-9]|1[0-2])\/[0-9]{2}$/;

export const MOBILE_MSG =
  'Mobile number must be exactly 10 digits, digits only, and start with 6, 7, 8 or 9';
export const PASSWORD_MSG =
  'Password must be 8-50 characters with at least one uppercase letter, one lowercase letter, one digit and one special character';

export const MAX_AGE_YEARS = 100;

/** Earliest date of birth the system accepts, as yyyy-mm-dd for a date input's [min]. */
export function earliestBirthDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MAX_AGE_YEARS);
  return d.toISOString().substring(0, 10);
}

/**
 * Date inputs can also be typed into, and browsers accept out-of-range text, so the
 * value is re-checked here rather than trusting [min] and [max] alone.
 */
export function checkBirthDate(value: string): string | null {
  if (!value) { return null; }                       // optional field
  const dob = new Date(value + 'T00:00:00');
  if (isNaN(dob.getTime())) { return 'Enter a valid date of birth'; }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dob > today) { return 'Date of birth cannot be in the future'; }
  const earliest = new Date(today);
  earliest.setFullYear(earliest.getFullYear() - MAX_AGE_YEARS);
  if (dob < earliest) { return 'Date of birth cannot be more than ' + MAX_AGE_YEARS + ' years ago'; }
  return null;
}

/** Strips everything except digits — wire to (input) on numeric fields. */
export function digitsOnly(value: string, maxLength: number): string {
  return (value ?? '').replace(/\D/g, '').slice(0, maxLength);
}

export function requiredText(label: string, value: string): string | null {
  return value && value.trim() ? null : label + ' is required';
}

export function checkMobile(value: string): string | null {
  if (!value) { return 'Mobile number is required'; }
  return MOBILE_RE.test(value) ? null : MOBILE_MSG;
}

export function checkEmail(value: string): string | null {
  if (!value) { return 'Email is required'; }
  return EMAIL_RE.test(value) ? null : 'Enter a valid email address';
}

export function checkPassword(value: string): string | null {
  if (!value) { return 'Password is required'; }
  if (value.length > 50) { return 'Password cannot exceed 50 characters'; }
  return PASSWORD_RE.test(value) ? null : PASSWORD_MSG;
}

export function checkPersonName(label: string, value: string): string | null {
  if (!value || !value.trim()) { return label + ' is required'; }
  return PERSON_NAME_RE.test(value.trim())
    ? null
    : label + ' may contain letters, spaces, dots, apostrophes and hyphens only';
}

export function checkTextName(label: string, value: string, min = 3, max = 80): string | null {
  if (!value || !value.trim()) { return label + ' is required'; }
  const v = value.trim();
  if (v.length < min || v.length > max) { return label + ` must be ${min}-${max} characters`; }
  return TEXT_NAME_RE.test(v) ? null : label + ' may contain letters, digits, spaces and & / ( ) - only';
}

/** Returns the first error from a list of checks, or null when everything passes. */
export function firstError(...checks: (string | null)[]): string | null {
  return checks.find(c => c !== null) ?? null;
}

/** Masks all but the last four digits: 4111111111111111 -> **** **** **** 1111 */
export function maskCard(digits: string): string {
  if (!digits) { return ''; }
  if (digits.length <= 4) { return digits; }
  const last4 = digits.slice(-4);
  const hidden = digits.slice(0, -4).replace(/\d/g, '*');
  return (hidden + last4).replace(/(.{4})/g, '$1 ').trim();
}
