// src/middleware.js
// Protege todas las rutas del sistema excepto /login y /api/auth/*
// Corre en el Edge Runtime — sólo usa jose, sin node modules

import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];
const COOKIE_NAME = "qa_session";

function getSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET no definida");
  return new TextEncoder().encode(s);
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Rutas públicas — pasar sin verificar
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await jwtVerify(token, getSecret());
    return NextResponse.next();
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("expired", "1");
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete(COOKIE_NAME);
    return res;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
