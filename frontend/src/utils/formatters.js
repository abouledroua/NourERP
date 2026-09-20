/**
 * Format currency with thousands separator
 */
export function formatCurrency(amount, currency = 'DA') {
  if (amount === undefined || amount === null || isNaN(amount)) return `0.00 ${currency}`;
  const num = Number(amount);
  return `${num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

/**
 * Format date nicely
 */
export function formatDate(dateString, locale = 'fr-FR') {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return String(dateString);
  }
}

/**
 * Format short time
 */
export function formatTime(timeString) {
  if (!timeString) return '-';
  return timeString.substring(0, 5);
}
