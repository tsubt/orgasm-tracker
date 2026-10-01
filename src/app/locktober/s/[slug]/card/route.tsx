import { ensureLocktoberCard } from "@/lib/locktober/cardSnapshot";
import { locktoberCardElement, locktoberCardSize } from "@/lib/locktober/cardImage";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const card = await ensureLocktoberCard(slug);
  const visible = card && card.visibility !== "PRIVATE" ? card : null;
  return new ImageResponse(locktoberCardElement(visible), {
    ...locktoberCardSize,
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
