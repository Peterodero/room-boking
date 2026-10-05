"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";

type Booking = {
  id: string;
  checkIn?: string | null;
  checkOut?: string | null;
  moveInDate?: string | null;
  totalPrice: string;
  bookingFee: string;
  depositAmount?: string | null;
  status: "PENDING" | "CONFIRMED" | "EXPIRED" | "CANCELLED";
  monthlyStatus?: "RESERVED" | "DEPOSIT_PAID" | "CANCELLED" | null;
  holdExpiresAt?: string | null;
  listing: {
    id: string;
    title: string;
    city: string;
    state: string;
    photos?: string[];
  };
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  // Login Form state if auth missing
  const [loginEmail, setLoginEmail] = useState("admin@roomstays.us");
  const [loginPassword, setLoginPassword] = useState("AdminPass123!");
  const [loggingIn, setLoggingIn] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    setAuthRequired(false);
    try {
      const data = await api.get("/bookings");
      setBookings(data);
    } catch (err: any) {
      if (err.message?.includes("Unauthorized") || err.message?.includes("401")) {
        setAuthRequired(true);
      } else {
        setError(err.message || "Failed to load bookings");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setError(null);
    try {
      const res = await api.post("/auth/login", {
        username: loginEmail,
        email: loginEmail,
        password: loginPassword,
      });
      if (res.token) {
        localStorage.setItem("token", res.token);
        if (res.user) localStorage.setItem("user", JSON.stringify(res.user));
        await fetchBookings();
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Check your credentials.");
    } finally {
      setLoggingIn(false);
    }
  };

  // Render Auth Required Login Card if unauthenticated
  if (authRequired) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold font-heading text-slate-900 dark:text-white">Sign In to View Your Bookings</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Access your room holds, confirmed reservations, and deposit receipts.
          </p>
        </div>

        <form onSubmit={handleLoginSubmit} className="zillow-card p-6 text-left space-y-4 shadow-xl">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Username or Email
            </label>
            <input
              type="text"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50"
          >
            {loggingIn ? "Signing In..." : "Sign In & View Bookings →"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-slate-900 dark:text-white">My Room Reservations</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            View and manage your live room holds, confirmed stays, and rental deposits.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20 text-xs font-bold hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
        >
          <span>+</span> Explore More Rooms
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-white/5" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-center space-y-2">
          <svg className="w-8 h-8 text-rose-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-sm text-rose-700 dark:text-rose-400 font-semibold">{error}</p>
          <button onClick={fetchBookings} className="text-xs font-bold text-brand-600 underline">Retry Loading</button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4 shadow-sm">
          <svg className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">No active room bookings yet</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
            Browse our verified US listings and place a 15-minute reservation hold with Cash App Pay.
          </p>
          <Link
            href="/"
            className="inline-block mt-2 px-6 py-3 rounded-xl bg-brand-600 text-white font-bold text-sm shadow-lg shadow-brand-600/30 hover:bg-brand-500 transition-colors"
          >
            Find a Room Now →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const isConfirmed = b.status === "CONFIRMED";
            const isPending = b.status === "PENDING";
            const isExpired = b.status === "EXPIRED";
            const photo = b.listing.photos?.[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267";

            return (
              <div
                key={b.id}
                className="zillow-card p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 shrink-0 hidden sm:block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt={b.listing.title} className="w-full h-full object-cover" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                          isConfirmed
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                            : isPending
                            ? "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400 animate-pulse"
                            : isExpired
                            ? "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-400"
                            : "bg-slate-500/15 border-slate-500/30 text-slate-700 dark:text-slate-400"
                        }`}
                      >
                        {b.status}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {b.listing.city}, {b.listing.state}
                      </span>
                    </div>

                    <Link
                      href={`/listings/${b.listing.id}`}
                      className="font-heading font-bold text-lg text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors block"
                    >
                      {b.listing.title}
                    </Link>

                    {b.checkIn && b.checkOut && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {new Date(b.checkIn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} –{" "}
                        {new Date(b.checkOut).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}

                    {b.moveInDate && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Move-in: {new Date(b.moveInDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-white/10">
                  <div className="text-right">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Hold Fee</p>
                    <p className="text-lg font-extrabold text-slate-900 dark:text-white">${Number(b.bookingFee).toFixed(2)}</p>
                  </div>

                  {isPending && (
                    <Link
                      href={`/booking/${b.id}/checkout`}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition-all transform active:scale-95"
                    >
                      Pay Fee Now →
                    </Link>
                  )}

                  {isConfirmed && (
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Confirmed
                    </span>
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
