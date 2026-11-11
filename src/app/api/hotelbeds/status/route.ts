import { NextResponse } from "next/server";
import { checkHotelbedsStatus } from "@/lib/hotelbeds";

export async function GET() {
  const result = await checkHotelbedsStatus();
  return NextResponse.json(result);
}
