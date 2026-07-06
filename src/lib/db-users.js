// src/lib/db-users.js
// Base de datos SQLite local para usuarios del sistema QA
// Completamente independiente del PostgreSQL de desarrollo

import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "data", "users.db");

let _db = null;

export function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS qa_users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT UNIQUE NOT NULL COLLATE NOCASE,
      email         TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      full_name     TEXT NOT NULL DEFAULT '',
      role          TEXT NOT NULL DEFAULT 'tester' CHECK(role IN ('admin','tester','viewer')),
      is_active     INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      last_login    TEXT
    );

    CREATE TABLE IF NOT EXISTS qa_sessions_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES qa_users(id),
      logged_at  TEXT NOT NULL DEFAULT (datetime('now')),
      ip         TEXT
    );
  `);

  // Crear usuario admin por defecto si no existe ningún usuario
  const count = db.prepare("SELECT COUNT(*) as n FROM qa_users").get();
  if (count.n === 0) {
    const hash = bcrypt.hashSync("Admin2024!", 12);
    db.prepare(`
      INSERT INTO qa_users (username, email, password_hash, full_name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run("admin", "admin@qa-cert.local", hash, "Administrador QA", "admin");
    console.log("[AUTH] Usuario admin creado con contraseña: Admin2024!");
  }
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function findUserByUsername(username) {
  return getDb()
    .prepare("SELECT * FROM qa_users WHERE username = ? COLLATE NOCASE")
    .get(username);
}

export function findUserById(id) {
  return getDb()
    .prepare("SELECT id, username, email, full_name, role, is_active, created_at, last_login FROM qa_users WHERE id = ?")
    .get(id);
}

export function getAllUsers() {
  return getDb()
    .prepare("SELECT id, username, email, full_name, role, is_active, created_at, last_login FROM qa_users ORDER BY created_at DESC")
    .all();
}

export function createUser({ username, email, password, full_name, role = "tester" }) {
  const hash = bcrypt.hashSync(password, 12);
  return getDb()
    .prepare(`
      INSERT INTO qa_users (username, email, password_hash, full_name, role)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(username, email, hash, full_name || "", role);
}

export function updateUser(id, fields) {
  const allowed = ["full_name", "email", "role", "is_active"];
  const updates = Object.keys(fields)
    .filter(k => allowed.includes(k))
    .map(k => `${k} = ?`);
  if (updates.length === 0) return;
  const values = Object.keys(fields)
    .filter(k => allowed.includes(k))
    .map(k => fields[k]);
  getDb()
    .prepare(`UPDATE qa_users SET ${updates.join(", ")} WHERE id = ?`)
    .run(...values, id);
}

export function changePassword(id, newPassword) {
  const hash = bcrypt.hashSync(newPassword, 12);
  getDb()
    .prepare("UPDATE qa_users SET password_hash = ? WHERE id = ?")
    .run(hash, id);
}

export function deleteUser(id) {
  getDb().prepare("DELETE FROM qa_users WHERE id = ?").run(id);
}

export function updateLastLogin(id, ip = null) {
  const db = getDb();
  db.prepare("UPDATE qa_users SET last_login = datetime('now') WHERE id = ?").run(id);
  db.prepare("INSERT INTO qa_sessions_log (user_id, ip) VALUES (?, ?)").run(id, ip);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}
