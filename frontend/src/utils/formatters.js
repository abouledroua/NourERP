/**
 * Format currency with thousands separator
 */
export function formatCurrency(amount, currency = 'DA') {
  if (amount === undefined || amount === null || isNaN(amount)) return `0.00 ${currency}`;
  const num = Number(amount);
  return `${num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

/**
 * Format date strictly in 'JJ/MM/AAAA' (DD/MM/YYYY) across the entire app
 */
export function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    // If it's already in DD/MM/YYYY or JJ/MM/AAAA format:
    if (typeof dateString === 'string') {
      const slashMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (slashMatch) {
        const [, day, month, year] = slashMatch;
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }

      // If it's a string starting with YYYY-MM-DD (e.g. SQL DATE or ISO string):
      const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, year, month, day] = match;
        return `${day}/${month}/${year}`;
      }
    }

    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateString);
  }
}

/**
 * Format time strictly in 'HH:MM' (24-hour, e.g. 08:30, 14:45)
 */
export function formatTime(timeString) {
  if (!timeString) return '-';
  try {
    if (typeof timeString === 'string') {
      // If time string like '14:30:00' or '8:05' or ISO with time 'T14:30:00'
      const timePartMatch = timeString.match(/(?:T|\s|^)(\d{1,2}):(\d{2})/);
      if (timePartMatch) {
        const hours = timePartMatch[1].padStart(2, '0');
        const minutes = timePartMatch[2];
        return `${hours}:${minutes}`;
      }
    }

    const d = new Date(timeString);
    if (!isNaN(d.getTime())) {
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }

    return String(timeString).substring(0, 5);
  } catch {
    return String(timeString);
  }
}

/**
 * Format date & time combined strictly in 'JJ/MM/AAAA HH:MM'
 */
export function formatDateTime(dateTimeString) {
  if (!dateTimeString) return '-';
  try {
    const d = new Date(dateTimeString);
    if (isNaN(d.getTime())) {
      return formatDate(dateTimeString);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return String(dateTimeString);
  }
}
