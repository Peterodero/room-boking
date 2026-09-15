"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";

type Listing = {
  id: string;
  listingType: "NIGHTLY" | "MONTHLY";
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pricePerNight?: string;
  pricePerMonth?: string;
  bookingFee: string;
  depositAmount?: string;
  maxGuests: number;
  amenities: string[];
  photos: string[];
  host: { name: string; email: string };
};

const DEFAULT_PHOTOS = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80",
];

const DEFAULT_AMENITIES = [
  "High-Speed Wi-Fi",
  "Air Conditioning",
  "Fully Equipped Kitchen",
  "Free On-site Parking",
  "Washer & Dryer",
  "Dedicated Workspace",
];

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);

  // Nightly state
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  // Monthly state
  const [moveInDate, setMoveInDate] = useState("");

  const [guestCount, setGuestCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/listings/${id}`).then(setListing).catch((e) => setError(e.message));
  }, [id]);

  // Nightly computed values
  const stayNights =
    checkIn && checkOut
      ? Math.max(0, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 3600 * 24)))
      : 0;
  const pricePerNight = listing ? Number(listing.pricePerNight) : 0;
  const totalStayPrice = stayNights * pricePerNight;
  const bookingFee = listing ? Number(listing.bookingFee) : 0;

  async function reserveNightly() {
    setSubmitting(true);
    setError(null);
    try {
      const booking = await api.post("/bookings", {
        bookingType: "NIGHTLY",
        listingId: id,
        checkIn,
        checkOut,
        guestCount,
      });
      router.push(`/booking/${booking.id}/checkout`);
    } catch (e: any) {
      setError(e.message || "Could not reserve dates");
    } finally {
      setSubmitting(false);
    }
  }

  async function reserveMonthly() {
    setSubmitting(true);
    setError(null);
    try {
      const booking = await api.post("/bookings", {
        bookingType: "MONTHLY",
        listingId: id,
        moveInDate,
        guestCount,
      });
      router.push(`/booking/${booking.id}/deposit`);
    } catch (e: any) {
      setError(e.message || "Could not reserve room");
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  if (error && !listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <p className="text-rose-400 font-semibold">{error}</p>
        <Link href="/" className="inline-block px-4 py-2 bg-slate-800 rounded-lg text-sm text-slate-200">
          ← Back to All Listings
        </Link>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-10 bg-slate-900 rounded-lg w-1/3" />
        <div className="h-96 bg-slate-900 rounded-2xl" />
      </div>
    );
  }

  const photos = listing.photos && listing.photos.length > 0 ? listing.photos : DEFAULT_PHOTOS;
  const amenities = listing.amenities && listing.amenities.length > 0 ? listing.amenities : DEFAULT_AMENITIES;
  const isMonthly = listing.listingType === "MONTHLY";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Location Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/" className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium">
            ← Listings
          </Link>
          <span className="text-xs text-slate-400">/</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{listing.city}, {listing.state}</span>
        </div>
        <div className="flex items-start gap-3 flex-wrap">
          <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-slate-900 dark:text-white flex-1">
            {listing.title}
          </h1>
          <span className={`mt-1 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${
            isMonthly
              ? "bg-violet-500/15 text-violet-400 border border-violet-500/30"
              : "bg-brand-500/15 text-brand-400 border border-brand-500/30"
          }`}>
            {isMonthly ? "📅 Monthly Rental" : "🌙 Nightly Stay"}
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2">
          <span>📍 {listing.address ? `${listing.address}, ` : ""}{listing.city}, {listing.state}, USA</span>
          <span>•</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Verified Host: {listing.host?.name || "US Room Host"}</span>
        </p>
      </div>

      {/* Photo Gallery Grid */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl overflow-hidden h-[340px] sm:h-[420px] bg-slate-100 dark:bg-slate-950">
          <div className="md:col-span-2 h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[0]} alt={listing.title} className="w-full h-full object-cover" />
          </div>
          <div className="hidden md:grid grid-rows-2 gap-3 h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[1] || photos[0]} alt="Room detail" className="w-full h-full object-cover" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[2] || photos[0]} alt="Room view" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Extra photos scrollable strip (photo 4+) */}
        {photos.length > 3 && (
          <div className="flex gap-2 overflow-x-auto pb-1 rounded-lg">
            {photos.slice(3).map((url, idx) => (
              <div key={idx} className="flex-shrink-0 w-28 h-20 rounded-xl overflow-hidden border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Room photo ${idx + 4}`} className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer" />
              </div>
            ))}
            <div className="flex-shrink-0 flex items-center px-3 text-xs text-slate-400">
              +{photos.length - 3} more photos
            </div>
          </div>
        )}
      </div>

      {/* Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column — Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Notice Banner */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-500/30 shadow-md dark:shadow-none flex items-start gap-3">
            <span className="text-2xl">🇺🇸</span>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">US Citizen Rental Protection</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5">
                {isMonthly
                  ? "Reserve your room and pay a security deposit securely online. Monthly rent is paid in person at the property."
                  : "This room reservation is protected by 15-minute date overlap hold locks. Guests self-attest US citizenship at reservation."}
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white mb-3">About this rental room</h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {listing.description || "Modern, comfortable room rental in a convenient location. Clean, quiet space ideal for US stays."}
            </p>
          </div>

          {/* Monthly pricing info */}
          {isMonthly && (
            <div className="pt-6 border-t border-slate-200 dark:border-white/10">
              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white mb-4">Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Security Deposit</div>
                  <div className="text-2xl font-extrabold text-white">${listing.depositAmount}</div>
                  <div className="text-xs text-emerald-400 mt-1">Paid online via Cash App</div>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Monthly Rent</div>
                  <div className="text-2xl font-extrabold text-white">${listing.pricePerMonth}<span className="text-sm font-normal text-slate-400">/mo</span></div>
                  <div className="text-xs text-slate-400 mt-1">Paid at property each month</div>
                </div>
              </div>
            </div>
          )}

          {/* Amenities */}
          <div className="pt-6 border-t border-slate-200 dark:border-white/10">
            <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white mb-4">Included Amenities</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {amenities.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 text-xs font-medium text-slate-800 dark:text-slate-200 shadow-sm dark:shadow-none"
                >
                  <span className="text-brand-600 dark:text-brand-400">✓</span> {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column — Booking Widget */}
        <div>
          <div className="sticky top-24 glass-panel rounded-2xl p-6 space-y-6 shadow-xl">

            {/* ── NIGHTLY WIDGET ── */}
            {!isMonthly && (
              <>
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">${listing.pricePerNight}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400"> / night</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                    Hold fee: ${listing.bookingFee}
                  </span>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                    ⚠️ {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1">Check-in</label>
                      <input type="date" min={today} value={checkIn} onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1">Check-out</label>
                      <input type="date" min={checkIn || today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1">Number of Guests</label>
                    <input type="number" min={1} max={listing.maxGuests} value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="w-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-500" />
                  </div>
                </div>

                {stayNights > 0 && (
                  <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span>${listing.pricePerNight} × {stayNights} {stayNights === 1 ? "night" : "nights"}</span>
                      <span>${totalStayPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                      <span>Booking Hold Fee (Cash App)</span>
                      <span>${bookingFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-white/10">
                      <span>Estimated Total Stay</span>
                      <span>${(totalStayPrice + bookingFee).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <button
                  disabled={submitting || !checkIn || !checkOut || stayNights <= 0}
                  onClick={reserveNightly}
                  className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 font-bold text-sm text-white shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50"
                >
                  {submitting ? "Creating Hold..." : "Reserve & Proceed to Cash App Pay →"}
                </button>
                <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
                  🔒 Total stay is not charged until checkout confirmation.
                </p>
              </>
            )}

            {/* ── MONTHLY WIDGET ── */}
            {isMonthly && (
              <>
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Monthly Rent</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">${listing.pricePerMonth}</span>
                    <span className="text-xs text-slate-500">/month</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Rent is paid at the property each month — not through this app.</p>
                </div>

                {/* Deposit callout */}
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Security Deposit (paid online)</div>
                  <div className="text-2xl font-extrabold text-emerald-400">${listing.depositAmount}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Due via Cash App when you confirm your reservation</div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                    ⚠️ {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Desired Move-in Date
                    </label>
                    <input
                      type="date"
                      min={today}
                      value={moveInDate}
                      onChange={(e) => setMoveInDate(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Number of Tenants
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={listing.maxGuests}
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="w-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                    <span>Due Online Now (Deposit)</span>
                    <span className="text-emerald-400">${listing.depositAmount}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Monthly Rent (paid at property)</span>
                    <span>${listing.pricePerMonth}/mo</span>
                  </div>
                </div>

                <button
                  disabled={submitting || !moveInDate}
                  onClick={reserveMonthly}
                  className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-sm text-white shadow-lg shadow-violet-600/30 transition-all disabled:opacity-50"
                >
                  {submitting ? "Reserving..." : "Reserve & Pay Deposit via Cash App →"}
                </button>
                <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
                  🔒 Only the deposit is collected online. Monthly rent is paid at the property.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
