---
name: Firebase anonymous auth disabled for gopack project
description: Guest sign-in ("Continue as guest") in gopack-web fails with ADMIN_ONLY_OPERATION; blocks e2e testing that relies on guest login.
---

The `signInGuest()` call (`signInAnonymously`) in gopack-web's Firebase project fails with `ADMIN_ONLY_OPERATION` from the identitytoolkit REST API. This means the Anonymous sign-in provider is disabled in the Firebase Console for this project (not a code bug).

**Why:** Confirmed via direct `curl` to `identitytoolkit.googleapis.com/v1/accounts:signUp` — Firebase itself rejects the operation, independent of app code. `signInWithGoogle` uses a real OAuth popup so it can't be exercised by the Playwright testing subagent either.

**How to apply:** When a task needs e2e testing of a logged-in gopack-web flow, guest login will fail and Google login can't be automated. Either ask the user to enable the Anonymous provider in the Firebase Console (Authentication → Sign-in method), or fall back to careful manual code-path verification (typecheck + logic review) and note the e2e limitation as a skipped-validation reason. This is a Firebase project setting, not something fixable from the codebase.
