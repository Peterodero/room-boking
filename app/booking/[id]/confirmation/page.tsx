"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "../../../../lib/api";

export default function ConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    api.get(`/bookings/${id}`).then(setBooking).catch(console.error);
  }, [id]);

  if (!booking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 animate-pulse text-center space-y-4">
        <div className="h-8 bg-slate-200 dark:bg-slate-900 rounded-lg w-1/2 mx-auto" />
        <div className="h-48 bg-slate-200 dark:bg-slate-900 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="glass-panel rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6 relative overflow-hidden">
        {/* Celebration glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-28 bg-emerald-500/20 blur-3xl pointer-events-none" />

        {/* Check icon */}
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
          <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            Status: {booking.status}
          </span>
          <h1 className="text-3xl font-extrabold font-heading text-slate-900 dark:text-white">Booking Confirmed!</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Your US room hold is confirmed and locked for check-in. A receipt has been recorded.
          </p>
        </div>

        {/* Booking Details Card */}
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 text-left space-y-4 text-sm">
          <div className="border-b border-slate-200 dark:border-white/10 pb-3">
            <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider">Reserved Room</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{booking.listing.title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {booking.listing.city}, {booking.listing.state}, USA
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {booking.checkIn && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Check-in</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  {new Date(booking.checkIn).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            )}
            {booking.checkOut && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Check-out</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  {new Date(booking.checkOut).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            )}
            {booking.guestCount && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Guests</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{booking.guestCount} Guest(s)</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-between items-center text-xs">
            <span className="text-slate-500 dark:text-slate-400">Booking Hold Fee Paid:</span>
            <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-base">${Number(booking.bookingFee).toFixed(2)} USD</span>
          </div>
        </div>

        {/* Confirmation note */}
        <div className="flex items-center gap-2 justify-center text-xs text-slate-500 dark:text-slate-400">
          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Room dates are locked. Your payment was processed securely via Square.
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/bookings"
            className="flex-1 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 font-bold text-sm text-white transition-all text-center shadow-lg shadow-brand-600/30"
          >
            View My Bookings
          </Link>
          <Link
            href="/"
            className="flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 font-bold text-sm text-slate-700 dark:text-slate-300 transition-all text-center"
          >
            Browse More Rooms
          </Link>
        </div>
      </div>
    </div>
  );
}
