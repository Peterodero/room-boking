"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";

type Booking = {
  id: string;
  checkIn: string;
  checkOut: string;
  totalPrice: string;
  bookingFee: string;
  status: "PENDING" | "CONFIRMED" | "EXPIRED" | "CANCELLED";
  listing: {
    id: string;
    title: string;
    city: string;
    state: string;
  };
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get("/bookings");
        setBookings(data);
      } catch (err: any) {
        setError(err.message || "Failed to load bookings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-white">My Room Reservations</h1>
          <p className="text-sm text-slate-400">View and manage your US room holds and confirmed bookings</p>
        </div>
        <Link href="/" className="text-xs text-brand-400 hover:underline">
          + Explore More Rooms
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-900/60 rounded-2xl border border-white/5" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-slate-900 border border-white/10 text-center space-y-3">
          <p className="text-sm text-slate-300">Please sign in to view your room reservations.</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-white/5 space-y-3">
          <div className="text-4xl">🧳</div>
          <h3 className="text-lg font-semibold text-slate-200">No active bookings yet</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Browse our listings and reserve your room hold with Cash App Pay.
          </p>
          <Link
            href="/"
            className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-500 transition-colors"
          >
            Find a Room Now
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const isConfirmed = b.status === "CONFIRMED";
            const isPending = b.status === "PENDING";

            return (
              <div
                key={b.id}
                className="glass-panel rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                        isConfirmed
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : isPending
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                      }`}
                    >
                      {b.status}
                    </span>
                    <span className="text-xs text-slate-400">
                      📍 {b.listing.city}, {b.listing.state}
                    </span>
                  </div>

                  <Link href={`/listings/${b.listing.id}`} className="font-heading font-bold text-lg text-white hover:text-brand-400 transition-colors">
                    {b.listing.title}
                  </Link>

                  <p className="text-xs text-slate-400">
                    {new Date(b.checkIn).toLocaleDateString()} – {new Date(b.checkOut).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Hold Fee</p>
                    <p className="text-base font-bold text-white">${Number(b.bookingFee).toFixed(2)}</p>
                  </div>

                  {isPending && (
                    <Link
                      href={`/booking/${b.id}/checkout`}
                      className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white shadow-md shadow-brand-600/30 transition-all"
                    >
                      Pay Fee Now →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
