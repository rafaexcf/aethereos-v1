import { NextResponse } from "next/server";

export function GET(): NextResponse {
  return NextResponse.json({
    status: "ok",
    app: "comercio-digital",
    ts: new Date().toISOString(),
    version: process.env["npm_package_version"] ?? "0.0.0",
  });
}
