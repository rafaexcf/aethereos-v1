import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Full Stripe webhook handler implemented in M28
export async function POST(_request: NextRequest): Promise<NextResponse> {
  return NextResponse.json(
    { error: "Stripe webhook handler pending (M28)" },
    { status: 501 },
  );
}
