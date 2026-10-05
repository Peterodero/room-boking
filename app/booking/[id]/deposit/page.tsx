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
  IconCalendar,
  IconCheck,
  IconCheckCircle,
  IconArrowRight,
} from "../../../../components/Icons";

declare global {
  interface Window { Square?: any; }
}

type PaymentTab = "card" | "cashapp" | "crypto";

type Booking = {
  id: string;
  monthlyStatus?: "RESERVED" | "DEPOSIT_PAID" | "CANCELLED" | null;
  saleStatus?: "RESERVED" | "DEPOSIT_PAID" | "BUY_OUTRIGHT" | "CANCELLED" | null;
  moveInDate?: string | null;
  depositAmount: string;
  createdAt: string;
  listing: {
    id: string;
    title: string;
    city: string;
    state: string;
    pricePerMonth?: string | null;
    salePrice?: string | null;
    plotSize?: string | null;
    listingType?: "NIGHTLY" | "MONTHLY" | "PLOT_SALE";
    photos: string[];
    host: { name: string };
  };
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

export default function DepositPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const cardContainerRef = useRef<HTMLDivElement>(null);
  const cashAppRef = useRef<HTMLDivElement>(null);
  const cardInstanceRef = useRef<any>(null);
  const cashAppInstanceRef = useRef<any>(null);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [paying, setPaying] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [cardAttached, setCardAttached] = useState(false);
  const [cashAppAttached, setCashAppAttached] = useState(false);
  const [activeTab, setActiveTab] = useState<PaymentTab>("card");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const fetchBooking = useCallback(async () => {
    setError(null);
    setAuthRequired(false);
    try {
      const data = await api.get(`/bookings/${id}`);
      setBooking(data);
    } catch (e: any) {
      if (e.message?.includes("Unauthorized") || e.message?.includes("401")) {
        setAuthRequired(true);
      } else {
        setError(e.message || "Failed to load booking details");
      }
    }
  }, [id]);

  useEffect(() => { fetchBooking(); }, [fetchBooking]);

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
      } catch (err) { console.warn("Square card attach error:", err); }
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
          total: { amount: Number(booking.depositAmount).toFixed(2), label: "Deposit" },
        });
        cashApp = await payments.cashAppPay(paymentRequest, {
          redirectURL: window.location.href,
          referenceId: booking.id,
        });
        cashApp.addEventListener("ontokenization", async (event: any) => {
          const { tokenResult } = event.detail;
          if (tokenResult.status !== "OK") { setError(`Cash App error: ${tokenResult.status.toLowerCase()}`); return; }
          await processDepositPayment(tokenResult.token);
        });
        await cashApp.attach(cashAppRef.current);
        cashAppInstanceRef.current = cashApp;
        setCashAppAttached(true);
      } catch (err) { console.warn("Cash App attach error:", err); }
    })();
    return () => { cashApp?.destroy?.(); cashAppInstanceRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady, booking]);

  const processDepositPayment = useCallback(async (sourceId: string) => {
    setPaying(true);
    setError(null);
    try {
      await api.post(`/bookings/${id}/pay-deposit`, { sourceId });
      setConfirmed(true);
    } catch (e: any) {
      setError(e.message || "Deposit payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  }, [id]);

  const handleCardPay = async () => {
    if (isSandboxCredentials() || !cardInstanceRef.current) {
      await processDepositPayment(`card-sandbox-deposit-${Date.now()}`);
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
      await processDepositPayment(result.token);
    } catch (err: any) {
      setError(err.message || "Failed to process card payment.");
      setPaying(false);
    }
  };

  const handleSimulatedCashApp = async () => {
    await processDepositPayment(`cashapp-sandbox-deposit-${Date.now()}`);
  };

  // ── AUTH WALL ─────────────────────────────────────────────────────────────
  if (authRequired) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-600/10 border border-violet-500/30 flex items-center justify-center">
          <IconLock className="w-8 h-8 text-violet-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">Log In to Pay Deposit</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">You need to be logged in to pay your deposit.</p>
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
            {loggingIn ? <><IconSpinner className="w-4 h-4" /><span>Logging in…</span></> : "Log In & Continue to Deposit"}
          </button>
        </form>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <IconAlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <p className="text-rose-600 dark:text-rose-400 font-semibold">{error}</p>
        <Link href="/" className="inline-block px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200">
          ← Back to Listings
        </Link>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 dark:bg-slate-900 rounded-lg w-1/2" />
        <div className="h-48 bg-slate-200 dark:bg-slate-900 rounded-2xl" />
      </div>
    );
  }

  const isPlotSale = booking.listing?.listingType === "PLOT_SALE";
  const isConfirmed = confirmed || booking.monthlyStatus === "DEPOSIT_PAID" || booking.saleStatus === "DEPOSIT_PAID";
  const moveIn = booking.moveInDate ? new Date(booking.moveInDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : null;
  const depositAmt = Number(booking.depositAmount).toFixed(2);
  const photo = booking.listing.photos?.[0];
  const isDevMode = isSandboxCredentials();

  // ── CONFIRMATION SCREEN ────────────────────────────────────────────────────
  if (isConfirmed) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          <IconCheckCircle className="w-10 h-10 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
          {isPlotSale ? "Down Payment Confirmed!" : "Security Deposit Confirmed!"}
        </h1>
        {isPlotSale ? (
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            Your down payment of{" "}
            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">${depositAmt}</span>{" "}
            has been processed for land purchase. The seller will be notified to begin contract finalization.
          </p>
        ) : (
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            Your security deposit of{" "}
            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">${depositAmt}</span>{" "}
            has been processed. Move in on <span className="text-slate-900 dark:text-white font-bold">{moveIn}</span>.
          </p>
        )}

        <div className="glass-panel p-5 text-left space-y-3 text-sm rounded-2xl">
          {[
            ["Property", booking.listing.title],
            ["Location", `${booking.listing.city}, ${booking.listing.state}`],
            ...(isPlotSale ? [
              ["Plot Size", `${booking.listing.plotSize || "N/A"} sq ft`],
              ["Total Sale Price", `$${booking.listing.salePrice || "0"}`],
              ["Down Payment Paid", `$${depositAmt}`],
            ] : [
              ["Move-in Date", moveIn || "N/A"],
              ["Monthly Rent", `$${booking.listing.pricePerMonth || "0"}/mo`],
              ["Security Deposit Paid", `$${depositAmt}`],
            ]),
          ].map(([label, val]) => (
            <div key={label as string} className="flex justify-between border-b border-slate-100 dark:border-white/10 pb-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium">{label}</span>
              <span className="text-slate-900 dark:text-white font-bold">{val}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/my-rentals"
            className="block w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-sm text-white text-center shadow-lg shadow-violet-600/30 transition-all flex items-center justify-center gap-2"
          >
            View My Rentals / Purchases <IconArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/" className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:underline">
            ← Browse More Listings
          </Link>
        </div>
      </div>
    );
  }

  // ── DEPOSIT PAYMENT SCREEN ─────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href={`/listings/${booking.listing.id}`} className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1">
          <IconArrowRight className="w-3 h-3 rotate-180" /> Back to Listing
        </Link>
        <h1 className="text-3xl font-extrabold font-heading text-slate-900 dark:text-white mt-1">
          {isPlotSale ? "Pay Down Payment" : "Pay Security Deposit"}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {isPlotSale ? "Pay deposit to secure land purchase contract." : "Confirm your monthly room rental — lock in your lease."}
        </p>
      </div>

      {/* Listing photo */}
      {photo && (
        <div className="relative rounded-2xl overflow-hidden h-44 shadow-lg border border-slate-200 dark:border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt={booking.listing.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="text-white font-bold text-lg">{booking.listing.title}</div>
            <div className="text-slate-200 text-xs flex items-center gap-1">
              <IconCalendar className="w-3 h-3" />
              {booking.listing.city}, {booking.listing.state}
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="glass-panel rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {isPlotSale ? "Purchase & Deposit Summary" : "Lease Summary"}
        </h3>
        <div className="space-y-2 text-sm">
          {isPlotSale ? (
            <>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span className="font-medium">Plot Size</span>
                <span className="text-slate-900 dark:text-white font-bold">{booking.listing.plotSize ? `${booking.listing.plotSize} sq ft` : "N/A"}</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span className="font-medium">Total Sale Price</span>
                <span className="text-slate-900 dark:text-white font-semibold">${booking.listing.salePrice || "0"}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-slate-900 dark:text-white pt-3 border-t border-slate-100 dark:border-white/10">
                <span>Down Payment Due Now</span>
                <span className="text-emerald-600 dark:text-emerald-400 text-xl font-extrabold">${depositAmt}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span className="font-medium flex items-center gap-1.5"><IconCalendar className="w-3.5 h-3.5" />Move-in Date</span>
                <span className="text-slate-900 dark:text-white font-bold">{moveIn || "N/A"}</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span className="font-medium">Monthly Rent</span>
                <span className="text-slate-900 dark:text-white font-semibold">
                  ${booking.listing.pricePerMonth}<span className="text-slate-400 text-xs font-normal">/mo</span>{" "}
                  <span className="text-xs text-slate-400 font-normal">(at property)</span>
                </span>
              </div>
              <div className="flex justify-between font-bold text-base text-slate-900 dark:text-white pt-3 border-t border-slate-100 dark:border-white/10">
                <span>Security Deposit Due Now</span>
                <span className="text-emerald-600 dark:text-emerald-400 text-xl font-extrabold">${depositAmt}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment Panel */}
      <div className="glass-panel rounded-2xl p-6 space-y-5">

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-950/60">
          {([
            { key: "card", label: "Card", Icon: IconCreditCard, active: "bg-indigo-600" },
            { key: "cashapp", label: "Cash App", Icon: IconCashApp, active: "bg-emerald-600" },
            { key: "crypto", label: "Crypto", Icon: IconCrypto, active: "bg-amber-600" },
          ] as const).map(({ key, label, Icon, active }) => (
            <button
              key={key}
              id={`deposit-tab-${key}`}
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

        {/* CARD TAB */}
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

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/90 border border-indigo-200 dark:border-indigo-500/30 space-y-4">
            {isDevMode ? (
              <div className="space-y-3">
                <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  <span className="font-bold">Sandbox mode.</span> Test card <code className="font-mono">4111 1111 1111 1111</code>, expiry <code>12/26</code>, CVV <code>111</code>.
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
            id="btn-deposit-pay-card"
            type="button"
            onClick={handleCardPay}
            disabled={paying || (!isDevMode && !cardAttached)}
            className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {paying && activeTab === "card" ? (
              <><IconSpinner className="w-4 h-4" /><span>Processing…</span></>
            ) : (
              <><IconCreditCard className="w-4 h-4" /><span>Pay ${depositAmt} {isPlotSale ? "Down Payment" : "Security Deposit"}</span></>
            )}
          </button>
        </div>

        {/* CASH APP TAB */}
        <div className={`space-y-4 ${activeTab === "cashapp" ? "" : "invisible h-0 overflow-hidden pointer-events-none"}`}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <IconCashApp className="w-4 h-4 text-emerald-500" /> Cash App Pay
            </h3>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">Square SDK</span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-300">
            Authorize your {isPlotSale ? "down payment" : "deposit"} of <strong className="text-slate-900 dark:text-white">${depositAmt}</strong> directly through Cash App.
          </p>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/90 border border-emerald-200 dark:border-emerald-500/30 flex flex-col items-center gap-4">
            <div ref={cashAppRef} id="cash-app-pay" className="w-full text-center" />
            {(!cashAppAttached || isDevMode) && (
              <div className="w-full space-y-3 text-center">
                <div className="w-24 h-24 mx-auto bg-white dark:bg-emerald-900 p-2 rounded-xl shadow-lg border border-emerald-200 flex items-center justify-center">
                  <div className="w-full h-full bg-emerald-600 rounded-lg flex flex-col items-center justify-center text-white font-bold text-xs space-y-1">
                    <IconCashApp className="w-7 h-7" />
                    <span>$cashtag</span>
                  </div>
                </div>
                <button
                  id="btn-deposit-pay-cashapp"
                  type="button"
                  onClick={handleSimulatedCashApp}
                  disabled={paying}
                  className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {paying && activeTab === "cashapp" ? (
                    <><IconSpinner className="w-4 h-4" /><span>Authorizing…</span></>
                  ) : (
                    <><IconCashApp className="w-4 h-4" /><span>Pay {isPlotSale ? "Down Payment" : "Deposit"} via Cash App</span></>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CRYPTO TAB */}
        <div className={`space-y-4 ${activeTab === "crypto" ? "" : "invisible h-0 overflow-hidden pointer-events-none"}`}>
          <CryptoPaymentPanel
            bookingId={booking.id}
            amountUsd={booking.depositAmount}
            paymentType="DEPOSIT"
            onSuccess={() => setConfirmed(true)}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <IconAlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {paying && (
          <div className="w-full p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300 text-xs text-center font-semibold animate-pulse">
            Processing deposit & confirming transaction…
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 dark:border-white/10 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
            <IconShieldCheck className="w-4 h-4 text-indigo-500" />
            <span>256-bit Encrypted · Powered by Square + Crypto</span>
          </div>
          <p className="mt-1">Your deposit is recorded instantly upon payment authorization.</p>
        </div>
      </div>
    </div>
  );
}
