import crypto from "crypto";

// ─── Shared types ─────────────────────────────────────────────────────────────

export type CryptoInvoice = {
  provider: "nowpayments" | "oxapay";
  /** Internal DB payment record id */
  paymentRecordId: string;
  /** Provider's own tracking id */
  trackId: string;
  /** Wallet address the customer must send to */
  payAddress: string;
  /** Amount in USDT TRC20 the customer must send */
  payAmount: number;
  /** Currency label shown to user */
  payCurrency: string;
  /** ISO timestamp when the invoice expires */
  expiresAt: string;
  /** Optional direct payment URL (NOWPayments hosted page) */
  paymentUrl?: string;
};

// ─── NOWPayments ──────────────────────────────────────────────────────────────

const NP_SANDBOX_BASE = "https://api-sandbox.nowpayments.io/v1";
const NP_PROD_BASE = "https://api.nowpayments.io/v1";

function npBase() {
  return process.env.NOWPAYMENTS_ENVIRONMENT === "production"
    ? NP_PROD_BASE
    : NP_SANDBOX_BASE;
}

/**
 * Creates a NOWPayments payment and returns the pay address + amount.
 * Uses the /payment endpoint (not /invoice) so we get the raw address
 * for inline QR display.
 */
export async function createNowPaymentsInvoice({
  amountUsd,
  orderId,
  callbackUrl,
}: {
  amountUsd: number;
  orderId: string;
  callbackUrl: string;
}): Promise<{
  paymentId: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  expiresAt: string;
  paymentUrl: string;
}> {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;

  // ── Sandbox / placeholder simulation ─────────────────────────────────────
  if (!apiKey || apiKey === "your-nowpayments-api-key") {
    return {
      paymentId: `np_sim_${Math.random().toString(36).slice(2, 11)}`,
      payAddress: "TNPsimAddr1234567890ABCDEF1234567890",
      payAmount: amountUsd, // 1:1 USDT
      payCurrency: "USDTTRC20",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      paymentUrl: "https://sandbox.nowpayments.io/payment/simulated",
    };
  }

  const res = await fetch(`${npBase()}/payment`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      price_amount: amountUsd,
      price_currency: "usd",
      pay_currency: process.env.NOWPAYMENTS_PAY_CURRENCY ?? "usdttrc20",
      ipn_callback_url: callbackUrl,
      order_id: orderId,
      order_description: "Room booking fee",
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`NOWPayments API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  return {
    paymentId: String(data.payment_id),
    payAddress: data.pay_address,
    payAmount: Number(data.pay_amount),
    payCurrency: (data.pay_currency as string).toUpperCase(),
    expiresAt: data.expiration_estimate_date ?? new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    paymentUrl: `https://${npBase().includes("sandbox") ? "sandbox." : ""}nowpayments.io/payment/${data.payment_id}`,
  };
}

/**
 * Verifies the NOWPayments IPN signature.
 * Signature = HMAC-SHA512 of the JSON body (keys sorted) using the IPN secret.
 */
export function verifyNowPaymentsWebhook(
  rawBody: string,
  receivedSignature: string
): boolean {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret || secret === "your-ipn-secret") return true; // dev bypass

  try {
    const parsed = JSON.parse(rawBody);
    const sorted = Object.keys(parsed)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => { acc[k] = parsed[k]; return acc; }, {});
    const expected = crypto
      .createHmac("sha512", secret)
      .update(JSON.stringify(sorted))
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(receivedSignature));
  } catch {
    return false;
  }
}

// ─── OxaPay ───────────────────────────────────────────────────────────────────

const OXAPAY_BASE = "https://api.oxapay.com";

/**
 * Creates an OxaPay merchant invoice.
 * Returns the pay address and amount for inline QR code display.
 */
export async function createOxaPayInvoice({
  amountUsd,
  orderId,
  callbackUrl,
  returnUrl,
}: {
  amountUsd: number;
  orderId: string;
  callbackUrl: string;
  returnUrl: string;
}): Promise<{
  trackId: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  expiresAt: string;
  payLink: string | null;
  isSimulation?: boolean;
}> {
  const merchantKey = process.env.OXAPAY_MERCHANT_KEY || process.env.OXAPAY_API_KEY;

  // ── Forced simulation mode (set OXAPAY_SIMULATE=true in .env to skip live API) ──
  const forceSimulate = process.env.OXAPAY_SIMULATE === "true";

  // ── Sandbox / placeholder key — always simulate ───────────────────────────
  if (forceSimulate || !merchantKey || merchantKey === "your-oxapay-merchant-key" || merchantKey === "your_oxapay_merchant_key_here") {
    console.log("[OxaPay] Running in simulation mode" + (forceSimulate ? " (OXAPAY_SIMULATE=true)" : " (no key configured)"));
    return {
      trackId: `oxa_sim_${Math.random().toString(36).slice(2, 11)}`,
      payAddress: "TSimOxaAddr1234567890ABCDEF123456789",
      payAmount: amountUsd,
      payCurrency: "USDT",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      payLink: null,
      isSimulation: true,
    };
  }

  // Build payload — send only fields OxaPay's sandbox accepts
  const payload: Record<string, unknown> = {
    merchant: merchantKey,
    amount: amountUsd,
    lifeTime: 30,
    description: "Room booking fee",
    orderId,
  };
  // callbackUrl and returnUrl must be publicly reachable HTTPS — skip for localhost
  if (callbackUrl && callbackUrl.startsWith("https://")) payload.callbackUrl = callbackUrl;
  if (returnUrl && returnUrl.startsWith("https://")) payload.returnUrl = returnUrl;

  let res: Response;
  try {
    res = await fetch(`${OXAPAY_BASE}/merchants/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // 10 second timeout so we don't hang forever
      signal: AbortSignal.timeout(10_000),
    });
  } catch (networkErr: any) {
    const isTimeout = networkErr?.code === "ETIMEDOUT"
      || networkErr?.message?.includes("ETIMEDOUT")
      || networkErr?.message?.includes("fetch failed")
      || networkErr?.name === "TimeoutError";

    if (isTimeout) {
      // Auto-fallback: OxaPay unreachable from this network (works fine in production)
      console.warn("[OxaPay] Network unreachable (ETIMEDOUT) — falling back to simulation mode. Set OXAPAY_SIMULATE=true in .env to skip this warning.");
      return {
        trackId: `oxa_net_sim_${Math.random().toString(36).slice(2, 11)}`,
        payAddress: "TSimOxaAddr1234567890ABCDEF123456789",
        payAmount: amountUsd,
        payCurrency: "USDT",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        payLink: null,
        isSimulation: true,
      };
    }
    throw networkErr;
  }

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OxaPay API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  if (data.result !== 100) {
    throw new Error(`OxaPay invoice error: ${data.message ?? JSON.stringify(data)}`);
  }

  return {
    trackId: String(data.trackId),
    payAddress: data.address || "",
    payAmount: Number(data.amount || amountUsd),
    payCurrency: data.currency ?? "USDT",
    expiresAt: data.expiredAt ? new Date(Number(data.expiredAt) * 1000).toISOString() : new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    payLink: data.payLink ?? null,
    isSimulation: false,
  };
}

/**
 * Verifies OxaPay webhook signature.
 * OxaPay signs the raw body with HMAC-SHA512 using your merchant key.
 */
export function verifyOxaPayWebhook(
  rawBody: string,
  receivedHmac: string
): boolean {
  const merchantKey = process.env.OXAPAY_MERCHANT_KEY || process.env.OXAPAY_API_KEY;
  if (!merchantKey || merchantKey === "your-oxapay-merchant-key" || merchantKey === "your_oxapay_merchant_key_here") return true; // dev bypass

  try {
    const expected = crypto
      .createHmac("sha512", merchantKey)
      .update(rawBody)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(receivedHmac));
  } catch {
    return false;
  }
}
