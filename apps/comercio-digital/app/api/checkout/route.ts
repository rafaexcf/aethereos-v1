import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Full Stripe integration implemented in M28
export async function POST(_request: NextRequest): Promise<NextResponse> {
  return NextResponse.json(
    { error: "Checkout integration pending (M28)" },
    { status: 501 },
  );
}
