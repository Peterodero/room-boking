"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../../lib/api";

declare global {
  interface Window {
    Square?: any;
  }
}

type Booking = {
  id: string;
  status: string;
  totalPrice: string;
  bookingFee: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  listing: { title: string; city: string; state: string };
};

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const cashAppRef = useRef<HTMLDivElement>(null);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  // Load booking details
  useEffect(() => {
    api
      .get(`/bookings/${id}`)
      .then(setBooking)
      .catch((e) => setError(e.message));
  }, [id]);

  // Load the Square Web Payments SDK script once
  useEffect(() => {
    if (window.Square) {
      setSdkReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sandbox.web.squarecdn.com/v1/square.js";
    script.onload = () => setSdkReady(true);
    script.onerror = () => setError("Could not load the Square Cash App payment SDK");
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Attach Square Cash App Pay button once SDK ready & booking loaded
  useEffect(() => {
    if (!sdkReady || !booking || !cashAppRef.current) return;

    let cashAppPayInstance: any;

    async function attach() {
      try {
        const payments = window.Square.payments(
          process.env.NEXT_PUBLIC_SQUARE_APP_ID || "sandbox-sq0idp-dummy",
          process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || "main"
        );

        const paymentRequest = payments.paymentRequest({
          countryCode: "US",
          currencyCode: "USD",
          total: {
            amount: Number(booking!.bookingFee).toFixed(2),
            label: "Booking hold fee",
          },
        });

        cashAppPayInstance = await payments.cashAppPay(paymentRequest, {
          redirectURL: window.location.href,
          referenceId: booking!.id,
        });

        cashAppPayInstance.addEventListener("ontokenization", async (event: any) => {
          const { tokenResult } = event.detail;
          if (tokenResult.status !== "OK") {
            setError(`Payment tokenization state: ${tokenResult.status.toLowerCase()}`);
            return;
          }
          setPaying(true);
          try {
            await api.post("/payments/booking-fee", {
              bookingId: booking!.id,
              sourceId: tokenResult.token,
            });
            router.push(`/booking/${booking!.id}/confirmation`);
          } catch (e: any) {
            setError(e.message || "Payment processing failed");
          } finally {
            setPaying(false);
          }
        });

        await cashAppPayInstance.attach(cashAppRef.current);
      } catch (err: any) {
        console.warn("Square Cash App attach note:", err);
      }
    }

    attach();
    return () => {
      cashAppPayInstance?.destroy?.();
    };
  }, [sdkReady, booking, router]);

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-xl font-bold text-white">Payment Hold Error</h2>
        <p className="text-rose-400 text-sm">{error}</p>
        <Link href="/" className="inline-block px-4 py-2 bg-slate-800 rounded-lg text-sm text-slate-200">
          Return to Room Listings
        </Link>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 animate-pulse space-y-6">
        <div className="h-10 bg-slate-900 rounded-lg w-1/3" />
        <div className="h-64 bg-slate-900 rounded-2xl" />
      </div>
    );
  }

  if (booking.status !== "PENDING") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-4xl">⏱️</div>
        <h2 className="text-xl font-bold text-white">Booking Hold {booking.status}</h2>
        <p className="text-slate-400 text-sm">
          This room reservation hold is currently status <strong>{booking.status}</strong> and cannot be paid for again.
        </p>
        <Link href="/" className="inline-block px-4 py-2 bg-brand-600 rounded-lg text-sm text-white font-medium">
          Browse Available Rooms
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          ⏱️ 15-Minute Live Reservation Hold Placed
        </span>
        <h1 className="text-3xl font-extrabold font-heading text-white mt-2">Confirm Room & Pay Booking Fee</h1>
        <p className="text-sm text-slate-400">Complete payment via Cash App Pay to confirm reservation dates.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Reservation Summary */}
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <div className="border-b border-white/10 pb-4">
            <span className="text-xs text-brand-400 font-semibold uppercase tracking-wider">Reservation Summary</span>
            <h3 className="text-xl font-bold text-white mt-1">{booking.listing.title}</h3>
            <p className="text-xs text-slate-400">📍 {booking.listing.city}, {booking.listing.state}, USA</p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Check-in</span>
              <span className="font-semibold text-white">{new Date(booking.checkIn).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Check-out</span>
              <span className="font-semibold text-white">{new Date(booking.checkOut).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Guests</span>
              <span className="font-semibold text-white">{booking.guestCount} Guest(s)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Total Stay Price (host payment)</span>
              <span className="font-semibold text-slate-200">${Number(booking.totalPrice).toFixed(2)}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-between">
            <div>
              <p className="text-xs text-brand-300 font-medium">Booking Hold Fee Due Now</p>
              <p className="text-2xl font-extrabold text-white">${Number(booking.bookingFee).toFixed(2)}</p>
            </div>
            <span className="text-2xl">🟩</span>
          </div>
        </div>

        {/* Right Column: Square Cash App Pay */}
        <div className="glass-panel rounded-2xl p-6 space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-white mb-2">
              <span>💳</span> Cash App Pay (Square SDK)
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Scan or tap below using Cash App on your mobile device to complete payment instantly.
            </p>

            {/* Container for Square Cash App Pay Widget */}
            <div className="mt-6 p-4 rounded-xl bg-slate-950/80 border border-white/10 flex flex-col items-center justify-center min-h-[140px]">
              <div ref={cashAppRef} id="cash-app-pay" className="w-full text-center" />

              {!sdkReady && (
                <div className="text-xs text-slate-500 animate-pulse">Initializing Cash App SDK...</div>
              )}
            </div>

            {paying && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center font-medium animate-pulse">
                ⏳ Processing Cash App payment & confirming reservation...
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/10 space-y-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span>🔒</span> 256-bit Encrypted Square Payments API
            </div>
            <p>Once paid, your reservation dates are permanently locked in status <strong>CONFIRMED</strong>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
