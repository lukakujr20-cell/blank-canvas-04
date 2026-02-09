/**
 * Formats a number to a maximum of 2 decimal places, removing trailing zeros.
 * This prevents display of long floating-point numbers like 0.008333333333333.
 */
export function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  
  // Round to 2 decimal places and convert to number to remove trailing zeros
  const rounded = Math.round(value * 100) / 100;
  
  // Use toLocaleString to format, but then parse/format to remove unnecessary decimals
  if (Number.isInteger(rounded)) {
    return rounded.toString();
  }
  
  // Format with max 2 decimals
  return rounded.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Formats a quantity change with sign prefix.
 * Example: +5, -3.5
 */
export function formatQuantityChange(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  
  const formatted = formatQuantity(value);
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatted}`;
}
