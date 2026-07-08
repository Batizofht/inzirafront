/**
 * Each vehicle has one of three usage statuses. The client wants each shown in
 * its own colour on the card badge so buyers can tell them apart at a glance.
 *
 * Colours are chosen to read well as a solid badge with white text in both
 * light and dark themes (mid-tone, high enough contrast).
 */
export function getUsageStatusColor(status?: string | null): string {
  const s = (status || '').trim().toLowerCase();
  if (s.includes('brand') || s === 'new') return '#16A34A'; // Brand New — green
  if (s.includes('import')) return '#2563EB';               // Imported Used — blue
  if (s.includes('rwanda') || s.includes('local')) return '#D97706'; // Used In Rwanda — amber
  return '#475569'; // unknown / fallback — slate
}
