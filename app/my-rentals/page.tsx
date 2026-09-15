"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";

type MonthlyBooking = {
  id: string;
  monthlyStatus: "RESERVED" | "DEPOSIT_PAID" | "CANCELLED";
  moveInDate: string;
  depositAmount: string;
  depositPaidAt?: string;
  createdAt: string;
  listing: {
    id: string;
    title: string;
    city: string;
    state: string;
    pricePerMonth: string;
    photos: string[];
  };
};

const STATUS_CONFIG = {
  RESERVED: {
    label: "Awaiting Deposit",
    color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    icon: "⏳",
  },
  DEPOSIT_PAID: {
    label: "Deposit Confirmed",
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    icon: "✅",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    icon: "❌",
  },
};

export default function MyRentalsPage() {
  const [bookings, setBookings] = useState<MonthlyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/bookings/my-rentals")
      .then((data) => { setBookings(data); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 animate-pulse space-y-4">
        <div className="h-8 bg-slate-900 rounded-lg w-1/3" />
        {[1, 2].map((i) => <div key={i} className="h-32 bg-slate-900 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-xs text-brand-400 hover:underline">← Home</Link>
        <h1 className="text-3xl font-extrabold font-heading text-white mt-1">My Monthly Rentals</h1>
        <p className="text-sm text-slate-400 mt-0.5">Track your monthly room reservations and deposit status</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm mb-6">
          ⚠️ {error} — <Link href="/auth/login" className="underline">Sign in</Link> to view your rentals.
        </div>
      )}

      {!error && bookings.length === 0 && (
        <div className="glass-panel rounded-2xl p-10 text-center space-y-4">
          <div className="text-5xl">🏠</div>
          <h2 className="text-xl font-bold text-white">No Monthly Rentals Yet</h2>
          <p className="text-slate-400 text-sm">Browse our monthly rental listings to find your next home.</p>
          <Link
            href="/?type=MONTHLY"
            className="inline-block px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 font-bold text-sm text-white transition-all"
          >
            Browse Monthly Rentals →
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {bookings.map((booking) => {
          const status = STATUS_CONFIG[booking.monthlyStatus];
          const photo = booking.listing.photos?.[0];
          const moveIn = new Date(booking.moveInDate).toLocaleDateString("en-US", {
            month: "long", day: "numeric", year: "numeric",
          });
          const depositPaid = booking.depositPaidAt
            ? new Date(booking.depositPaidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : null;

          return (
            <div key={booking.id} className="glass-panel rounded-2xl overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                {/* Photo */}
                {photo && (
                  <div className="sm:w-40 h-32 sm:h-auto flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt={booking.listing.title} className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 p-5 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <Link
                        href={`/listings/${booking.listing.id}`}
                        className="font-bold text-white hover:text-brand-400 transition-colors"
                      >
                        {booking.listing.title}
                      </Link>
                      <div className="text-xs text-slate-400 mt-0.5">
                        📍 {booking.listing.city}, {booking.listing.state}
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${status.color}`}>
                      {status.icon} {status.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-1">
                    <div className="text-slate-400">Move-in Date</div>
                    <div className="text-white font-medium">{moveIn}</div>
                    <div className="text-slate-400">Monthly Rent</div>
                    <div className="text-white">${booking.listing.pricePerMonth}<span className="text-slate-500">/mo</span> <span className="text-[10px] text-slate-500">(at property)</span></div>
                    <div className="text-slate-400">Deposit</div>
                    <div className="text-white">${Number(booking.depositAmount).toFixed(2)}{depositPaid ? ` · paid ${depositPaid}` : ""}</div>
                  </div>

                  {/* CTA row */}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {booking.monthlyStatus === "RESERVED" && (
                      <Link
                        href={`/booking/${booking.id}/deposit`}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all"
                      >
                        💚 Pay Deposit Now
                      </Link>
                    )}
                    {booking.monthlyStatus === "DEPOSIT_PAID" && (
                      <span className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-400">
                        ✅ Deposit Paid — You&apos;re all set!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
