import { NextResponse, type NextRequest } from "next/server";

// Each device app has its own port (see scripts/device-ports.mjs). The port proxy tags each request
// with the device, and "/" on that port shows that device's app instead of the full prototype.
const DEVICES = new Set(["iphone", "ipad", "duo", "laptop"]);

export function middleware(req: NextRequest) {
  const device = req.headers.get("x-skyhand-device");
  if (device && DEVICES.has(device)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${device}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = { matcher: "/" };
