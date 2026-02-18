/**
 * Generate a shuffled array of numbers 0-9
 */
export function generateShuffledNumbers(): number[] {
  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  return numbers;
}

/**
 * Determine the winner square position for a given quarter based on scores
 * and the assigned grid numbers.
 *
 * @param nfcScore - NFC team score
 * @param afcScore - AFC team score
 * @param gridNumbers - Array of {position, nfcNumber, afcNumber}
 * @returns The winning square position string (e.g. "34") or null
 */
export function findWinnerPosition(
  nfcScore: number,
  afcScore: number,
  gridNumbers: { position: number; nfcNumber: number; afcNumber: number }[]
): string | null {
  const nfcLastDigit = nfcScore % 10;
  const afcLastDigit = afcScore % 10;

  const nfcRow = gridNumbers.find((g) => g.nfcNumber === nfcLastDigit);
  const afcCol = gridNumbers.find((g) => g.afcNumber === afcLastDigit);

  if (!nfcRow || !afcCol) return null;

  // Position is row (NFC) + col (AFC)
  return `${nfcRow.position}${afcCol.position}`;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Get display name for a square (user name or guest name)
 */
export function getSquareDisplayName(square: {
  user?: { name: string } | null;
  guestName?: string | null;
}): string {
  return square.user?.name || square.guestName || '';
}
