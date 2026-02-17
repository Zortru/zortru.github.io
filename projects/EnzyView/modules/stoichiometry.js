/**
 * Compute species concentrations from conversion X.
 * Reaction: aS1 + bS2 → cP1 + dP2
 */
export function computeConcentrations(S10, S20, P10, P20, a, b, c, d, X) {
  const S1 = S10 * (1 - X);
  const S2 = S20 - (b / a) * S10 * X;
  const P1 = P10 + (c / a) * S10 * X;
  const P2 = P20 + (d / a) * S10 * X;
  return { S1, S2, P1, P2 };
}
