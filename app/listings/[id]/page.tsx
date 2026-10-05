"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";
import {
  IconHome,
  IconMapPin,
  IconCalendar,
  IconUsers,
  IconShieldCheck,
  IconBed,
  IconBuilding,
  IconCheck,
  IconAlertCircle,
  IconSpinner,
  IconArrowRight,
  IconCreditCard,
  IconCashApp,
} from "../../../components/Icons";

type Listing = {
  id: string;
  listingType: "NIGHTLY" | "MONTHLY" | "PLOT_SALE";
  roomCategory?: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pricePerNight?: string;
  pricePerMonth?: string;
  salePrice?: string;
  plotSize?: string;
  bookingFee: string;
  depositAmount?: string;
  maxGuests: number;
  amenities: string[];
  photos: string[];
  host: { name: string; email: string };
};

const ROOM_CATEGORY_MAP: Record<string, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  SINGLE_ROOM: { label: "Single Room", Icon: IconBed },
  BEDSITTER: { label: "Bedsitter / Studio", Icon: IconBuilding },
  ONE_BEDROOM: { label: "1 Bedroom", Icon: IconHome },
  TWO_BEDROOMS: { label: "2 Bedrooms", Icon: IconHome },
  THREE_PLUS_BEDROOMS: { label: "3+ Bedrooms", Icon: IconBuilding },
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

  // Default dates
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const defaultCheckOutStr = new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0];

  const [checkIn, setCheckIn] = useState(tomorrowStr);
  const [checkOut, setCheckOut] = useState(defaultCheckOutStr);
  const [moveInDate, setMoveInDate] = useState(tomorrowStr);
  const [guestCount, setGuestCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/listings/${id}`).then(setListing).catch((e) => setError(e.message));
  }, [id]);

  // Nightly math
  const stayNights =
    checkIn && checkOut
      ? Math.max(0, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 3600 * 24)))
      : 0;
  const pricePerNight = listing ? Number(listing.pricePerNight) : 0;
  const totalStayPrice = stayNights * pricePerNight;
  const bookingFee = listing ? Number(listing.bookingFee) : 0;

  // 1. Reserve Nightly
  async function reserveNightly() {
    setSubmitting(true);
    setError(null);
    setAuthError(false);
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
      if (e.message?.includes("Unauthorized") || e.message?.includes("401")) {
        setAuthError(true);
        setError("You must be logged in to reserve a room.");
      } else {
        setError(e.message || "Could not reserve dates");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // 2. Reserve Monthly Hold Only (Pay Hold Fee Now, Pay Deposit Later)
  async function reserveMonthlyHold() {
    setSubmitting(true);
    setError(null);
    setAuthError(false);
    try {
      const booking = await api.post("/bookings", {
        bookingType: "MONTHLY",
        listingId: id,
        moveInDate,
        guestCount,
      });
      // Direct to checkout page to pay hold fee
      router.push(`/booking/${booking.id}/checkout`);
    } catch (e: any) {
      if (e.message?.includes("Unauthorized") || e.message?.includes("401")) {
        setAuthError(true);
        setError("You must be logged in to reserve a room.");
      } else {
        setError(e.message || "Could not reserve room hold");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // 3. Pay Monthly Deposit Directly (skips hold, goes straight to deposit page)
  async function reserveMonthlyDirectDeposit() {
    setSubmitting(true);
    setError(null);
    setAuthError(false);
    try {
      const booking = await api.post("/bookings", {
        bookingType: "MONTHLY",
        listingId: id,
        moveInDate,
        guestCount,
      });
      // Direct to deposit page to pay full security deposit
      router.push(`/booking/${booking.id}/deposit`);
    } catch (e: any) {
      if (e.message?.includes("Unauthorized") || e.message?.includes("401")) {
        setAuthError(true);
        setError("You must be logged in to reserve a room.");
      } else {
        setError(e.message || "Could not reserve room deposit");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // 4. Reserve or Buy Plot / Land for Sale
  async function reservePlotSale(option: "RESERVE_HOLD" | "PAY_DEPOSIT" | "BUY_OUTRIGHT") {
    setSubmitting(true);
    setError(null);
    setAuthError(false);
    try {
      const booking = await api.post("/bookings", {
        bookingType: "PLOT_SALE",
        listingId: id,
        option,
      });
      if (option === "BUY_OUTRIGHT") {
        router.push(`/booking/${booking.id}/checkout`);
      } else if (option === "PAY_DEPOSIT") {
        router.push(`/booking/${booking.id}/deposit`);
      } else {
        router.push(`/booking/${booking.id}/checkout`);
      }
    } catch (e: any) {
      if (e.message?.includes("Unauthorized") || e.message?.includes("401")) {
        setAuthError(true);
        setError("You must be logged in to reserve or purchase a plot.");
      } else {
        setError(e.message || "Could not process plot purchase option");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  if (error && !listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <IconAlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <p className="text-rose-600 dark:text-rose-400 font-semibold text-lg">{error}</p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md"
        >
          ← Back to All Listings
        </Link>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-10 bg-slate-200 dark:bg-slate-900 rounded-lg w-1/3" />
        <div className="h-96 bg-slate-200 dark:bg-slate-900 rounded-2xl" />
      </div>
    );
  }

  const photos = listing.photos && listing.photos.length > 0 ? listing.photos : DEFAULT_PHOTOS;
  const amenities = listing.amenities && listing.amenities.length > 0 ? listing.amenities : DEFAULT_AMENITIES;
  const isMonthly = listing.listingType === "MONTHLY";
  const isPlotSale = listing.listingType === "PLOT_SALE";
  const CategoryIcon = listing.roomCategory && ROOM_CATEGORY_MAP[listing.roomCategory]
    ? ROOM_CATEGORY_MAP[listing.roomCategory].Icon
    : IconHome;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Location Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/" className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium flex items-center gap-1">
            <IconArrowRight className="w-3 h-3 rotate-180" /> Listings
          </Link>
          <span className="text-xs text-slate-400">/</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{listing.city}, {listing.state}</span>
        </div>

        <div className="flex items-start gap-3 flex-wrap">
          <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-slate-900 dark:text-white flex-1">
            {listing.title}
          </h1>
          <span className={`mt-1 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${
            isPlotSale
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
              : isMonthly
              ? "bg-violet-500/15 text-violet-700 dark:text-violet-400 border border-violet-500/30"
              : "bg-brand-500/15 text-brand-700 dark:text-brand-400 border border-brand-500/30"
          }`}>
            <IconBuilding className="w-3.5 h-3.5" />
            {isPlotSale ? "Plot for Sale" : isMonthly ? "Monthly Rental" : "Nightly Stay"}
          </span>
          {isMonthly && listing.roomCategory && ROOM_CATEGORY_MAP[listing.roomCategory] && (
            <span className="mt-1 px-3 py-1.5 rounded-full text-xs font-bold bg-violet-500/15 text-violet-700 dark:text-violet-400 border border-violet-500/30 flex items-center gap-1.5">
              <CategoryIcon className="w-3.5 h-3.5" />
              {ROOM_CATEGORY_MAP[listing.roomCategory].label}
            </span>
          )}
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 flex items-center gap-2">
          <span className="flex items-center gap-1">
            <IconMapPin className="w-4 h-4 text-slate-500" />
            {listing.address ? `${listing.address}, ` : ""}{listing.city}, {listing.state}, USA
          </span>
          <span>•</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <IconShieldCheck className="w-4 h-4" /> Verified US Property
          </span>
        </p>
      </div>

      {/* Photo Gallery Grid */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl overflow-hidden h-[340px] sm:h-[420px] bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="md:col-span-2 h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[0]}
              alt={listing.title}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = DEFAULT_PHOTOS[0]; }}
            />
          </div>
          <div className="hidden md:grid grid-rows-2 gap-3 h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[1] || photos[0]}
              alt="Room detail"
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = DEFAULT_PHOTOS[1]; }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[2] || photos[0]}
              alt="Room view"
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = DEFAULT_PHOTOS[2]; }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column — Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Protection Notice Banner */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-500/30 shadow-md flex items-start gap-3.5">
            <IconShieldCheck className="w-6 h-6 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">US Citizen & Property Protection</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5">
                {isPlotSale
                  ? "Reserve a plot hold, pay a down payment deposit, or buy the plot outright with full legal protection."
                  : isMonthly
                  ? "Reserve your room hold or pay your security deposit securely online. Monthly rent is paid directly to the host at the property."
                  : "This room reservation is protected by 15-minute date overlap hold locks. Payment holds are processed securely."}
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white mb-3">About this property</h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {listing.description || "Prime location property available for reservation or purchase in the United States."}
            </p>
          </div>

          {/* Plot Sale Breakdown */}
          {isPlotSale && (
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white mb-4">Plot Sale Details</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">Plot Size</div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white">{listing.plotSize || "0.5 Acres"}</div>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">Down Payment Deposit</div>
                  <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">${listing.depositAmount || "2,500"}</div>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">Full Sale Price</div>
                  <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">${listing.salePrice || "25,000"}</div>
                </div>
              </div>
            </div>
          )}

          {/* Monthly Pricing Breakdown */}
          {isMonthly && (
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white mb-4">Pricing Breakdown</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">Security Deposit</div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white">${listing.depositAmount}</div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-1">Paid online (Card, Cash App, or Crypto)</div>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">Monthly Rent</div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white">${listing.pricePerMonth}<span className="text-sm font-normal text-slate-500">/mo</span></div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Paid directly at property each month</div>
                </div>
              </div>
            </div>
          )}

          {/* Amenities */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white mb-4">Included Amenities</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {amenities.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 shadow-sm"
                >
                  <IconCheck className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column — Booking Options Widget */}
        <div>
          <div className="sticky top-24 glass-panel rounded-2xl p-6 space-y-6 shadow-xl border border-slate-200 dark:border-slate-800">
            {/* ── NIGHTLY WIDGET ── */}
            {!isMonthly && !isPlotSale && (
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
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs space-y-2">
                    <div className="flex items-center gap-2">
                      <IconAlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                    {authError && (
                      <button
                        onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/listings/${id}`)}`)}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-all"
                      >
                        Log In to Reserve Room →
                      </button>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1">Check-in</label>
                      <input
                        type="date"
                        min={today}
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1">Check-out</label>
                      <input
                        type="date"
                        min={checkIn || today}
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1">Guests</label>
                    <input
                      type="number"
                      min={1}
                      max={listing.maxGuests}
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                {stayNights > 0 && (
                  <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span>${listing.pricePerNight} × {stayNights} nights</span>
                      <span>${totalStayPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                      <span>Booking Hold Fee (Due Now)</span>
                      <span>${bookingFee.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <button
                  disabled={submitting || !checkIn || !checkOut || stayNights <= 0}
                  onClick={reserveNightly}
                  className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 font-bold text-sm text-white shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <IconSpinner className="w-4 h-4" />
                      <span>Creating Hold…</span>
                    </>
                  ) : (
                    <>
                      <span>Reserve Room &amp; Pay Hold Fee</span>
                      <IconArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </>
            )}

            {/* ── MONTHLY WIDGET (DUAL OPTIONS: RESERVE HOLD ONLY vs PAY DEPOSIT DIRECTLY) ── */}
            {isMonthly && (
              <>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Monthly Rent</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">${listing.pricePerMonth}</span>
                    <span className="text-xs text-slate-500">/month</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Rent is paid at property each month — not online.</p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs space-y-2">
                    <div className="flex items-center gap-2">
                      <IconAlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                    {authError && (
                      <button
                        onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/listings/${id}`)}`)}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-all"
                      >
                        Log In to Reserve Room →
                      </button>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Move-in Date
                    </label>
                    <input
                      type="date"
                      min={today}
                      value={moveInDate}
                      onChange={(e) => setMoveInDate(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Tenants
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={listing.maxGuests}
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Dual Action Options */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                    Choose Booking Method:
                  </span>

                  {/* Option 1: Reserve Hold Only */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Option 1: Reserve Hold Only</span>
                      <span className="text-xs font-extrabold text-brand-600 dark:text-brand-400">${listing.bookingFee}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Lock the room hold for 15 minutes. Pay the deposit later.
                    </p>
                    <button
                      disabled={submitting || !moveInDate}
                      onClick={reserveMonthlyHold}
                      className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 font-bold text-xs text-white shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {submitting ? <IconSpinner className="w-3.5 h-3.5" /> : null}
                      <span>Reserve Hold Only (${listing.bookingFee})</span>
                    </button>
                  </div>

                  {/* Option 2: Pay Security Deposit Directly */}
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Option 2: Pay Deposit Directly</span>
                      <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">${listing.depositAmount}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Pay full security deposit upfront to confirm your lease immediately.
                    </p>
                    <button
                      disabled={submitting || !moveInDate}
                      onClick={reserveMonthlyDirectDeposit}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {submitting ? <IconSpinner className="w-3.5 h-3.5" /> : null}
                      <span>Pay Deposit Directly (${listing.depositAmount}) →</span>
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
                  🔒 Encrypted payments via Card, Cash App, or USDT TRC20 Crypto.
                </p>
              </>
            )}

            {/* ── PLOT FOR SALE WIDGET (3 OPTIONS: RESERVE HOLD, PAY DEPOSIT, BUY OUTRIGHT) ── */}
            {isPlotSale && (
              <>
                <div>
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider mb-1">Land / Plot Sale</div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">${listing.salePrice}</span>
                    <span className="text-xs font-bold px-2 py-1 bg-amber-500/10 text-amber-600 rounded-lg">{listing.plotSize || "Plot"}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Verified US Land &amp; Real Estate Title.</p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs space-y-2">
                    <div className="flex items-center gap-2">
                      <IconAlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                    {authError && (
                      <button
                        onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/listings/${id}`)}`)}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-all"
                      >
                        Log In to Purchase / Reserve Plot →
                      </button>
                    )}
                  </div>
                )}

                {/* 3 Action Options */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                    Choose Action Option:
                  </span>

                  {/* Option 1: Reserve Plot Hold */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Option 1: Reserve Plot Hold</span>
                      <span className="text-xs font-extrabold text-brand-600 dark:text-brand-400">${listing.bookingFee || "100"}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Lock this plot hold for 15 minutes while reviewing paperwork.
                    </p>
                    <button
                      disabled={submitting}
                      onClick={() => reservePlotSale("RESERVE_HOLD")}
                      className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 font-bold text-xs text-white shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {submitting ? <IconSpinner className="w-3.5 h-3.5" /> : null}
                      <span>Reserve Plot Hold (${listing.bookingFee || "100"})</span>
                    </button>
                  </div>

                  {/* Option 2: Pay Down Payment / Deposit */}
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Option 2: Pay Down Payment / Deposit</span>
                      <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">${listing.depositAmount || "2,500"}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Pay down payment deposit to secure purchase agreement.
                    </p>
                    <button
                      disabled={submitting}
                      onClick={() => reservePlotSale("PAY_DEPOSIT")}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {submitting ? <IconSpinner className="w-3.5 h-3.5" /> : null}
                      <span>Pay Deposit (${listing.depositAmount || "2,500"}) →</span>
                    </button>
                  </div>

                  {/* Option 3: Buy Outright */}
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Option 3: Buy Outright</span>
                      <span className="text-xs font-extrabold text-amber-700 dark:text-amber-400">${listing.salePrice}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Pay full purchase price to purchase title in full.
                    </p>
                    <button
                      disabled={submitting}
                      onClick={() => reservePlotSale("BUY_OUTRIGHT")}
                      className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-xs text-white shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {submitting ? <IconSpinner className="w-3.5 h-3.5" /> : null}
                      <span>Buy Outright (${listing.salePrice}) ★</span>
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
                  🔒 Encrypted payments via Card, Cash App, or USDT TRC20 Crypto.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
