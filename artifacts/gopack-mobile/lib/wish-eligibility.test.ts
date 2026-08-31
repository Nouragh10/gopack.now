import { isWishEligible, wishUpvotePercentage } from "./wish-eligibility";

function equal(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

const wish = (count: number) => ({
  upvoters: Object.fromEntries(Array.from({ length: count }, (_, index) => [`u${index}`, `User ${index}`])),
});

equal(isWishEligible(wish(2), 4), true, "exactly 50% must be included");
equal(isWishEligible(wish(1), 3), false, "below 50% must be excluded");
equal(isWishEligible(wish(2), 3), true, "above 50% must be included");
equal(isWishEligible(wish(0), 0), false, "empty trips must not include wishes");
equal(Math.round(wishUpvotePercentage(wish(2), 3)), 67, "percentage should be rounded for display");

console.log("wish eligibility tests passed");