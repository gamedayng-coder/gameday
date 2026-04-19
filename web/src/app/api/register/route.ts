// ARM-79: Registration is closed — internal access only.
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Registration is closed. Contact your administrator." },
    { status: 403 }
  );
}
