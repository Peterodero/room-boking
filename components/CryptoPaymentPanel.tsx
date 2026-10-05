"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  IconCrypto,
  IconCopy,
  IconCheck,
  IconSpinner,
  IconAlertCircle,
  IconShieldCheck,
  IconLock,
} from "./Icons";

type Provider = "nowpayments" | "oxapay";

interface CryptoPaymentPanelProps {
  bookingId: string;
  amountUsd: number | string;
  paymentType: "FULL" | "DEPOSIT" | "BOOKING_FEE";
  onSuccess: () => void;
}

interface CryptoInvoiceData {
  provider: Provider;
  paymentId: string;
  payAddress: string;
  payAmountUsdt: number;
  qrCodeUrl?: string;
  payLink?: string;
  currency: string;
  network: string;
  isSimulation?: boolean;
}

export default function CryptoPaymentPanel({
  bookingId,
  amountUsd,
  paymentType,
  onSuccess,
}: CryptoPaymentPanelProps) {
  const router = useRouter();
  const [provider, setProvider] = useState<Provider>("nowpayments");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [invoice, setInvoice] = useState<CryptoInvoiceData | null>(null);
  const [copied, setCopied] = useState(false);
  const [polling, setPolling] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // Poll status every 4s once invoice is created
  useEffect(() => {
    if (!invoice) return;

    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/payments/crypto/status/${bookingId}?paymentType=${paymentType}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.isPaid) {
            clearInterval(interval);
            setPolling(false);
            onSuccess();
          }
        }
      } catch (e) {
        console.warn("Crypto status poll error:", e);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [invoice, bookingId, paymentType, onSuccess]);

  const handleCreateInvoice = async () => {
    setLoading(true);
    setError(null);
    setAuthError(false);
    try {
      const endpoint =
        provider === "nowpayments"
          ? "/api/payments/crypto/nowpayments"
          : "/api/payments/crypto/oxapay";

      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ bookingId, paymentType }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || data.code === "UNAUTHORIZED") {
          setAuthError(true);
          throw new Error("You must be logged in to generate a payment address.");
        }
        throw new Error(data.error || "Failed to initialize crypto invoice");
      }

      setInvoice({
        provider: data.provider || provider,
        paymentId: data.trackId || data.paymentId || data.paymentRecordId,
        payAddress: data.payAddress,
        payAmountUsdt: data.payAmountUsdt || data.payAmount || Number(amountUsd),
        payLink: data.payLink,
        qrCodeUrl:
          data.qrCodeUrl ||
          `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
            data.payLink || data.payAddress
          )}&size=200x200`,
        currency: "USDT",
        network: "TRON (TRC20)",
        isSimulation: data.isSimulation ?? false,
      });
    } catch (err: any) {
      setError(err.message || "Failed to create crypto invoice.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAddress = () => {
    if (!invoice?.payAddress) return;
    navigator.clipboard.writeText(invoice.payAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateWebhook = async () => {
    if (!invoice) return;
    setSimulating(true);
    try {
      const endpoint =
        invoice.provider === "nowpayments"
          ? "/api/payments/crypto/nowpayments/webhook"
          : "/api/payments/crypto/oxapay/webhook";

      const body =
        invoice.provider === "nowpayments"
          ? {
              payment_id: invoice.paymentId,
              payment_status: "finished",
              order_id: bookingId,
              pay_address: invoice.payAddress,
              price_amount: Number(amountUsd),
              actually_paid: invoice.payAmountUsdt,
            }
          : {
              trackId: invoice.paymentId,
              status: "Paid",
              orderId: bookingId,
              address: invoice.payAddress,
              amount: invoice.payAmountUsdt,
            };

      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      console.error("Simulation error:", err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Provider Selector */}
      {!invoice && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <IconCrypto className="w-5 h-5 text-amber-500" />
              <span>Pay with Crypto</span>
            </h3>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              USDT TRC20
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Choose your preferred gateway to pay with <strong>USDT on TRON (TRC20)</strong>. Fast transactions with minimal network fees.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setProvider("nowpayments")}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                provider === "nowpayments"
                  ? "bg-amber-500/10 border-amber-500 text-slate-900 dark:text-white shadow-md"
                  : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <IconCrypto className="w-4 h-4 text-amber-500" />
                <span>NOWPayments</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                USDT (TRC20), BTC, ETH
              </p>
            </button>

            <button
              type="button"
              onClick={() => setProvider("oxapay")}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                provider === "oxapay"
                  ? "bg-amber-500/10 border-amber-500 text-slate-900 dark:text-white shadow-md"
                  : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <IconShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>OxaPay</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                USDT (TRC20), Low fees
              </p>
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs space-y-2">
              <div className="flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              {authError && (
                <button
                  type="button"
                  onClick={() => router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-all"
                >
                  Log In to Continue Payment →
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleCreateInvoice}
            disabled={loading}
            className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all transform active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <IconSpinner className="w-4 h-4" />
                <span>Generating Deposit Address…</span>
              </>
            ) : (
              <>
                <IconCrypto className="w-4 h-4" />
                <span>Pay ${Number(amountUsd).toFixed(2)} in USDT (TRC20)</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Invoice Display */}
      {invoice && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-950 border border-amber-500/30 space-y-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">
                Gateway: {invoice.provider.toUpperCase()}
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Send Exact Amount to Address
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setInvoice(null)}
              className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
            >
              Change Gateway
            </button>
          </div>

          {/* Amount Box */}
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
            <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
              Amount to Send
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {invoice.payAmountUsdt.toFixed(2)} USDT
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">
              Network: TRON (TRC20)
            </span>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="p-3 bg-white rounded-2xl shadow-xl border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={invoice.qrCodeUrl}
                alt="USDT TRC20 QR Code"
                className="w-44 h-44 object-contain rounded-lg"
              />
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Scan with your crypto wallet (Trust Wallet, Binance, etc.)
            </span>
          </div>

          {invoice.payLink && (
            <a
              href={invoice.payLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl text-center shadow-lg shadow-amber-500/20 transition-all"
            >
              Open OxaPay Payment Gateway Portal ↗
            </a>
          )}

          {/* Wallet Address Box with Copy Button */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              TRC20 Payment Address
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={invoice.payAddress}
                className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-mono select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyAddress}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5"
              >
                {copied ? (
                  <>
                    <IconCheck className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <IconCopy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Polling Indicator */}
          <div className="flex items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300">
            <IconSpinner className="w-4 h-4 text-amber-500" />
            <span>Waiting for blockchain confirmation… (Auto-detecting)</span>
          </div>

          {/* Dev Simulation Mode Banner & Action Button */}
          {invoice.isSimulation && (
            <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2 text-center">
              <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                🧪 Dev / Sandbox Mode Active (Placeholder API Keys)
              </div>
              <button
                type="button"
                onClick={handleSimulateWebhook}
                disabled={simulating}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {simulating ? (
                  <>
                    <IconSpinner className="w-4 h-4" />
                    <span>Simulating Webhook Confirmation…</span>
                  </>
                ) : (
                  <>
                    <IconCheck className="w-4 h-4" />
                    <span>Simulate Instant Webhook Payment</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
