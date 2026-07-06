// src/lib/session.js
// Gestión de sesiones JWT con jose (Edge + Node compatible)
// Cookie httpOnly, SameSite=Lax, 8 horas de duración

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "qa_session";
const SESSION_DURATION = 8 * 60 * 60; // 8 horas en segundos

function getSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET no definida en .env.local");
  return new TextEncoder().encode(s);
}

export async function createSession(user) {
  const secret = getSecret();
  const token = await new SignJWT({
    userId: user.id,
    username: user.username,
    role: user.role,
    full_name: user.full_name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, getSecret());
    return payload;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
