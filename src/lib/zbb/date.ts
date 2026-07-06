/**
 * Today's date as YYYY-MM-DD in the device's local timezone.
 * Unlike `new Date().toISOString().split('T')[0]`, this doesn't shift to
 * tomorrow late in the day for timezones behind UTC.
 */
export function todayLocalDateString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
