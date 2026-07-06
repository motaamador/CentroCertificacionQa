// src/app/api/auth/users/route.js
// CRUD de usuarios — solo accesible por rol 'admin'

import {
  getAllUsers, createUser, updateUser,
  changePassword, deleteUser, findUserById,
} from "@/lib/db-users";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { error: NextResponse.json({ error: "Acceso denegado" }, { status: 403 }) };
  }
  return { session };
}

// GET — listar usuarios
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const users = getAllUsers();
  return NextResponse.json({ users });
}

// POST — crear usuario
export async function POST(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { username, email, password, full_name, role } = body;

    if (!username || !email || !password) {
      return NextResponse.json({ error: "username, email y password son requeridos" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
    }
    if (!["admin", "tester", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    createUser({ username, email, password, full_name, role });
    return NextResponse.json({ ok: true, message: `Usuario '${username}' creado correctamente` });
  } catch (err) {
    if (err.message?.includes("UNIQUE")) {
      return NextResponse.json({ error: "El usuario o email ya existe" }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT — actualizar usuario (campos + cambio de contraseña)
export async function PUT(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { id, password, ...fields } = body;

    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const user = findUserById(id);
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    if (Object.keys(fields).length > 0) updateUser(id, fields);
    if (password) {
      if (password.length < 8) {
        return NextResponse.json({ error: "Contraseña mínimo 8 caracteres" }, { status: 400 });
      }
      changePassword(id, password);
    }

    return NextResponse.json({ ok: true, message: "Usuario actualizado" });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — eliminar usuario
export async function DELETE(request) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get("id"));

  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  if (id === session.userId) {
    return NextResponse.json({ error: "No puedes eliminar tu propio usuario" }, { status: 400 });
  }

  deleteUser(id);
  return NextResponse.json({ ok: true, message: "Usuario eliminado" });
}
