import { NextResponse } from "next/server";

export async function GET() {
  const freeSignupCredits = parseInt(
    process.env.FREE_SIGNUP_CREDITS || "100",
    10
  );

  return NextResponse.json({
    freeSignupCredits,
  });
}

