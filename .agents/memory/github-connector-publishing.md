---
name: GitHub connector publishing
description: Publish project changes when the local Git remote lacks valid credentials.
---

When `git push` cannot authenticate, use the attached GitHub connector’s Git data API to create blobs, a tree, a commit, and advance the branch only after confirming its head has not moved.

**Why:** A connected GitHub account authorizes API requests securely but does not automatically repair an existing local HTTPS Git credential. Advancing a stale branch ref could overwrite remote work.

**How to apply:** Base the new tree on the current remote commit, upload only changed tracked files, recheck the branch head before updating it, and exclude generated duplicate conversation workspaces from the repository. For large Git data uploads, serialize blob writes at no more than about 6 requests per second; the connector rejects bursts above 10 requests per second.

When building a changed-file manifest in CodeExecution, its `shellExec` output can strip Git’s tab separator from `git diff --name-status`; parse the status as the first character and the path as the remaining text.

When GitHub's branch head is absent from the local clone history, publish the complete tracked tree as one snapshot commit whose parent is the current remote head. Compare blob SHAs to reuse unchanged remote files, omit `base_tree` so local deletions are preserved, and recheck the ref before advancing it. This syncs all current content safely, but intentionally does not recreate each disconnected local commit.