---
name: GitHub connector publishing
description: Publish project changes when the local Git remote lacks valid credentials.
---

When `git push` cannot authenticate, use the attached GitHub connector’s Git data API to create blobs, a tree, a commit, and advance the branch only after confirming its head has not moved.

**Why:** A connected GitHub account authorizes API requests securely but does not automatically repair an existing local HTTPS Git credential. Advancing a stale branch ref could overwrite remote work.

**How to apply:** Base the new tree on the current remote commit, upload only changed tracked files, recheck the branch head before updating it, and exclude generated duplicate conversation workspaces from the repository. For large Git data uploads, serialize blob writes at no more than about 6 requests per second; the connector rejects bursts above 10 requests per second.

When building a changed-file manifest in CodeExecution, its `shellExec` output can strip Git’s tab separator from `git diff --name-status`; parse the status as the first character and the path as the remaining text.

When GitHub's branch head is absent from the local clone history, publish the complete tracked tree as one snapshot commit whose parent is the current remote head. Compare blob SHAs to reuse unchanged remote files, omit `base_tree` so local deletions are preserved, and recheck the ref before advancing it. This syncs all current content safely, but intentionally does not recreate each disconnected local commit.

The connector proxy can read GitHub and may accept small test writes while Cloudflare blocks particular source-file payloads on Git blob, tree, and Contents API writes. Do not alter, encode around, or otherwise work around the filter; publish the accepted files, verify the remaining mismatch set, and report the blocked path honestly.

**Why:** This is an upstream content-filtering constraint rather than a GitHub authorization problem when the same healthy connection can write other repository files.

**How to apply:** Try the normal atomic Git-data flow first. If a payload is blocked, use GitHub's Contents endpoint only for files the proxy accepts, then stop after verification and leave blocked source unchanged for an authenticated manual push or a later platform-side resolution.