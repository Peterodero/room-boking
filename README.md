# Room Booking — Next.js (single app, free-tier friendly)

Everything — frontend pages and API — lives in one Next.js app now, deployable
as a single free project on **Vercel**. No separate backend server to host,
pay for, or worry about cold-starting.

## Why this structure

- **One deploy** — `git push`, Vercel builds and hosts both the UI and the
  `/api/*` routes as serverless functions. Nothing else to spin up.
- **No idle backend to go cold** — unlike a free Render/Fly web service that
  sleeps and needs a slow wake-up, each API route is its own function that
  runs on demand.
- **No cron dependency** — Vercel's Hobby (free) plan only allows cron jobs
  **once per day**, too infrequent for expiring 15-minute booking holds. So
  instead, hold-expiry is checked **lazily**: any time a booking is read
  (`GET /api/bookings/:id`) or a new booking is created for the same listing,
  stale `PENDING` holds are flipped to `EXPIRED` right there. No background
  job needed, and it costs nothing.

## Payments: Cash App Pay via Square

Cash App has no open public API — the supported route is **Cash App Pay
through Square's Web Payments SDK + Payments API**. You need a free Square
developer account (sandbox mode costs nothing) to get:
- `SQUARE_ACCESS_TOKEN` (server-side secret)
- `NEXT_PUBLIC_SQUARE_APP_ID` and `NEXT_PUBLIC_SQUARE_LOCATION_ID` (client-side, safe to expose)

Get these at https://developer.squareup.com → your app → Sandbox. Swap to
production credentials and the production SDK URL when you go live (see the
comment in `app/booking/[id]/checkout/page.tsx`).

## "US citizens only"

Handled as self-attestation at signup (`isUSCitizen` checkbox, rejected if
false) — see `app/api/auth/signup/route.ts`. This is not verified identity;
Cash App Pay itself has no concept of citizenship. If this needs to be a real
enforced requirement, add an ID-verification step (e.g. Persona, Stripe
Identity) rather than relying on the checkbox.

## Free hosting setup

1. **Database** — create a free Postgres on [Neon](https://neon.tech) or
   [Supabase](https://supabase.com). Copy the pooled connection string into
   `DATABASE_URL`.
2. **Payments** — create a Square sandbox app, copy the three values above.
3. **Deploy** — push this repo to GitHub, import it in Vercel, add all the
   `.env.example` variables as Environment Variables in the Vercel project
   settings (do this instead of committing `.env`), deploy.
4. Run `npx prisma migrate deploy` once against your production `DATABASE_URL`
   (locally, pointed at the prod DB, or via a Vercel build step) to create the
   tables.

## Local development

```bash
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run dev            # http://localhost:3000 — frontend and API together
```

## Structure

```
app/
  page.tsx                          Browse/search listings
  listings/[id]/page.tsx            Listing detail + reserve (creates a hold)
  booking/[id]/checkout/page.tsx    Cash App Pay button, final step
  booking/[id]/confirmation/page.tsx
  api/
    auth/signup, auth/login
    listings/                       GET (search), POST (host creates listing)
    listings/[id]/                  GET
    bookings/                       POST (create hold)
    bookings/[id]/                  GET (lazy-expires stale holds)
    bookings/[id]/cancel/           POST
    payments/booking-fee/           POST — charges the Cash App Pay token
lib/
  prisma.ts, square.ts, auth.ts     Shared server-side helpers
  api.ts                            Client-side fetch wrapper (same-origin /api)
prisma/schema.prisma                Data model
```

## Booking flow

1. Guest browses `/`, `GET /api/listings` filters out dates that overlap an
   existing `CONFIRMED` or still-live `PENDING` booking
2. `POST /api/bookings` creates a `PENDING` hold (default 15 min,
   `BOOKING_HOLD_MINUTES`) inside a transaction that re-checks for overlaps —
   protects against two people booking the same dates at once
3. Guest is routed to checkout, where the Cash App Pay button (Square Web
   Payments SDK) tokenizes payment client-side
4. `POST /api/payments/booking-fee` charges that token via Square's Payments
   API for the `bookingFee` amount, then flips the booking to `CONFIRMED`
5. Any read of an unpaid, timed-out booking flips it to `EXPIRED` automatically

## Not yet built (natural next steps)

- Refunds for cancellations after payment (Square Refunds API)
- Square webhook handler for async payment status updates
- Host payout flow for the remaining `totalPrice` beyond the booking fee
- Real ID verification if "US citizens only" needs to be enforced, not just asked
