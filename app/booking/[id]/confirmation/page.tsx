"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "../../../../lib/api";

export default function ConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    api.get(`/bookings/${id}`).then(setBooking);
  }, [id]);

  if (!booking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 animate-pulse text-center space-y-4">
        <div className="h-8 bg-slate-900 rounded-lg w-1/2 mx-auto" />
        <div className="h-48 bg-slate-900 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="glass-panel rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6 relative overflow-hidden">
        {/* Top Celebration Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-emerald-500/20 blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          🎉
        </div>

        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            Status: {booking.status}
          </span>
          <h1 className="text-3xl font-extrabold font-heading text-white">Booking Confirmed!</h1>
          <p className="text-sm text-slate-400 mt-1">
            Your US room hold is confirmed and locked for check-in.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-950/80 border border-white/10 text-left space-y-4 text-sm">
          <div className="border-b border-white/10 pb-3">
            <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider">Reserved Room</p>
            <p className="text-lg font-bold text-white mt-0.5">{booking.listing.title}</p>
            <p className="text-xs text-slate-400">📍 {booking.listing.city}, {booking.listing.state}, USA</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400">Check-in</p>
              <p className="font-semibold text-white mt-0.5">{new Date(booking.checkIn).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Check-out</p>
              <p className="font-semibold text-white mt-0.5">{new Date(booking.checkOut).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xs">
            <span className="text-slate-400">Booking Hold Fee Paid:</span>
            <span className="font-bold text-emerald-400">${Number(booking.bookingFee).toFixed(2)} USD</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/bookings"
            className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 font-semibold text-sm text-white transition-all text-center shadow-lg shadow-brand-600/30"
          >
            View My Bookings Dashboard
          </Link>
          <Link
            href="/"
            className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 font-semibold text-sm text-slate-300 transition-all text-center"
          >
            Back to All Rooms
          </Link>
        </div>
      </div>
    </div>
  );
}
