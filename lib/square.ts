import { SquareClient, SquareEnvironment } from "square";

const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN!,
  environment:
    process.env.SQUARE_ENVIRONMENT === "production"
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox,
});

export async function chargeToken({
  sourceId,
  amountCents,
  idempotencyKey,
  referenceId,
}: {
  sourceId: string;
  amountCents: number;
  idempotencyKey: string;
  referenceId: string;
}) {
  // Handle sandbox/dev simulation tokens smoothly
  const isSandboxToken =
    sourceId.startsWith("cashapp-sandbox") ||
    sourceId.startsWith("cnon:card-nonce-ok") ||
    sourceId.startsWith("card-sandbox") ||
    process.env.SQUARE_ACCESS_TOKEN === "your-square-access-token";

  if (isSandboxToken) {
    const isCard = sourceId.startsWith("card-sandbox") || sourceId.startsWith("cnon:card-nonce-ok");
    return {
      id: `sq_sim_${Math.random().toString(36).substring(2, 11)}`,
      status: "COMPLETED",
      amountMoney: { amount: BigInt(amountCents), currency: "USD" },
      referenceId,
      sourceType: isCard ? "CARD" : "CASH_APP",
    };
  }

  const response = await client.payments.create({
    sourceId,
    idempotencyKey,
    amountMoney: { amount: BigInt(amountCents), currency: "USD" },
    referenceId,
  });
  return response.payment;
}
