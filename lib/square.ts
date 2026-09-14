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
  const response = await client.payments.create({
    sourceId,
    idempotencyKey,
    amountMoney: { amount: BigInt(amountCents), currency: "USD" },
    referenceId,
  });
  return response.payment;
}
