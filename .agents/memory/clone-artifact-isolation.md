---
name: Clone artifact isolation
description: Preventing preview conflicts when a full GoPack workspace copy exists alongside the active artifacts.
---

When retaining a cloned GoPack workspace in the same Replit project, its artifact registrations must not share the original app's live preview routes. Clone registrations need separate, clone-only routes.

**Why:** The workspace artifact registry discovers both copies. Shared paths such as `/`, `/api`, and `/gopack-mobile/` can make the active preview services unstable or ambiguously routed.

**How to apply:** Keep the original artifacts as the only services on their public preview paths. If a clone must remain in the workspace, update its artifact routes via the validated artifact configuration flow; do not directly edit artifact manifests.