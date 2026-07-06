// src/app/api/auth/login/route.js

import { findUserByUsername, verifyPassword, updateLastLogin } from "@/lib/db-users";
import { createSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username?.trim() || !password) {
      return NextResponse.json({ error: "Credenciales requeridas" }, { status: 400 });
    }

    const user = findUserByUsername(username.trim());

    if (!user || !user.is_active) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }

    const valid = verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }

    // Registrar último login
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
    updateLastLogin(user.id, ip);

    // Crear cookie de sesión
    await createSession(user);

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[AUTH LOGIN]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
