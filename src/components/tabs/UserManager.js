"use client";
import { useState, useEffect, useCallback } from "react";
import { Users, Plus, Pencil, Trash2, X, Check, RefreshCw, Shield, Eye, EyeOff, AlertTriangle } from "lucide-react";

const ROLES = ["admin", "tester", "viewer"];
const ROLE_COLOR = { admin: "#6366f1", tester: "#10b981", viewer: "#64748b" };

const card = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 24,
};

function Badge({ role }) {
  return (
    <span style={{
      padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: `${ROLE_COLOR[role]}22`, color: ROLE_COLOR[role],
      border: `1px solid ${ROLE_COLOR[role]}44`, textTransform: "capitalize",
    }}>{role}</span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--border)",
        borderRadius: 16, padding: 28, width: "100%", maxWidth: 460,
        boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 12px",
  background: "var(--bg-card)", border: "1px solid var(--border)",
  borderRadius: 8, color: "var(--text-primary)", fontSize: 13,
  outline: "none", boxSizing: "border-box",
};

function UserForm({ initial = {}, onSave, onCancel, isEdit = false }) {
  const [form, setForm] = useState({
    username: initial.username || "",
    email: initial.email || "",
    full_name: initial.full_name || "",
    role: initial.role || "tester",
    password: "",
    is_active: initial.is_active !== undefined ? initial.is_active : 1,
  });
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!isEdit && !form.password) { setErr("La contraseña es requerida"); return; }
    if (form.password && form.password.length < 8) { setErr("Contraseña mínimo 8 caracteres"); return; }
    setSaving(true);
    try {
      const body = isEdit
        ? { id: initial.id, full_name: form.full_name, email: form.email, role: form.role, is_active: form.is_active, ...(form.password ? { password: form.password } : {}) }
        : { username: form.username, email: form.email, password: form.password, full_name: form.full_name, role: form.role };

      const res = await fetch("/api/auth/users", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Error"); return; }
      onSave();
    } catch { setErr("Error de conexión"); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit}>
      {!isEdit && (
        <Field label="Usuario">
          <input style={inputStyle} value={form.username} onChange={e => set("username", e.target.value)} placeholder="ej: jperez" required />
        </Field>
      )}
      <Field label="Nombre completo">
        <input style={inputStyle} value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Juan Pérez" />
      </Field>
      <Field label="Email">
        <input style={inputStyle} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="usuario@empresa.com" required />
      </Field>
      <Field label={isEdit ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}>
        <div style={{ position: "relative" }}>
          <input style={{ ...inputStyle, paddingRight: 40 }} type={showPwd ? "text" : "password"}
            value={form.password} onChange={e => set("password", e.target.value)}
            placeholder={isEdit ? "••••••••" : "Mínimo 8 caracteres"} />
          <button type="button" onClick={() => setShowPwd(v => !v)}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
            {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </Field>
      <Field label="Rol">
        <select style={{ ...inputStyle, cursor: "pointer" }} value={form.role} onChange={e => set("role", e.target.value)}>
          {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
      </Field>
      {isEdit && (
        <Field label="Estado">
          <div style={{ display: "flex", gap: 8 }}>
            {[{ v: 1, l: "Activo" }, { v: 0, l: "Inactivo" }].map(({ v, l }) => (
              <button key={v} type="button" onClick={() => set("is_active", v)}
                style={{
                  flex: 1, padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${form.is_active === v ? (v ? "#10b981" : "#ef4444") : "var(--border)"}`,
                  background: form.is_active === v ? (v ? "#10b98118" : "#ef444418") : "transparent",
                  color: form.is_active === v ? (v ? "#10b981" : "#ef4444") : "var(--text-muted)",
                  cursor: "pointer",
                }}>{l}</button>
            ))}
          </div>
        </Field>
      )}
      {err && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#ef444418", border: "1px solid #ef444444", borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
          <AlertTriangle size={14} color="#ef4444" />
          <span style={{ fontSize: 13, color: "#ef4444" }}>{err}</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button type="button" onClick={onCancel}
          style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}>
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear usuario"}
        </button>
      </div>
    </form>
  );
}

export default function UserManager({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "create" | { user }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/users");
      const data = await res.json();
      if (res.ok) setUsers(data.users);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/auth/users?id=${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { showToast(`❌ ${data.error}`); return; }
      showToast(`✅ Usuario '${deleteTarget.username}' eliminado`);
      setDeleteTarget(null);
      load();
    } finally { setDeleting(false); }
  }

  if (currentUser?.role !== "admin") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
        <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
          <Shield size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p>Acceso restringido a administradores</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 200,
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "12px 18px", fontSize: 13,
          color: "var(--text-primary)", boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
        }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={22} color="#6366f1" /> Gestión de Usuarios
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
            {users.length} usuario{users.length !== 1 ? "s" : ""} registrado{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}>
            <RefreshCw size={14} /> Actualizar
          </button>
          <button onClick={() => setModal("create")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <Plus size={14} /> Nuevo usuario
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div style={card}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Cargando usuarios...</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No hay usuarios</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Usuario", "Nombre completo", "Email", "Rol", "Estado", "Último acceso", ""].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-card)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "12px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-geist-mono)" }}>{u.username}</td>
                  <td style={{ padding: "12px", fontSize: 13, color: "var(--text-secondary)" }}>{u.full_name || "—"}</td>
                  <td style={{ padding: "12px", fontSize: 12, color: "var(--text-muted)" }}>{u.email}</td>
                  <td style={{ padding: "12px" }}><Badge role={u.role} /></td>
                  <td style={{ padding: "12px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20,
                      background: u.is_active ? "#10b98118" : "#ef444418",
                      color: u.is_active ? "#10b981" : "#ef4444",
                      border: `1px solid ${u.is_active ? "#10b98144" : "#ef444444"}`,
                    }}>{u.is_active ? "Activo" : "Inactivo"}</span>
                  </td>
                  <td style={{ padding: "12px", fontSize: 11, color: "var(--text-muted)" }}>
                    {u.last_login ? new Date(u.last_login + "Z").toLocaleString("es-VE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Nunca"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setModal(u)} title="Editar"
                        style={{ padding: "6px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#6366f118"; e.currentTarget.style.color = "#6366f1"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteTarget(u)} title="Eliminar" disabled={u.username === currentUser?.username}
                        style={{ padding: "6px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: u.username === currentUser?.username ? "var(--border)" : "var(--text-muted)", cursor: u.username === currentUser?.username ? "not-allowed" : "pointer" }}
                        onMouseEnter={e => { if (u.username !== currentUser?.username) { e.currentTarget.style.background = "#ef444418"; e.currentTarget.style.color = "#ef4444"; } }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Crear */}
      {modal === "create" && (
        <Modal title="Nuevo usuario" onClose={() => setModal(null)}>
          <UserForm onSave={() => { setModal(null); showToast("✅ Usuario creado correctamente"); load(); }} onCancel={() => setModal(null)} />
        </Modal>
      )}

      {/* Modal Editar */}
      {modal && modal !== "create" && (
        <Modal title={`Editar — ${modal.username}`} onClose={() => setModal(null)}>
          <UserForm initial={modal} isEdit onSave={() => { setModal(null); showToast("✅ Usuario actualizado"); load(); }} onCancel={() => setModal(null)} />
        </Modal>
      )}

      {/* Modal Confirmar Eliminar */}
      {deleteTarget && (
        <Modal title="Confirmar eliminación" onClose={() => setDeleteTarget(null)}>
          <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
            <AlertTriangle size={40} color="#ef4444" style={{ marginBottom: 12 }} />
            <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 8px" }}>
              ¿Eliminar el usuario <strong style={{ color: "var(--text-primary)" }}>{deleteTarget.username}</strong>?
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>Esta acción no se puede deshacer.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}>
              Cancelar
            </button>
            <button onClick={handleDelete} disabled={deleting}
              style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#ef4444", color: "white", cursor: "pointer", fontWeight: 600 }}>
              {deleting ? "Eliminando..." : "Sí, eliminar"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
