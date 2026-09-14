"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";

type Listing = {
  id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pricePerNight: string;
  bookingFee: string;
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
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/listings/${id}`).then(setListing).catch((e) => setError(e.message));
  }, [id]);

  // Compute stay duration and estimated stay total
  const stayNights =
    checkIn && checkOut
      ? Math.max(0, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 3600 * 24)))
      : 0;

  const pricePerNight = listing ? Number(listing.pricePerNight) : 0;
  const totalStayPrice = stayNights * pricePerNight;
  const bookingFee = listing ? Number(listing.bookingFee) : 0;

  async function reserve() {
    setSubmitting(true);
    setError(null);
    try {
      const booking = await api.post("/bookings", {
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Location Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/" className="text-xs text-brand-400 hover:underline">
            ← Listings
          </Link>
          <span className="text-xs text-slate-600">/</span>
          <span className="text-xs text-slate-400">{listing.city}, {listing.state}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-white">{listing.title}</h1>
        <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
          <span>📍 {listing.address ? `${listing.address}, ` : ""}{listing.city}, {listing.state}, USA</span>
          <span>•</span>
          <span className="text-emerald-400 font-medium">Verified Host: {listing.host?.name || "US Room Host"}</span>
        </p>
      </div>

      {/* Photo Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl overflow-hidden h-[340px] sm:h-[420px] bg-slate-950">
        <div className="md:col-span-2 h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[0]} alt={listing.title} className="w-full h-full object-cover" />
        </div>
        <div className="hidden md:grid grid-rows-2 gap-3 h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[1] || photos[0]} alt="Side room detail" className="w-full h-full object-cover" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[2] || photos[0]} alt="Side room view" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Content Layout (Details Left, Widget Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* US Citizen Attestation Notice */}
          <div className="p-4 rounded-xl bg-slate-900 border border-brand-500/30 flex items-start gap-3">
            <span className="text-2xl">🇺🇸</span>
            <div>
              <h4 className="text-sm font-bold text-white">US Citizen Rental Protection</h4>
              <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                This room reservation is protected by 15-minute date overlap hold locks. Guests self-attest US citizenship at reservation.
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xl font-bold font-heading text-white mb-3">About this rental room</h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {listing.description || "Modern, comfortable room rental in a convenient location. Clean, quiet space ideal for short to medium-term US stays."}
            </p>
          </div>

          {/* Amenities */}
          <div className="pt-6 border-t border-white/10">
            <h3 className="text-xl font-bold font-heading text-white mb-4">Included Amenities</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {amenities.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs font-medium text-slate-200"
                >
                  <span className="text-brand-400">✓</span> {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Booking Reservation Widget */}
        <div>
          <div className="sticky top-24 glass-panel rounded-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-white">${listing.pricePerNight}</span>
                <span className="text-xs text-slate-400"> / night</span>
              </div>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                Hold fee: ${listing.bookingFee}
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                ⚠️ {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Check-in Date
                  </label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Check-out Date
                  </label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Number of Guests
                </label>
                <input
                  type="number"
                  min={1}
                  max={listing.maxGuests}
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Price breakdown */}
            {stayNights > 0 && (
              <div className="space-y-2 pt-4 border-t border-white/10 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>${listing.pricePerNight} × {stayNights} {stayNights === 1 ? "night" : "nights"}</span>
                  <span>${totalStayPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>Booking Hold Fee (Due Now via Cash App)</span>
                  <span>${bookingFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-white pt-2 border-t border-white/10">
                  <span>Estimated Total Stay</span>
                  <span>${(totalStayPrice + bookingFee).toFixed(2)}</span>
                </div>
              </div>
            )}

            <button
              disabled={submitting || !checkIn || !checkOut || stayNights <= 0}
              onClick={reserve}
              className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 font-bold text-sm text-white shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50"
            >
              {submitting ? "Creating Hold..." : "Reserve & Proceed to Cash App Pay →"}
            </button>
            <p className="text-[11px] text-center text-slate-400">
              🔒 You will not be charged total stay until checkout confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
