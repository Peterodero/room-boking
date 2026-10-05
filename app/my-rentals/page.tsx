"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import {
  IconHome,
  IconCalendar,
  IconSpinner,
  IconAlertCircle,
  IconCheck,
  IconArrowRight,
  IconLock,
} from "../../components/Icons";

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
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
  DEPOSIT_PAID: {
    label: "Deposit Confirmed",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  },
};

export default function MyRentalsPage() {
  const [bookings, setBookings] = useState<MonthlyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const fetchRentals = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAuthRequired(false);
    try {
      const data = await api.get("/bookings/my-rentals");
      setBookings(data);
    } catch (e: any) {
      if (e.message?.includes("Unauthorized") || e.message?.includes("401")) {
        setAuthRequired(true);
      } else {
        setError(e.message || "Failed to load rentals");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRentals(); }, [fetchRentals]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setError(null);
    try {
      const res = await api.post("/auth/login", { username: loginEmail, email: loginEmail, password: loginPassword });
      if (res.token) {
        localStorage.setItem("token", res.token);
        if (res.user) localStorage.setItem("user", JSON.stringify(res.user));
        await fetchRentals();
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoggingIn(false);
    }
  };

  if (authRequired) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-600/10 border border-violet-500/30 flex items-center justify-center">
          <IconLock className="w-8 h-8 text-violet-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">Sign In to View Your Rentals</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Access your monthly room reservations and deposit history.</p>
        </div>
        <form onSubmit={handleLogin} className="glass-panel p-6 rounded-2xl space-y-4 text-left">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs rounded-lg flex items-center gap-2">
              <IconAlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email or Username</label>
            <input
              type="text"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-violet-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-violet-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loggingIn}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loggingIn ? <><IconSpinner className="w-4 h-4" /><span>Signing in…</span></> : "Sign In & View Rentals"}
          </button>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 dark:bg-slate-900 rounded-lg w-1/3" />
        {[1, 2].map((i) => <div key={i} className="h-36 bg-slate-200 dark:bg-slate-900 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Page header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-5">
        <Link href="/" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 mb-2">
          <IconArrowRight className="w-3 h-3 rotate-180" /> Home
        </Link>
        <h1 className="text-3xl font-extrabold font-heading text-slate-900 dark:text-white">My Monthly Rentals</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">Track your monthly room reservations and deposit status</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 flex items-start gap-3">
          <IconAlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">{error}</p>
            <button onClick={fetchRentals} className="text-xs text-brand-600 dark:text-brand-400 font-bold underline mt-1">Try Again</button>
          </div>
        </div>
      )}

      {!error && bookings.length === 0 && (
        <div className="glass-panel rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <IconHome className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">No Monthly Rentals Yet</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xs mx-auto">Browse our monthly rental listings to find your next home in the US.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 font-bold text-sm text-white transition-all shadow-lg shadow-brand-600/30"
          >
            Browse Monthly Rentals <IconArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {bookings.map((booking) => {
          const status = STATUS_CONFIG[booking.monthlyStatus];
          const photo = booking.listing.photos?.[0];
          const moveIn = new Date(booking.moveInDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
          const depositPaid = booking.depositPaidAt
            ? new Date(booking.depositPaidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : null;

          return (
            <div key={booking.id} className="glass-panel rounded-2xl overflow-hidden hover:shadow-lg transition-shadow border border-slate-200 dark:border-white/10">
              <div className="flex flex-col sm:flex-row">
                {/* Photo */}
                {photo && (
                  <div className="sm:w-44 h-36 sm:h-auto flex-shrink-0 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt={booking.listing.title} className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <Link
                        href={`/listings/${booking.listing.id}`}
                        className="font-heading font-bold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors text-base"
                      >
                        {booking.listing.title}
                      </Link>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {booking.listing.city}, {booking.listing.state}
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${status.className}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-t border-slate-100 dark:border-white/10 pt-3">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <IconCalendar className="w-3 h-3" /> Move-in Date
                    </span>
                    <span className="text-slate-900 dark:text-white font-semibold">{moveIn}</span>

                    <span className="text-slate-500 dark:text-slate-400">Monthly Rent</span>
                    <span className="text-slate-900 dark:text-white">
                      ${booking.listing.pricePerMonth}<span className="text-slate-400 font-normal">/mo</span>{" "}
                      <span className="text-[10px] text-slate-400 font-normal">(at property)</span>
                    </span>

                    <span className="text-slate-500 dark:text-slate-400">Security Deposit</span>
                    <span className="text-slate-900 dark:text-white">
                      ${Number(booking.depositAmount).toFixed(2)}
                      {depositPaid && <span className="text-emerald-600 dark:text-emerald-400 ml-1">· paid {depositPaid}</span>}
                    </span>
                  </div>

                  {/* CTA row */}
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {booking.monthlyStatus === "RESERVED" && (
                      <Link
                        href={`/booking/${booking.id}/deposit`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all shadow-md shadow-emerald-600/20"
                      >
                        Pay Security Deposit <IconArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    {booking.monthlyStatus === "DEPOSIT_PAID" && (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <IconCheck className="w-3.5 h-3.5" /> Deposit Paid — You&apos;re all set!
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
