# PackClan — AI Group Travel Planner

AI-powered collaborative trip planning where friend groups wish, vote, and let Claude build the perfect day-by-day itinerary.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/gopack-web run dev` — run the web app (port 23381, preview at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `ANTHROPIC_API_KEY` — for AI itinerary/packing generation

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Web: React + Vite + Tailwind CSS v4 + shadcn/ui + Framer Motion + Wouter
- API: Express 5
- Realtime data: Firebase Realtime Database (auth, trips, wishes, chat)
- AI: Anthropic Claude (itinerary + packing generation via ANTHROPIC_API_KEY)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/api-client-react/` — generated React Query hooks
- `lib/api-zod/` — generated Zod schemas
- `artifacts/api-server/src/routes/ai.ts` — itinerary + packing routes (calls Anthropic)
- `artifacts/gopack-web/src/lib/firebase.ts` — Firebase config + auth helpers
- `artifacts/gopack-web/src/hooks/useAuth.ts` — Firebase auth state hook
- `artifacts/gopack-web/src/hooks/useFirebase.ts` — Firebase RTDB data hooks (useTrips, useTrip)
- `artifacts/gopack-web/src/pages/` — all page components

## Pages

- `/` — Landing (hero + how it works + features)
- `/login` — Google sign-in + anonymous guest
- `/dashboard` — trip list, create/join CTAs
- `/create` — create new trip form
- `/join/:tripId` — join trip by invite code
- `/trip/:tripId` — Trip Hub (wishlist + sidebar: generate itinerary/packing, invite, members)
- `/trip/:tripId/itinerary` — day-by-day AI itinerary view
- `/trip/:tripId/chat` — realtime group chat
- `/trip/:tripId/packing` — checkable packing list

## Architecture decisions

- Firebase Realtime Database handles all collaborative state (trips, members, wishes, chat, itinerary, packing) — no PostgreSQL needed for trip data
- Express API server only handles AI generation proxying (Anthropic calls) so the API key stays server-side
- Wouter (not React Router) for routing — lightweight, wouter-native patterns used throughout
- Generated API hooks (`useGenerateItinerary`, `useGeneratePackingList`) are mutations only — all reads go direct to Firebase

## Product

- **Wish:** Group members add activity wishes to a shared list
- **Vote:** Everyone votes with thumbs up — top wishes rise to the top
- **Go:** Click "Generate Itinerary" to have Claude build a day-by-day plan incorporating top-voted wishes
- Invite link sharing via `/join/:tripId`
- Realtime group chat per trip
- AI packing list tailored to destination + vibes + budget

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Firebase Realtime Database URL must match `databaseURL` in firebase.ts for RTDB to work (Firestore vs RTDB are different)
- Google Fonts `@import url(...)` must be the VERY FIRST line in `index.css` — before `@import "tailwindcss"`
- `onAuthStateChanged` not `onAuthStateStateChanged` (the typo that broke useAuth.ts)
- OpenAPI body schema names must be entity-shaped (e.g. `ItineraryInput`) not operation-shaped (`GenerateItineraryBody`) to avoid TS2308 collisions

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Firebase config is hardcoded in `artifacts/gopack-web/src/lib/firebase.ts` (public project)
