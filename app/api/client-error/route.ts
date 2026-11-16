import { NextResponse } from "next/server";

/**
 * Client-side crash reporter.
 *
 * The site renders fine in every emulated phone we can run, but a real Android
 * Chrome crashes after paint. Without access to that device's console this
 * endpoint is the only way to read the actual message: the boot guard in
 * app/layout.tsx beacons errors here and they show up in the Vercel runtime log.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw) console.error("[my-library][client-error]", raw.slice(0, 4000));
  } catch {
    // A malformed report should never fail loudly.
  }
  return new NextResponse(null, { status: 204 });
}
