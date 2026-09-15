"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../../lib/api";

type Booking = {
  id: string;
  monthlyStatus: "RESERVED" | "DEPOSIT_PAID" | "CANCELLED";
  moveInDate: string;
  depositAmount: string;
  createdAt: string;
  listing: {
    id: string;
    title: string;
    city: string;
    state: string;
    pricePerMonth: string;
    photos: string[];
    host: { name: string };
  };
};

export default function DepositPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    api.get(`/bookings/${id}`).then(setBooking).catch((e) => setError(e.message));
  }, [id]);

  async function markDepositPaid() {
    setPaying(true);
    setError(null);
    try {
      await api.post(`/bookings/${id}/pay-deposit`, {});
      setConfirmed(true);
    } catch (e: any) {
      setError(e.message || "Failed to confirm deposit payment");
    } finally {
      setPaying(false);
    }
  }

  if (error && !booking) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <p className="text-rose-400 font-semibold">{error}</p>
        <Link href="/" className="inline-block px-4 py-2 bg-slate-800 rounded-lg text-sm text-slate-200">← Back</Link>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 animate-pulse space-y-4">
        <div className="h-8 bg-slate-900 rounded-lg w-1/2" />
        <div className="h-48 bg-slate-900 rounded-2xl" />
      </div>
    );
  }

  const moveIn = new Date(booking.moveInDate).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const depositAmt = Number(booking.depositAmount).toFixed(2);
  const photo = booking.listing.photos?.[0];

  // ── Confirmation screen ──────────────────────────────────────────────────
  if (confirmed || booking.monthlyStatus === "DEPOSIT_PAID") {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center space-y-6">
        <div className="text-6xl animate-bounce">🎉</div>
        <h1 className="text-3xl font-extrabold font-heading text-white">Deposit Confirmed!</h1>
        <p className="text-slate-300 text-sm leading-relaxed">
          Your security deposit of <span className="text-emerald-400 font-bold">${depositAmt}</span> has been recorded.
          You're all set to move in on <span className="text-white font-semibold">{moveIn}</span>.
        </p>
        <div className="glass-panel rounded-2xl p-5 text-left space-y-2 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>Property</span>
            <span className="text-white font-medium">{booking.listing.title}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Location</span>
            <span className="text-white">{booking.listing.city}, {booking.listing.state}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Move-in Date</span>
            <span className="text-white">{moveIn}</span>
          </div>
          <div className="flex justify-between text-slate-400 pt-2 border-t border-white/10">
            <span>Monthly Rent</span>
            <span className="text-white font-medium">${booking.listing.pricePerMonth}<span className="text-slate-400 text-xs">/mo</span></span>
          </div>
          <p className="text-[11px] text-slate-500 pt-1">Monthly rent is paid directly at the property each month.</p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href="/my-rentals"
            className="block w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 font-bold text-sm text-white text-center transition-all"
          >
            View My Rentals →
          </Link>
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">← Browse More Listings</Link>
        </div>
      </div>
    );
  }

  // ── Deposit payment screen ───────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href={`/listings/${booking.listing.id}`} className="text-xs text-brand-400 hover:underline">
          ← Back to Listing
        </Link>
        <h1 className="text-3xl font-extrabold font-heading text-white mt-1">Pay Security Deposit</h1>
        <p className="text-sm text-slate-400 mt-0.5">Confirm your monthly rental — one secure payment to lock in your room.</p>
      </div>

      {/* Listing preview */}
      {photo && (
        <div className="relative rounded-2xl overflow-hidden h-44">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt={booking.listing.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent" />
          <div className="absolute bottom-4 left-4">
            <div className="text-white font-bold">{booking.listing.title}</div>
            <div className="text-slate-300 text-xs">{booking.listing.city}, {booking.listing.state}</div>
          </div>
        </div>
      )}

      {/* Booking summary */}
      <div className="glass-panel rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white">Booking Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>Move-in Date</span>
            <span className="text-white font-medium">{moveIn}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Monthly Rent</span>
            <span className="text-white">${booking.listing.pricePerMonth}<span className="text-slate-400 text-xs">/mo</span> <span className="text-xs text-slate-500">(at property)</span></span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Host</span>
            <span className="text-white">{booking.listing.host?.name}</span>
          </div>
          <div className="flex justify-between font-bold text-base text-white pt-3 border-t border-white/10">
            <span>Security Deposit Due Now</span>
            <span className="text-emerald-400">${depositAmt}</span>
          </div>
        </div>
      </div>

      {/* Cash App instructions */}
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">💚</span>
          <span className="font-bold text-emerald-300 text-sm">Pay via Cash App</span>
        </div>
        <ol className="text-xs text-slate-300 space-y-1 list-decimal list-inside">
          <li>Open Cash App on your phone</li>
          <li>Send <strong className="text-white">${depositAmt}</strong> to your host's Cash App handle</li>
          <li>Use note: <strong className="text-white">Deposit – {booking.listing.title}</strong></li>
          <li>Once sent, click the button below to confirm</li>
        </ol>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={markDepositPaid}
        disabled={paying}
        className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
      >
        {paying ? "Confirming..." : "✅ I've Sent the Deposit — Confirm Reservation"}
      </button>
      <p className="text-[11px] text-center text-slate-500">
        By confirming, you attest that you have sent the deposit via Cash App. Fraudulent confirmations may result in account suspension.
      </p>
    </div>
  );
}
