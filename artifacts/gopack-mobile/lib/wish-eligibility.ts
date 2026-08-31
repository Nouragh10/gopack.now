type VotedWish = {
  upvoters?: Record<string, string>;
};

/**
 * A wish is itinerary-eligible when at least half of the current trip members
 * have upvoted it. The exact 50% boundary is intentionally included.
 */
export function wishUpvotePercentage(
  wish: VotedWish,
  memberCount: number,
): number {
  if (memberCount <= 0) return 0;
  return (Object.keys(wish.upvoters ?? {}).length / memberCount) * 100;
}

export function isWishEligible(
  wish: VotedWish,
  memberCount: number,
): boolean {
  return wishUpvotePercentage(wish, memberCount) >= 50;
}