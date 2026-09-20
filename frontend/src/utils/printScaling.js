/**
 * Print density calculator for strict single-page A4 printing
 * Evaluates number of selected voucher slips and determines optimal density
 */
export function getRecommendedDensity(voucherCount) {
  if (voucherCount <= 2) return 'normal';
  if (voucherCount === 3) return 'compact';
  if (voucherCount === 4) return 'ultra';
  return 'grid'; // 5+ vouchers fit cleanly in 2-column grid layout
}

export function getDensityClass(density) {
  switch (density) {
    case 'compact':
      return 'print-density-compact';
    case 'ultra':
      return 'print-density-ultra';
    case 'grid':
      return 'print-density-grid';
    case 'normal':
    default:
      return 'print-density-normal';
  }
}
