import { NextResponse } from "next/server";
import { dashboardSnapshot } from "@/server/fixtures/dashboard";

export async function GET() {
  return NextResponse.json({
    data: dashboardSnapshot,
    source: "synthetic",
    phi: "none"
  });
}
