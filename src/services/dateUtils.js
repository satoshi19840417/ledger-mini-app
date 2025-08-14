export function clampFutureDate(dateValue) {
  if (!dateValue) return dateValue;
  const inputDate = new Date(dateValue);
  const today = new Date();
  if (inputDate > today) {
    return today.toISOString().split('T')[0];
  }
  return dateValue;
}
