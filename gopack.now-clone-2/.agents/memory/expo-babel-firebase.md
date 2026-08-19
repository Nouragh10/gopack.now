---
name: Expo SDK 54 + Firebase babel conflict
description: Installing firebase in a pnpm Expo SDK 54 project causes @babel/core@8.x to be resolved, breaking Metro bundler which requires ^7.x
---

Installing `firebase` (or packages with permissive babel deps) in an Expo SDK 54 workspace causes Metro to fail with:
> Requires Babel "^7.0.0-0", but was loaded with "8.0.1"

**Why:** The pnpm workspace catalog entry `"@babel/core": ">=7.29.6"` allows v8. Firebase transitive deps or catalog resolution can pull in @babel/core@8.x, which Metro/babel-preset-expo rejects.

**How to apply:** Always add this to the workspace root `package.json` when installing firebase in an Expo SDK 54 monorepo:
```json
"pnpm": {
  "overrides": {
    "@babel/core": "^7.26.0"
  }
}
```
Then run `pnpm install` to lock the version. This affects all workspace packages but is safe since nothing in this monorepo needs @babel/core@8.
