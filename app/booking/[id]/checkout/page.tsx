"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../../lib/api";
import CryptoPaymentPanel from "../../../../components/CryptoPaymentPanel";
import {
  IconCreditCard,
  IconCashApp,
  IconCrypto,
  IconShieldCheck,
  IconAlertCircle,
  IconLock,
  IconSpinner,
  IconHome,
  IconCalendar,
  IconUsers,
  IconCheck,
} from "../../../../components/Icons";

declare global {
  interface Window { Square?: any; }
}

type PaymentTab = "card" | "cashapp" | "crypto";

type Booking = {
  id: string;
  status: string;
  totalPrice: string;
  bookingFee: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  holdExpiresAt?: string | null;
  listing: { title: string; city: string; state: string; photos?: string[] };
};

const isSandboxCredentials = () => {
  const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID ?? "";
  return appId.includes("xxxx") || appId.startsWith("sandbox-sq0idb-xxxx");
};

const squareSdkUrl = () => {
  const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID ?? "";
  return appId.startsWith("sandbox-")
    ? "https://sandbox.web.squarecdn.com/v1/square.js"
    : "https://web.squarecdn.com/v1/square.js";
};

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const cardContainerRef = useRef<HTMLDivElement>(null);
  const cashAppRef = useRef<HTMLDivElement>(null);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [paying, setPaying] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<PaymentTab>("card");

  const [cardAttached, setCardAttached] = useState(false);
  const [cashAppAttached, setCashAppAttached] = useState(false);
  const cardInstanceRef = useRef<any>(null);
  const cashAppInstanceRef = useRef<any>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const fetchBooking = useCallback(async () => {
    setError(null);
    setAuthRequired(false);
    try {
      const data = await api.get(`/bookings/${id}`);
      setBooking(data);
      if (data.holdExpiresAt) {
        const diff = Math.max(0, Math.floor((new Date(data.holdExpiresAt).getTime() - Date.now()) / 1000));
        setTimeLeft(diff);
      } else {
        setTimeLeft(15 * 60);
      }
    } catch (e: any) {
      if (e.message?.includes("Unauthorized") || e.message?.includes("401")) {
        setAuthRequired(true);
      } else {
        setError(e.message || "Failed to load reservation details");
      }
    }
  }, [id]);

  useEffect(() => { fetchBooking(); }, [fetchBooking]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev === null || prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setError(null);
    try {
      const res = await api.post("/auth/login", { username: loginEmail, email: loginEmail, password: loginPassword });
      if (res.token) {
        localStorage.setItem("token", res.token);
        if (res.user) localStorage.setItem("user", JSON.stringify(res.user));
        await fetchBooking();
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Check your credentials.");
    } finally {
      setLoggingIn(false);
    }
  };

  useEffect(() => {
    if (window.Square) { setSdkReady(true); return; }
    const script = document.createElement("script");
    script.src = squareSdkUrl();
    script.onload = () => setSdkReady(true);
    script.onerror = () => setSdkReady(false);
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    if (!sdkReady || !booking || !cardContainerRef.current) return;
    if (isSandboxCredentials()) return;
    let card: any;
    (async () => {
      try {
        const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID!;
        const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID!;
        const payments = window.Square.payments(appId, locationId);
        card = await payments.card({
          style: {
            ".input-container": { borderColor: "#334155", borderRadius: "12px" },
            ".input-container.is-focus": { borderColor: "#6366f1" },
            input: { color: "#f1f5f9", fontSize: "15px" },
            "input::placeholder": { color: "#64748b" },
          },
        });
        await card.attach(cardContainerRef.current);
        cardInstanceRef.current = card;
        setCardAttached(true);
      } catch (err) {
        console.warn("Square card attach error:", err);
      }
    })();
    return () => { card?.destroy?.(); cardInstanceRef.current = null; };
  }, [sdkReady, booking]);

  useEffect(() => {
    if (!sdkReady || !booking || !cashAppRef.current) return;
    if (isSandboxCredentials()) return;
    const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID;
    const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
    if (!appId || !locationId) return;
    let cashApp: any;
    (async () => {
      try {
        const payments = window.Square.payments(appId, locationId);
        const paymentRequest = payments.paymentRequest({
          countryCode: "US",
          currencyCode: "USD",
          total: { amount: Number(booking.bookingFee).toFixed(2), label: "Booking hold fee" },
        });
        cashApp = await payments.cashAppPay(paymentRequest, {
          redirectURL: window.location.href,
          referenceId: booking.id,
        });
        cashApp.addEventListener("ontokenization", async (event: any) => {
          const { tokenResult } = event.detail;
          if (tokenResult.status !== "OK") { setError(`Cash App token error: ${tokenResult.status.toLowerCase()}`); return; }
          await processPayment(tokenResult.token);
        });
        await cashApp.attach(cashAppRef.current);
        cashAppInstanceRef.current = cashApp;
        setCashAppAttached(true);
      } catch (err) {
        console.warn("Square Cash App attach error:", err);
      }
    })();
    return () => { cashApp?.destroy?.(); cashAppInstanceRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady, booking]);

  const processPayment = async (sourceId: string) => {
    setPaying(true);
    setError(null);
    try {
      await api.post("/payments/booking-fee", { bookingId: booking!.id, sourceId });
      router.push(`/booking/${booking!.id}/confirmation`);
    } catch (e: any) {
      setError(e.message || "Payment processing failed. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  const handleCardPay = async () => {
    if (isSandboxCredentials() || !cardInstanceRef.current) {
      await processPayment(`card-sandbox-token-${Date.now()}`);
      return;
    }
    setPaying(true);
    setError(null);
    try {
      const result = await cardInstanceRef.current.tokenize();
      if (result.status !== "OK") {
        setError(result.errors?.map((e: any) => e.message).join(". ") || "Card tokenization failed.");
        setPaying(false);
        return;
      }
      await processPayment(result.token);
    } catch (err: any) {
      setError(err.message || "Failed to process card payment.");
      setPaying(false);
    }
  };

  const handleSimulatedCashAppPay = async () => {
    await processPayment(`cashapp-sandbox-token-${Date.now()}`);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
  };

  // ── AUTH WALL ─────────────────────────────────────────────────────────────
  if (authRequired) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-600/10 border border-brand-500/30 flex items-center justify-center">
          <IconLock className="w-8 h-8 text-brand-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">Log In to Complete Payment</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">You need to be logged in to pay your booking hold fee.</p>
        </div>
        <form onSubmit={handleAuthSubmit} className="glass-panel p-6 rounded-2xl space-y-4 text-left">
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
              className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loggingIn}
            className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loggingIn ? <><IconSpinner className="w-4 h-4" /><span>Logging in…</span></> : "Log In & Continue to Payment"}
          </button>
        </form>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <IconAlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Something went wrong</h2>
        <p className="text-rose-500 text-sm">{error}</p>
        <Link href="/" className="inline-block px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 font-medium">
          Return to Listings
        </Link>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 animate-pulse space-y-6">
        <div className="h-10 bg-slate-200 dark:bg-slate-900 rounded-lg w-1/3" />
        <div className="h-64 bg-slate-200 dark:bg-slate-900 rounded-2xl" />
      </div>
    );
  }

  if (booking.status !== "PENDING") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <IconCheck className="w-14 h-14 text-emerald-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Booking Status: {booking.status}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          This reservation is currently <strong className="text-slate-900 dark:text-white">{booking.status}</strong>.
        </p>
        <Link href="/" className="inline-block px-4 py-2 bg-brand-600 rounded-lg text-sm text-white font-medium">
          Browse Available Rooms
        </Link>
      </div>
    );
  }

  const isDevMode = isSandboxCredentials();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {/* Timer Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-brand-50 to-slate-50 dark:from-brand-950/60 dark:to-slate-900 border border-brand-200 dark:border-brand-500/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
            <IconHome className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider">Room Hold Reserved</span>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Confirm Booking Hold Fee</h1>
          </div>
        </div>
        {timeLeft !== null && (
          <div className="flex items-center gap-3 bg-white dark:bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
            <span className="text-xs text-slate-500">Hold Expires In:</span>
            <span className={`text-base font-mono font-bold ${timeLeft < 180 ? "text-rose-500 animate-pulse" : "text-emerald-600 dark:text-emerald-400"}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Left: Reservation Summary */}
        <div className="glass-panel rounded-2xl p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="border-b border-slate-200 dark:border-white/10 pb-4">
              <span className="text-xs text-brand-600 dark:text-brand-400 font-semibold uppercase tracking-wider">Reservation Summary</span>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{booking.listing.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <IconCalendar className="w-3.5 h-3.5" />
                {booking.listing.city}, {booking.listing.state}, USA
              </p>
            </div>

            <div className="space-y-2.5 text-sm">
              {[
                ["Check-in", new Date(booking.checkIn).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })],
                ["Check-out", new Date(booking.checkOut).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })],
                ["Guests", `${booking.guestCount} Guest(s)`],
                ["Total Stay (at property)", `$${Number(booking.totalPrice).toFixed(2)}`],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                  <span className="text-slate-500 dark:text-slate-400">{label}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30 flex items-center justify-between mt-4">
            <div>
              <p className="text-xs text-brand-700 dark:text-brand-300 font-medium">Booking Hold Fee Due Now</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">${Number(booking.bookingFee).toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
              <IconCreditCard className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
          </div>
        </div>

        {/* Right: Payment Panel */}
        <div className="glass-panel rounded-2xl p-6 space-y-5 flex flex-col">

          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-950/60">
            {([
              { key: "card", label: "Card", Icon: IconCreditCard, active: "bg-indigo-600" },
              { key: "cashapp", label: "Cash App", Icon: IconCashApp, active: "bg-emerald-600" },
              { key: "crypto", label: "Crypto", Icon: IconCrypto, active: "bg-amber-600" },
            ] as const).map(({ key, label, Icon, active }) => (
              <button
                key={key}
                id={`tab-${key}`}
                onClick={() => setActiveTab(key)}
                className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === key ? `${active} text-white shadow-inner` : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* ── CARD TAB */}
          <div className={`space-y-4 ${activeTab === "card" ? "" : "invisible h-0 overflow-hidden pointer-events-none"}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <IconCreditCard className="w-4 h-4 text-indigo-500" /> Debit / Credit Card
              </h3>
              <div className="flex gap-1.5">
                {["VISA", "MC", "AMEX"].map((b) => (
                  <span key={b} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{b}</span>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pay securely with Visa, Mastercard, or Amex. Card details are encrypted and never stored on our servers.
            </p>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/90 border border-indigo-200 dark:border-indigo-500/30 space-y-4">
              {isDevMode ? (
                <div className="space-y-3">
                  <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                    <span className="font-bold">Sandbox mode.</span>
                    <span>Test card <code className="font-mono">4111 1111 1111 1111</code>, expiry <code>12/26</code>, CVV <code>111</code>.</span>
                  </div>
                  <input readOnly defaultValue="4111 1111 1111 1111" className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-mono tracking-widest" />
                  <div className="grid grid-cols-2 gap-3">
                    <input readOnly defaultValue="12 / 26" className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-mono" />
                    <input readOnly defaultValue="111" className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-mono" />
                  </div>
                </div>
              ) : (
                <>
                  {!cardAttached && (
                    <div className="text-center py-4 flex flex-col items-center gap-2">
                      <IconSpinner className="w-5 h-5 text-indigo-500" />
                      <p className="text-xs text-slate-400">Loading secure card form…</p>
                    </div>
                  )}
                  <div ref={cardContainerRef} id="card-container" className={cardAttached ? "block" : "hidden"} />
                </>
              )}
            </div>

            <button
              id="btn-pay-card"
              type="button"
              onClick={handleCardPay}
              disabled={paying || (!isDevMode && !cardAttached)}
              className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {paying && activeTab === "card" ? (
                <><IconSpinner className="w-4 h-4" /><span>Processing Payment…</span></>
              ) : (
                <><IconCreditCard className="w-4 h-4" /><span>Pay ${Number(booking.bookingFee).toFixed(2)} with Card</span></>
              )}
            </button>
          </div>

          {/* ── CASH APP TAB */}
          <div className={`space-y-4 ${activeTab === "cashapp" ? "" : "invisible h-0 overflow-hidden pointer-events-none"}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <IconCashApp className="w-4 h-4 text-emerald-500" /> Cash App Pay
              </h3>
              <span className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">Square SDK</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-300">
              Complete your hold instantly using Cash App. Scan the QR or tap the button below.
            </p>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/90 border border-emerald-200 dark:border-emerald-500/30 flex flex-col items-center gap-4">
              <div ref={cashAppRef} id="cash-app-pay" className="w-full text-center" />
              {(!cashAppAttached || isDevMode) && (
                <div className="w-full space-y-3 text-center">
                  <div className="w-28 h-28 mx-auto bg-white dark:bg-emerald-900 p-2 rounded-xl shadow-lg border border-emerald-200 flex items-center justify-center">
                    <div className="w-full h-full bg-emerald-600 rounded-lg flex flex-col items-center justify-center text-white font-bold text-xs space-y-1">
                      <IconCashApp className="w-8 h-8" />
                      <span>$cashtag</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pay <strong className="text-slate-900 dark:text-white">${Number(booking.bookingFee).toFixed(2)}</strong> via Cash App tag{" "}
                    <strong className="text-emerald-600 dark:text-emerald-400">$USRoomStaysHold</strong>
                  </p>
                  <button
                    id="btn-pay-cashapp"
                    type="button"
                    onClick={handleSimulatedCashAppPay}
                    disabled={paying}
                    className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {paying && activeTab === "cashapp" ? (
                      <><IconSpinner className="w-4 h-4" /><span>Authorizing Cash App…</span></>
                    ) : (
                      <><IconCashApp className="w-4 h-4" /><span>Pay with Cash App ($cashtag)</span></>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── CRYPTO TAB */}
          <div className={`space-y-4 ${activeTab === "crypto" ? "" : "invisible h-0 overflow-hidden pointer-events-none"}`}>
            <CryptoPaymentPanel
              bookingId={booking.id}
              amountUsd={booking.bookingFee}
              paymentType="BOOKING_FEE"
              onSuccess={() => router.push(`/booking/${booking.id}/confirmation`)}
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <IconAlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {paying && (
            <div className="w-full p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300 text-xs text-center font-semibold animate-pulse">
              Processing payment & locking reservation…
            </div>
          )}

          {/* Footer trust badges */}
          <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-1.5 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
              <IconShieldCheck className="w-4 h-4 text-indigo-500" />
              <span>256-bit Encrypted · Powered by Square + NOWPayments / OxaPay</span>
            </div>
            <p>Upon successful payment, your dates will be locked as <strong>CONFIRMED</strong> in our system.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
