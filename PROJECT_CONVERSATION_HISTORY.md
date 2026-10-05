# Project History & Architectural Context — Room Booking & Rental Platform

This document maintains a permanent, continuous log of project requirements, system architecture, database models, payment design, and conversation context across sessions.

---

## 📌 Project Summary

- **App Name**: US RoomStays (`room-booking`)
- **Tech Stack**: Next.js 14 (App Router), React 18, TypeScript, TailwindCSS, Prisma ORM, PostgreSQL (Supabase / Neon), Square Payments API (Cash App Pay).
- **Core Concept**: Single-app serverless rental booking system for US rooms.
- **Key Constraints**:
  - 15-minute live reservation holds (lazy-expired upon lookup or rebooking to stay free-tier friendly without cron dependencies).
  - Cash App Pay via Square Web Payments SDK as the exclusive payment provider.
  - US self-attestation at user registration.

---

## 🗄️ Database Architecture (Prisma Schema)

- `User`: Roles (`GUEST`, `HOST`, `ADMIN`), username, email, `isUSCitizen`.
- `Listing`: Nightly / Monthly rentals, price, booking fee, photos, amenities, location (city, state).
- `Booking`: Status (`PENDING`, `CONFIRMED`, `CANCELLED`, `EXPIRED`), `holdExpiresAt` (15 min), check-in / check-out dates, total price, booking fee.
- `Payment`: Tracks transaction records, `squarePaymentId`, amount, type (`BOOKING_FEE`, `DEPOSIT`), status (`PENDING`, `COMPLETED`, `FAILED`).

---

## 💳 Payment Flow Architecture (Cash App Pay)

1. **Reservation Hold**: Guest reserves room dates on `/listings/[id]`, creating a `PENDING` booking with `holdExpiresAt = NOW + 15 mins`.
2. **Checkout Page (`/booking/[id]/checkout`)**:
   - Live 15-minute hold timer.
   - Square Web Payments SDK initializes Cash App Pay widget.
   - Interactive Dev / Sandbox Cash App simulator allows full testing when Square credentials are default placeholders.
3. **Payment API (`POST /api/payments/booking-fee`)**:
   - Validates user token & booking status (`PENDING`).
   - Charges Square Cash App Pay token via Square Payments API.
   - Updates `Payment` record status to `COMPLETED`.
   - Flips `Booking` status to `CONFIRMED` and clears hold expiration.
4. **Confirmation (`/booking/[id]/confirmation`)**: Displays confirmed room reservation summary & receipt.

---

## 📝 Recent Activity & Fixes

- **Payment UI Interactivity Fixes**: Resolved dead-end `"Request failed"` error on unauthenticated checkout loads by adding interactive session login recovery. Fixed Square SDK fallback so Cash App Pay can be tested interactively in dev/sandbox mode without SDK hanging.
- **Live Hold Timer**: Built live 15-minute countdown clock on checkout page.
- **Conversation Persistence**: Created `PROJECT_CONVERSATION_HISTORY.md` to guarantee complete context retention across assistant interactions.
