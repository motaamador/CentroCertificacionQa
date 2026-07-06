"use client";
import { useState, useRef, useEffect } from "react";
import { Database, Link2, Filter, List, ArrowUpDown, AlertTriangle, Lock, BookOpen, Play, Search, Info, X, Hash, Layers } from "lucide-react";

// ── Node visual config ────────────────────────────────────────────────────────
const NODE_CFG = {
  from:   { color: "#c3e88d", bg: "rgba(195,232,141,0.08)", Icon: Database,     title: "FROM" },
  join:   { color: "#80cbc4", bg: "rgba(128,203,196,0.08)", Icon: Link2,        title: "JOIN" },
  where:  { color: "#ffcb6b", bg: "rgba(255,203,107,0.08)", Icon: Filter,       title: "WHERE" },
  group:  { color: "#f78c6c", bg: "rgba(247,140,108,0.08)", Icon: Layers,       title: "GROUP BY" },
  having: { color: "#f78c6c", bg: "rgba(247,140,108,0.08)", Icon: Filter,       title: "HAVING" },
  select: { color: "#82aaff", bg: "rgba(130,170,255,0.08)", Icon: List,         title: "SELECT" },
  order:  { color: "#c792ea", bg: "rgba(199,146,234,0.08)", Icon: ArrowUpDown,  title: "ORDER BY" },
  limit:  { color: "#ff5370", bg: "rgba(255,83,112,0.08)",  Icon: Hash,         title: "LIMIT / OFFSET" },
};

// ── Inline schema dictionary (invme) ─────────────────────────────────────────
const SCHEMA = {
  accion:         { desc:"Catálogo de acciones", cols:[{n:"id_accion",t:"integer",pk:true},{n:"desc_accion",t:"varchar"},{n:"titulo",t:"varchar"},{n:"estatus_inicial",t:"integer",null:true},{n:"estatus_final",t:"integer"}] },
  almacen:        { desc:"Catálogo de almacenes", cols:[{n:"id_almacen",t:"integer",pk:true},{n:"desc_almacen",t:"varchar"},{n:"abrev_almacen",t:"varchar"},{n:"activo",t:"boolean"},{n:"id_tipo_almacen",t:"integer",fk:"tipo_almacen"},{n:"estado",t:"varchar",null:true}] },
  caracteristica: { desc:"Características de materiales", cols:[{n:"id_caracteristica",t:"integer",pk:true},{n:"desc_caracteristica",t:"varchar"}] },
  color:          { desc:"Catálogo de colores", cols:[{n:"id_color",t:"integer",pk:true},{n:"desc_color",t:"varchar(20)"}] },
  ctrlerrores:    { desc:"Bitácora de errores", cols:[{n:"idcontrol",t:"integer",pk:true},{n:"iderror",t:"varchar(100)",null:true},{n:"campo",t:"varchar(100)",null:true},{n:"entidad",t:"varchar(100)",null:true},{n:"fecha",t:"timestamp",null:true},{n:"descripcion",t:"varchar(200)",null:true}] },
  detalle_recepcion_material: { desc:"Detalle de recepciones", cols:[{n:"id_detalle_recepcion_material",t:"integer",pk:true},{n:"id_recepcion_material",t:"integer",fk:"recepcion_material",null:true},{n:"desc_recepcion_material",t:"varchar(300)"},{n:"id_tipo_material",t:"integer",fk:"tipo_material",null:true},{n:"id_unidad_medida",t:"integer",fk:"unidad_medida",null:true},{n:"cant_unidad_medida",t:"integer"},{n:"cant_total",t:"integer"},{n:"prefijo",t:"char(1)",null:true},{n:"num_desde",t:"varchar(20)",null:true},{n:"num_hasta",t:"varchar(20)",null:true},{n:"observaciones",t:"varchar(300)",null:true},{n:"valores_caracteristicas",t:"jsonb",null:true}] },
  hist_movimiento: { desc:"Historial de movimientos (tabla transaccional central)", cols:[{n:"id_hist_movimiento",t:"integer",pk:true},{n:"id_detalle_recepcion_material",t:"integer",fk:"detalle_recepcion_material"},{n:"id_conf_tipoalmacen_estatus",t:"integer",fk:"conf_tipo_almacen_estatus"},{n:"fecha",t:"timestamptz"},{n:"id_inv_unidad",t:"integer",fk:"inv_unidad",null:true},{n:"id_inv_lote",t:"integer",fk:"inv_lote",null:true},{n:"id_usuario",t:"integer",fk:"usuario",null:true},{n:"usuario_siic",t:"varchar",null:true},{n:"cantidad",t:"integer",null:true},{n:"observaciones",t:"varchar",null:true}] },
  inv_lote:       { desc:"Inventario por lote", cols:[{n:"id_inv_lote",t:"integer",pk:true},{n:"cantidad",t:"integer"},{n:"id_lote",t:"integer",fk:"lote",null:true}] },
  inv_unidad:     { desc:"Inventario por unidad serializada", cols:[{n:"id_inv_unidad",t:"integer",pk:true},{n:"serial",t:"varchar"},{n:"disponible",t:"boolean"},{n:"id_lote",t:"integer",fk:"lote",null:true}] },
  lote:           { desc:"Lotes de materiales", cols:[{n:"id_lote",t:"integer",pk:true},{n:"nro_lote",t:"varchar"},{n:"fecha_asignacion",t:"timestamptz"},{n:"id_almacen",t:"integer",fk:"almacen"},{n:"id_tipo_material",t:"integer",fk:"tipo_material"},{n:"fecha_entrega_almacen",t:"timestamptz",null:true},{n:"valores_caracteristicas",t:"jsonb"}] },
  perfil:         { desc:"Perfiles de acceso", cols:[{n:"id_perfil",t:"integer",pk:true},{n:"desc_perfil",t:"varchar(50)"}] },
  perfil_accion:  { desc:"Permisos perfil-acción", cols:[{n:"id_perfil_accion",t:"integer",pk:true},{n:"id_perfil",t:"integer",fk:"perfil"},{n:"id_accion",t:"integer",fk:"accion"}] },
  recepcion_material: { desc:"Cabecera de recepciones", cols:[{n:"id_recepcion_material",t:"integer",pk:true},{n:"id_tipo_documento",t:"integer",fk:"tipo_documento",null:true},{n:"num_documento",t:"varchar(20)"},{n:"fecha_documento",t:"date"}] },
  tipo_almacen:   { desc:"Tipos de almacén", cols:[{n:"id_tipo_almacen",t:"integer",pk:true},{n:"desc_tipo_almacen",t:"varchar"}] },
  tipo_documento: { desc:"Tipos de documento", cols:[{n:"id_tipo_documento",t:"integer",pk:true},{n:"desc_tipo_documento",t:"varchar(50)"}] },
  tipo_estatus:   { desc:"Catálogo de estatus", cols:[{n:"id_tipo_estatus",t:"integer",pk:true},{n:"desc_tipo_estatus",t:"varchar"},{n:"activo",t:"boolean"}] },
  tipo_material:  { desc:"Tipos de material", cols:[{n:"id_tipo_material",t:"integer",pk:true},{n:"desc_tipo_material",t:"varchar"},{n:"serializado",t:"boolean"},{n:"plantilla_caracteristicas",t:"jsonb"}] },
  tipo_tramite:   { desc:"Tipos de trámite", cols:[{n:"id_tipo_tramite",t:"integer",pk:true},{n:"desc_tipo_tramite",t:"varchar"},{n:"id_tipo_tramite_siic",t:"varchar"}] },
  unidad_medida:  { desc:"Unidades de medida", cols:[{n:"id_unidad_medida",t:"integer",pk:true},{n:"desc_unidad_medida",t:"varchar(50)"}] },
  usuario:        { desc:"Usuarios del sistema", cols:[{n:"id_usuario",t:"integer",pk:true},{n:"usuario",t:"varchar(20)"},{n:"fecha_creacion",t:"date"},{n:"nombre",t:"varchar",null:true},{n:"apellido",t:"varchar",null:true}] },
  usuario_almacen: { desc:"Almacenes por usuario", cols:[{n:"id_usuario_almacen",t:"integer",pk:true},{n:"id_usuario",t:"integer",fk:"usuario"},{n:"id_almacen",t:"integer",fk:"almacen"},{n:"activo",t:"boolean"}] },
  usuario_perfil: { desc:"Perfiles por usuario", cols:[{n:"id_usuario_perfil",t:"integer",pk:true},{n:"id_perfil",t:"smallint",fk:"perfil"},{n:"id_usuario",t:"integer",fk:"usuario"},{n:"activo",t:"boolean"},{n:"fechainicio",t:"date",null:true},{n:"comunicacioninicio",t:"varchar",null:true},{n:"fechafin",t:"date",null:true},{n:"comunicacionfin",t:"varchar",null:true}] },
  conf_tipo_almacen_estatus: { desc:"Config estatus por tipo almacén", cols:[{n:"id_conf_tipoalmacen_estatus",t:"integer",pk:true},{n:"id_tipo_almacen",t:"integer",fk:"tipo_almacen"},{n:"id_tipo_estatus",t:"integer",fk:"tipo_estatus"},{n:"tipo_movimiento",t:"char(1)",null:true}] },
  conf_tipo_material_almacen: { desc:"Config stock por material y almacén", cols:[{n:"id_conf_tipo_material_tipo_almacen",t:"integer",pk:true},{n:"id_tipo_material",t:"integer",fk:"tipo_material"},{n:"promedio",t:"integer",null:true},{n:"stock_minimo",t:"integer",null:true},{n:"stock_maximo",t:"integer",null:true},{n:"id_almacen",t:"integer",fk:"almacen"}] },
  caracteristica_tipo_material: { desc:"Relación característica-material", cols:[{n:"id_caracteristica_tipo_material",t:"integer",pk:true},{n:"id_caracteristica",t:"integer",fk:"caracteristica"},{n:"id_tipo_material",t:"integer",fk:"tipo_material"},{n:"valor",t:"varchar"}] },
  color_tipo_material: { desc:"Relación color-material", cols:[{n:"id_color_tipo_material",t:"integer",pk:true},{n:"id_color",t:"integer",fk:"color",null:true},{n:"id_tipo_material",t:"integer",fk:"tipo_material",null:true}] },
};

// ── SQL Parser ────────────────────────────────────────────────────────────────
function parseSQL(raw) {
  const sql = raw.replace(/\s+/g, " ").trim();
  const up = sql.toUpperCase();
  const nodes = [];
  const warnings = [];
  const locks = [];

  const stmtType = up.startsWith("SELECT") || up.startsWith("WITH") ? "SELECT"
    : up.startsWith("INSERT") ? "INSERT"
    : up.startsWith("UPDATE") ? "UPDATE"
    : up.startsWith("DELETE") ? "DELETE"
    : /^(CREATE|ALTER|DROP|TRUNCATE)/.test(up) ? "DDL" : "OTHER";

  // DDL locks
  if (stmtType === "DDL") {
    locks.push({ level:"critical", type:"AccessExclusiveLock", msg:"DDL bloquea TODA la tabla. Planifica en ventana de mantenimiento." });
  }
  if (up.includes("FOR UPDATE") || up.includes("FOR SHARE")) {
    locks.push({ level:"warning", type:"RowShareLock", msg:"FOR UPDATE/SHARE puede generar deadlock si múltiples tx acceden filas en diferente orden." });
  }

  // FROM
  const fromM = sql.match(/\bFROM\s+([\w.]+)(?:\s+(?:AS\s+)?([\w]+))?/i);
  if (fromM) {
    const skip = ["WHERE","JOIN","LEFT","RIGHT","INNER","FULL","CROSS","GROUP","ORDER","LIMIT","HAVING","ON"];
    const alias = fromM[2] && !skip.includes(fromM[2].toUpperCase()) ? fromM[2] : null;
    nodes.push({ type:"from", label:fromM[1]+(alias?` (${alias})`:``), table:fromM[1], alias, desc:`Carga datos base de la tabla ${fromM[1]}${alias?" con alias "+alias:""}.` });
  }

  // JOINs
  const joinRe = /\b((?:INNER|LEFT\s+OUTER?|RIGHT\s+OUTER?|FULL\s+OUTER?|CROSS|NATURAL)?\s*JOIN)\s+([\w.]+)(?:\s+(?:AS\s+)?([\w]+))?\s*(?:ON\s+([^]+?)(?=\s*(?:JOIN|WHERE|GROUP|ORDER|LIMIT|HAVING|$)))?/gi;
  let jm;
  while ((jm = joinRe.exec(sql)) !== null) {
    const jtype = jm[1].trim().toUpperCase();
    const tbl   = jm[2];
    const skip2 = ["WHERE","ON","LEFT","RIGHT","INNER","FULL","CROSS","GROUP","ORDER","LIMIT"];
    const alias = jm[3] && !skip2.includes(jm[3].toUpperCase()) ? jm[3] : null;
    const cond  = jm[4]?.trim().split(/\s*(?:WHERE|GROUP|ORDER|LIMIT)/i)[0].trim();
    nodes.push({ type:"join", label:`${jtype} ${tbl}${alias?" ("+alias+")":""}`, table:tbl, alias, cond, joinType:jtype, desc:`${jtype}: une filas donde ${cond||"(sin condición ON)"}.` });
    if (jtype.includes("CROSS")) warnings.push({ level:"critical", code:"CROSS_JOIN", title:"CROSS JOIN — Producto cartesiano", msg:`Genera N×M filas. Verifica si falta condición ON en ${tbl}.` });
    if (!cond && !jtype.includes("CROSS") && !jtype.includes("NATURAL")) warnings.push({ level:"error", code:"NO_ON", title:"JOIN sin condición ON", msg:`${jtype} ${tbl} no tiene ON. Produce producto cartesiano.` });
  }

  // WHERE
  const whereM = sql.match(/\bWHERE\s+(.+?)(?=\s*(?:GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|OFFSET|$))/i);
  if (whereM) {
    const cond = whereM[1].trim();
    const short = cond.length > 50 ? cond.slice(0,50)+"…" : cond;
    nodes.push({ type:"where", label:`WHERE ${short}`, cond, desc:`Filtra únicamente las filas donde ${short}.` });
    if (/LIKE\s+'%/i.test(cond)) warnings.push({ level:"warning", code:"LIKE_WILDCARD", title:"LIKE con comodín inicial", msg:"LIKE '%...' impide uso de índices B-tree → Seq Scan completo.", fix:"Usa pg_trgm o reordena el patrón." });
    if (/NOT\s+IN\s*\(/i.test(cond)) warnings.push({ level:"warning", code:"NOT_IN", title:"NOT IN con posibles NULLs", msg:"NOT IN retorna vacío si la subquery devuelve algún NULL.", fix:"Reemplaza con NOT EXISTS o LEFT JOIN … WHERE col IS NULL." });
    if (/\b(UPPER|LOWER|TRIM|DATE_PART|EXTRACT|TO_CHAR)\s*\(/i.test(cond)) warnings.push({ level:"warning", code:"FN_ON_COL", title:"Función sobre columna en WHERE", msg:"Aplicar funciones sobre columnas anula el uso del índice.", fix:"Crea un índice funcional o aplica la función al valor constante." });
  } else if (stmtType === "UPDATE" || stmtType === "DELETE") {
    warnings.push({ level:"critical", code:"NO_WHERE", title:`${stmtType} sin WHERE — ¡Peligroso!`, msg:`Afectará TODAS las filas de la tabla.`, fix:"Agrega WHERE y ejecuta un SELECT previo para verificar." });
    locks.push({ level:"critical", type:"RowExclusiveLock (tabla completa)", msg:`${stmtType} sin WHERE bloquea todas las filas durante la transacción.` });
  }

  // GROUP BY
  const groupM = sql.match(/\bGROUP\s+BY\s+(.+?)(?=\s*(?:HAVING|ORDER\s+BY|LIMIT|$))/i);
  if (groupM) {
    const cols = groupM[1].trim();
    nodes.push({ type:"group", label:`GROUP BY ${cols.length>40?cols.slice(0,40)+"…":cols}`, cols, desc:`Agrupa resultados por ${cols}.` });
  }

  // HAVING
  const havingM = sql.match(/\bHAVING\s+(.+?)(?=\s*(?:ORDER\s+BY|LIMIT|$))/i);
  if (havingM) {
    const cond = havingM[1].trim();
    nodes.push({ type:"having", label:`HAVING ${cond.length>40?cond.slice(0,40)+"…":cond}`, cond, desc:`Filtra grupos: ${cond}.` });
  }

  // SELECT
  const selM = sql.match(/^(?:WITH\s+.+?\s+)?SELECT\s+(DISTINCT\s+)?(.+?)\s+FROM/i);
  if (selM) {
    const dist = !!selM[1];
    const cols = selM[2]?.trim();
    const short = cols && cols.length > 45 ? cols.slice(0,45)+"…" : cols;
    nodes.push({ type:"select", label:`SELECT ${short}`, cols, distinct:dist, desc:`Selecciona y formatea las columnas de salida.` });
    if (cols === "*") warnings.push({ level:"warning", code:"SELECT_STAR", title:"SELECT * detectado", msg:"Trae columnas innecesarias, aumenta red/memoria y rompe código si el esquema cambia.", fix:"Lista explícitamente las columnas que necesitas." });
    if (dist) warnings.push({ level:"info", code:"DISTINCT", title:"SELECT DISTINCT en uso", msg:"DISTINCT puede ocultar duplicados de JOINs mal configurados y tiene costo extra de ordenamiento.", fix:"Verifica que los JOINs estén correctamente condicionados." });
  }

  // ORDER BY
  const orderM = sql.match(/\bORDER\s+BY\s+(.+?)(?=\s*(?:LIMIT|OFFSET|$))/i);
  if (orderM) {
    const cols = orderM[1].trim();
    nodes.push({ type:"order", label:`ORDER BY ${cols.length>40?cols.slice(0,40)+"…":cols}`, cols, desc:`Ordena los resultados por ${cols}.` });
  }

  // LIMIT / OFFSET
  const limM  = sql.match(/\bLIMIT\s+(\d+)/i);
  const offM  = sql.match(/\bOFFSET\s+(\d+)/i);
  if (limM || offM) {
    const lim = limM ? parseInt(limM[1]) : null;
    const off = offM ? parseInt(offM[1]) : null;
    const label = [lim!=null?`LIMIT ${lim}`:null, off!=null?`OFFSET ${off}`:null].filter(Boolean).join("  ");
    nodes.push({ type:"limit", label, lim, off, desc:`Restringe la cantidad de filas devueltas.` });
    if (off && off > 10000) warnings.push({ level:"warning", code:"BIG_OFFSET", title:`OFFSET grande (${off.toLocaleString()})`, msg:`PostgreSQL debe leer y descartar ${off.toLocaleString()} filas antes de devolver resultados.`, fix:"Usa paginación por cursor (keyset pagination) para mejor rendimiento." });
  }

  // Detect tables for dictionary
  const tables = [...new Set(nodes.filter(n=>n.table).map(n=>n.table.toLowerCase().replace(/^invme\./,"").replace(/^public\./,"")))];

  return { nodes, warnings, locks, stmtType, tables };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function DiagramNode({ node, isLast }) {
  const [hover, setHover] = useState(false);
  const cfg = NODE_CFG[node.type] || NODE_CFG.select;
  const { Icon } = cfg;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
      <div
        onMouseEnter={()=>setHover(true)}
        onMouseLeave={()=>setHover(false)}
        style={{
          width:300, border:`1.5px solid ${cfg.color}`, borderRadius:10,
          background: hover ? `${cfg.color}18` : cfg.bg,
          padding:"12px 16px", transition:"all 0.2s", cursor:"default",
          boxShadow: hover ? `0 0 18px ${cfg.color}30` : "none",
          position:"relative"
        }}
      >
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
          <Icon size={14} color={cfg.color} />
          <span style={{ fontFamily:"monospace", fontSize:12, color:cfg.color, fontWeight:700 }}>
            {node.label}
          </span>
        </div>
        <p style={{ fontSize:11, color:"#8899aa", margin:0, lineHeight:1.5 }}>
          {node.desc}
        </p>
        {node.cond && node.type==="join" && (
          <div style={{ marginTop:6, fontSize:10, color:"#607080", fontFamily:"monospace" }}>
            ON {node.cond.length>60?node.cond.slice(0,60)+"…":node.cond}
          </div>
        )}
      </div>
      {!isLast && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", height:52 }}>
          <svg width={2} height={52} style={{ overflow:"visible" }}>
            <line x1={1} y1={0} x2={1} y2={40}
              stroke="#3a5060" strokeWidth={2} strokeDasharray="5,4" />
            <polygon points="1,42 -4,32 6,32" fill="#3a5060" />
          </svg>
        </div>
      )}
    </div>
  );
}

function FromGroup({ tables, hasNext }) {
  const [hover, setHover] = useState({});
  const cfg = NODE_CFG.from;
  const { Icon } = cfg;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
      <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
        {tables.map((t,i) => (
          <div key={i}
            onMouseEnter={()=>setHover(h=>({...h,[i]:true}))}
            onMouseLeave={()=>setHover(h=>({...h,[i]:false}))}
            style={{
              width:220, border:`1.5px solid ${cfg.color}`, borderRadius:10,
              background: hover[i] ? `${cfg.color}18` : cfg.bg, padding:"12px 16px",
              transition:"all 0.2s", boxShadow: hover[i]?`0 0 18px ${cfg.color}30`:"none"
            }}
          >
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <Icon size={14} color={cfg.color} />
              <span style={{ fontFamily:"monospace", fontSize:12, color:cfg.color, fontWeight:700 }}>
                {t.table}{t.alias?` (${t.alias})`:""}
              </span>
            </div>
            <p style={{ fontSize:11, color:"#8899aa", margin:0 }}>
              Carga datos base de la tabla {t.table}{t.alias?` (${t.alias})`:""}.
            </p>
          </div>
        ))}
      </div>
      {hasNext && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", height:52 }}>
          <svg width={2} height={52} style={{ overflow:"visible" }}>
            <line x1={1} y1={0} x2={1} y2={40} stroke="#3a5060" strokeWidth={2} strokeDasharray="5,4" />
            <polygon points="1,42 -4,32 6,32" fill="#3a5060" />
          </svg>
        </div>
      )}
    </div>
  );
}

const WARN_COLORS = { critical:"#ff5370", error:"#ff5370", warning:"#ffcb6b", info:"#82aaff" };
const WARN_BG = { critical:"rgba(255,83,112,0.07)", error:"rgba(255,83,112,0.07)", warning:"rgba(255,203,107,0.07)", info:"rgba(130,170,255,0.07)" };

function WarnCard({ w }) {
  return (
    <div style={{ border:`1px solid ${WARN_COLORS[w.level]||"#555"}`, borderRadius:8, padding:"10px 14px", marginBottom:8, background:WARN_BG[w.level]||"transparent" }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
        <AlertTriangle size={13} color={WARN_COLORS[w.level]||"#888"} />
        <span style={{ fontWeight:700, fontSize:12, color:WARN_COLORS[w.level]||"#888" }}>{w.title}</span>
        <span style={{ marginLeft:"auto", fontSize:10, color:"#607080", textTransform:"uppercase", fontWeight:600 }}>{w.level}</span>
      </div>
      <p style={{ fontSize:11, color:"#8899aa", margin:"0 0 4px" }}>{w.msg}</p>
      {w.fix && <p style={{ fontSize:11, color:"#4a9060", margin:0 }}>💡 {w.fix}</p>}
    </div>
  );
}

function LockCard({ l }) {
  return (
    <div style={{ border:`1px solid ${l.level==="critical"?"#ff5370":"#ffcb6b"}`, borderRadius:8, padding:"10px 14px", marginBottom:8, background:l.level==="critical"?"rgba(255,83,112,0.07)":"rgba(255,203,107,0.07)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
        <Lock size={13} color={l.level==="critical"?"#ff5370":"#ffcb6b"} />
        <span style={{ fontWeight:700, fontSize:12, color:l.level==="critical"?"#ff5370":"#ffcb6b" }}>{l.type}</span>
      </div>
      <p style={{ fontSize:11, color:"#8899aa", margin:"0 0 4px" }}>{l.msg}</p>
      {l.advice && <p style={{ fontSize:11, color:"#4a9060", margin:0 }}>💡 {l.advice}</p>}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
const DEMO_SQL = `SELECT
  u.usuario,
  u.nombre,
  u.apellido,
  l.nro_lote,
  tm.desc_tipo_material,
  a.desc_almacen,
  il.cantidad
FROM invme.usuario u
INNER JOIN invme.usuario_almacen ua ON ua.id_usuario = u.id_usuario
INNER JOIN invme.almacen a ON a.id_almacen = ua.id_almacen
INNER JOIN invme.lote l ON l.id_almacen = a.id_almacen
INNER JOIN invme.tipo_material tm ON tm.id_tipo_material = l.id_tipo_material
INNER JOIN invme.inv_lote il ON il.id_lote = l.id_lote
WHERE ua.activo = true
  AND u.id_usuario = 1
ORDER BY l.nro_lote DESC
LIMIT 50;`;

export default function SqlAnalyzer() {
  const [sql, setSql] = useState(DEMO_SQL);
  const [result, setResult] = useState(null);
  const [explain, setExplain] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activePanel, setActivePanel] = useState("warnings");
  const [explainLoading, setExplainLoading] = useState(false);

  const analyze = () => {
    const parsed = parseSQL(sql);
    setResult(parsed);
    setExplain(null);
    setActivePanel(parsed.warnings.length > 0 ? "warnings" : parsed.locks.length > 0 ? "locks" : "dict");
  };

  const runExplain = async () => {
    setExplainLoading(true);
    try {
      const res = await fetch("/api/sql-analyzer", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ sql }) });
      const data = await res.json();
      setExplain(data);
      if (!result) setResult(parseSQL(sql));
      setActivePanel("plan");
    } catch(e) { 
      setExplain({ ok:false, error:e.message });
      if (!result) setResult(parseSQL(sql));
      setActivePanel("plan");
    }
    setExplainLoading(false);
  };

  const saveToHistory = () => {
    if (!result) return;
    try {
      const history = JSON.parse(localStorage.getItem("qa_history") || "[]");
      
      let status = "pass";
      if (result.warnings.length > 0 || result.locks.length > 0) status = "warn";
      if (explain && !explain.ok) status = "fail";

      const details = [];
      if (result.warnings.length > 0) details.push(`${result.warnings.length} Advertencia(s) detectadas`);
      if (result.locks.length > 0) details.push(`${result.locks.length} Bloqueo(s) detectados`);
      if (explain && explain.ok && explain.plan) {
        details.push(`Costo Total: ${explain.plan["Total Cost"]}`);
        details.push(`Filas Estimadas: ${explain.plan["Plan Rows"]}`);
      }

      const newItem = {
        type: "sql",
        status,
        message: `Análisis de Query: ${sql.slice(0, 40).replace(/\n/g, " ")}...`,
        timestamp: Date.now(),
        details,
        sqlQuery: sql,
        explainPlan: explain?.plan || null,
        sqlWarnings: result.warnings,
        sqlLocks: result.locks
      };

      history.push(newItem);
      localStorage.setItem("qa_history", JSON.stringify(history));
      alert("✅ Resultados de SQL Analyzer guardados en el historial de QA.");
    } catch (e) {
      alert("Error al guardar en historial: " + e.message);
    }
  };

  // Build diagram rows: group FROM nodes together, rest sequential
  const buildRows = (nodes) => {
    if (!nodes || !nodes.length) return [];
    const fromNodes = nodes.filter(n=>n.type==="from");
    const rest = nodes.filter(n=>n.type!=="from");
    const rows = [];
    if (fromNodes.length > 0) rows.push({ kind:"from_group", tables:fromNodes });
    rest.forEach(n => rows.push({ kind:"node", node:n }));
    return rows;
  };

  const rows = result ? buildRows(result.nodes) : [];
  const warnCount = result?.warnings?.length || 0;
  const lockCount = result?.locks?.length || 0;

  const dictTables = result?.tables?.filter(t => SCHEMA[t]) || [];

  const PANEL_TABS = [
    { id:"warnings", label:`Advertencias`, count:warnCount, color:"#ffcb6b" },
    { id:"locks",    label:`Bloqueos`,     count:lockCount, color:"#ff5370" },
    { id:"dict",     label:`Diccionario`,  count:dictTables.length, color:"#82aaff" },
    { id:"plan",     label:`EXPLAIN`,      count:null, color:"#c792ea" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, height:"100%" }}>
      {/* Title */}
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#3b82f6,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Search size={18} color="white" />
        </div>
        <div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:"var(--text-primary)" }}>SQL Analyzer</h2>
          <p style={{ margin:0, fontSize:12, color:"var(--text-muted)" }}>Visualiza, detecta antipatrones y analiza bloqueos antes de ejecutar</p>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display:"grid", gridTemplateColumns:"420px 1fr", gap:20, minHeight:600 }}>

        {/* LEFT: Editor */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ border:"1px solid var(--border)", borderRadius:12, overflow:"hidden", background:"var(--bg-surface)", flex:1 }}>
            <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8 }}>
              <Database size={13} color="#82aaff" />
              <span style={{ fontSize:12, fontWeight:600, color:"var(--text-secondary)" }}>Editor SQL</span>
              <span style={{ marginLeft:"auto", fontSize:10, color:"var(--text-muted)", fontFamily:"monospace" }}>PostgreSQL · schema invme</span>
            </div>
            <textarea
              value={sql}
              onChange={e=>setSql(e.target.value)}
              spellCheck={false}
              style={{
                width:"100%", minHeight:380, padding:"14px", background:"#0a0f14",
                color:"#cdd3de", fontFamily:"monospace", fontSize:12, lineHeight:1.7,
                border:"none", outline:"none", resize:"vertical", boxSizing:"border-box"
              }}
              placeholder="Escribe tu query SQL aquí…"
            />
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={analyze} style={{
              flex:1, padding:"10px 16px", borderRadius:8, border:"1px solid #3b82f6",
              background:"rgba(59,130,246,0.15)", color:"#82aaff", fontWeight:700,
              fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"all 0.2s"
            }}>
              <Search size={14} /> Analizar Query
            </button>
            <button onClick={runExplain} disabled={explainLoading} style={{
              flex:1, padding:"10px 16px", borderRadius:8, border:"1px solid #6366f1",
              background:"rgba(99,102,241,0.15)", color:"#a5b4fc", fontWeight:700,
              fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"all 0.2s",
              opacity: explainLoading ? 0.6 : 1
            }}>
              <Play size={14} /> {explainLoading ? "Ejecutando…" : "EXPLAIN via BD"}
            </button>
            {result && (
              <button onClick={saveToHistory} style={{
                padding:"10px 14px", borderRadius:8, border:"1px solid #10b981",
                background:"rgba(16,185,129,0.15)", color:"#34d399", fontWeight:700,
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s"
              }} title="Guardar en Historial para Reporte PDF">
                <BookOpen size={16} />
              </button>
            )}
          </div>

          {/* Badges */}
          {result && (
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <span style={{ padding:"3px 10px", borderRadius:20, background:"rgba(130,170,255,0.1)", border:"1px solid #82aaff44", fontSize:11, color:"#82aaff", fontWeight:600 }}>
                {result.stmtType}
              </span>
              <span style={{ padding:"3px 10px", borderRadius:20, background:"rgba(195,232,141,0.1)", border:"1px solid #c3e88d44", fontSize:11, color:"#c3e88d", fontWeight:600 }}>
                {result.nodes.length} pasos
              </span>
              {warnCount > 0 && (
                <span style={{ padding:"3px 10px", borderRadius:20, background:"rgba(255,203,107,0.1)", border:"1px solid #ffcb6b44", fontSize:11, color:"#ffcb6b", fontWeight:700 }}>
                  ⚠ {warnCount} advertencia{warnCount>1?"s":""}
                </span>
              )}
              {lockCount > 0 && (
                <span style={{ padding:"3px 10px", borderRadius:20, background:"rgba(255,83,112,0.1)", border:"1px solid #ff537044", fontSize:11, color:"#ff5370", fontWeight:700 }}>
                  🔒 {lockCount} bloqueo{lockCount>1?"s":""}
                </span>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Diagram */}
        <div style={{ border:"1px solid var(--border)", borderRadius:12, background:"#060d13", overflow:"auto", position:"relative" }}>
          <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8, position:"sticky", top:0, background:"#060d13", zIndex:2 }}>
            <Layers size={13} color="#c3e88d" />
            <span style={{ fontSize:12, fontWeight:600, color:"var(--text-secondary)" }}>Diagrama de Flujo</span>
          </div>
          <div style={{
            padding:"32px 20px", display:"flex", flexDirection:"column", alignItems:"center",
            minHeight:400, backgroundImage:"radial-gradient(circle, #1a2530 1px, transparent 1px)",
            backgroundSize:"24px 24px"
          }}>
            {!result && (
              <div style={{ margin:"auto", textAlign:"center", color:"#3a5060" }}>
                <Search size={40} style={{ marginBottom:12, opacity:0.4 }} />
                <p style={{ fontSize:13 }}>Analiza una query para ver el diagrama</p>
              </div>
            )}
            {result && rows.length === 0 && (
              <div style={{ margin:"auto", textAlign:"center", color:"#3a5060" }}>
                <Info size={40} style={{ marginBottom:12, opacity:0.4 }} />
                <p style={{ fontSize:13 }}>No se detectaron cláusulas visualizables</p>
              </div>
            )}
            {rows.map((row, i) => {
              if (row.kind === "from_group") {
                return <FromGroup key={i} tables={row.tables} hasNext={i < rows.length - 1} />;
              }
              return <DiagramNode key={i} node={row.node} isLast={i === rows.length - 1} />;
            })}
          </div>
        </div>
      </div>

      {/* Bottom panels */}
      {result && (
        <div style={{ border:"1px solid var(--border)", borderRadius:12, background:"var(--bg-surface)", overflow:"hidden" }}>
          {/* Tabs */}
          <div style={{ display:"flex", borderBottom:"1px solid var(--border)", background:"var(--bg-card)" }}>
            {PANEL_TABS.map(tab => (
              <button key={tab.id} onClick={()=>setActivePanel(tab.id)} style={{
                padding:"10px 18px", border:"none", background:"transparent", cursor:"pointer",
                fontSize:12, fontWeight:600, transition:"all 0.2s",
                color: activePanel===tab.id ? tab.color : "var(--text-muted)",
                borderBottom: activePanel===tab.id ? `2px solid ${tab.color}` : "2px solid transparent",
                display:"flex", alignItems:"center", gap:6
              }}>
                {tab.label}
                {tab.count != null && tab.count > 0 && (
                  <span style={{ padding:"1px 6px", borderRadius:10, background:`${tab.color}22`, fontSize:10, color:tab.color, fontWeight:700 }}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          <div style={{ padding:16, maxHeight:300, overflowY:"auto" }}>
            {/* Warnings panel */}
            {activePanel==="warnings" && (
              <>
                {result.warnings.length === 0 && <p style={{ color:"#4a9060", fontSize:13 }}>✅ No se detectaron antipatrones.</p>}
                {result.warnings.map((w,i) => <WarnCard key={i} w={w} />)}
              </>
            )}

            {/* Locks panel */}
            {activePanel==="locks" && (
              <>
                {result.locks.length === 0 && <p style={{ color:"#4a9060", fontSize:13 }}>✅ No se detectaron riesgos de bloqueo.</p>}
                {result.locks.map((l,i) => <LockCard key={i} l={l} />)}
              </>
            )}

            {/* Dictionary panel */}
            {activePanel==="dict" && (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {dictTables.length === 0 && <p style={{ color:"var(--text-muted)", fontSize:13 }}>No se encontraron tablas del schema invme en la query.</p>}
                {dictTables.map(tbl => {
                  const info = SCHEMA[tbl];
                  return (
                    <div key={tbl} style={{ border:"1px solid var(--border)", borderRadius:8, overflow:"hidden" }}>
                      <div style={{ padding:"8px 14px", background:"rgba(130,170,255,0.07)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8 }}>
                        <Database size={12} color="#82aaff" />
                        <span style={{ fontWeight:700, fontSize:12, fontFamily:"monospace", color:"#82aaff" }}>{tbl}</span>
                        <span style={{ fontSize:11, color:"var(--text-muted)", marginLeft:4 }}>— {info.desc}</span>
                      </div>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                        <thead>
                          <tr style={{ background:"var(--bg-card)" }}>
                            {["Columna","Tipo","PK","FK","Null"].map(h=>(
                              <th key={h} style={{ padding:"5px 10px", textAlign:"left", color:"var(--text-muted)", fontWeight:600, borderBottom:"1px solid var(--border)" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {info.cols.map((col,i) => (
                            <tr key={i} style={{ borderBottom:"1px solid var(--border)", background: i%2===0?"transparent":"rgba(255,255,255,0.02)" }}>
                              <td style={{ padding:"5px 10px", fontFamily:"monospace", color: col.pk?"#c3e88d":"var(--text-primary)", fontWeight:col.pk?700:400 }}>{col.n}</td>
                              <td style={{ padding:"5px 10px", fontFamily:"monospace", color:"#607080" }}>{col.t}</td>
                              <td style={{ padding:"5px 10px", color:"#c3e88d" }}>{col.pk?"🔑":""}</td>
                              <td style={{ padding:"5px 10px", color:"#80cbc4", fontFamily:"monospace", fontSize:10 }}>{col.fk||""}</td>
                              <td style={{ padding:"5px 10px", color: col.null===true?"#607080":"var(--text-muted)" }}>{col.null===true?"SÍ":"NO"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}

            {/* EXPLAIN plan panel */}
            {activePanel==="plan" && (
              <div>
                {!explain && <p style={{ color:"var(--text-muted)", fontSize:13 }}>Haz clic en "EXPLAIN via BD" para obtener el plan de ejecución real de PostgreSQL.</p>}
                {explain && !explain.ok && (
                  <div style={{ border:"1px solid #ff5370", borderRadius:8, padding:12, background:"rgba(255,83,112,0.07)" }}>
                    {explain.syntaxError ? (
                      <>
                        <p style={{ color:"#ff5370", fontWeight:700, margin:"0 0 6px", fontSize:13 }}>❌ Error de sintaxis PostgreSQL</p>
                        <p style={{ color:"#ccc", fontSize:12, fontFamily:"monospace", margin:"0 0 4px" }}>{explain.syntaxError.message}</p>
                        {explain.syntaxError.detail && <p style={{ color:"#999", fontSize:11, margin:"0 0 4px" }}>Detalle: {explain.syntaxError.detail}</p>}
                        {explain.syntaxError.hint && <p style={{ color:"#4a9060", fontSize:11, margin:0 }}>💡 Sugerencia: {explain.syntaxError.hint}</p>}
                      </>
                    ) : (
                      <p style={{ color:"#ff5370", fontSize:13, margin:0 }}>❌ {explain.error}</p>
                    )}
                  </div>
                )}
                {explain && explain.ok && explain.plan && (
                  <div>
                    <div style={{ display:"flex", gap:10, marginBottom:10, flexWrap:"wrap" }}>
                      {explain.plan["Total Cost"] != null && (
                        <span style={{ padding:"3px 10px", borderRadius:20, background:"rgba(199,146,234,0.1)", border:"1px solid #c792ea44", fontSize:11, color:"#c792ea", fontWeight:600 }}>
                          Cost: {explain.plan["Total Cost"]?.toFixed(2)}
                        </span>
                      )}
                      {explain.plan["Plan Rows"] != null && (
                        <span style={{ padding:"3px 10px", borderRadius:20, background:"rgba(130,170,255,0.1)", border:"1px solid #82aaff44", fontSize:11, color:"#82aaff", fontWeight:600 }}>
                          Rows est.: {explain.plan["Plan Rows"]}
                        </span>
                      )}
                      {explain.plan["Node Type"] && (
                        <span style={{ padding:"3px 10px", borderRadius:20, background:"rgba(195,232,141,0.1)", border:"1px solid #c3e88d44", fontSize:11, color:"#c3e88d", fontWeight:600 }}>
                          {explain.plan["Node Type"]}
                        </span>
                      )}
                    </div>
                    <pre style={{ fontFamily:"monospace", fontSize:11, color:"#8899aa", background:"#060d13", padding:14, borderRadius:8, overflowX:"auto", maxHeight:220, margin:0 }}>
                      {JSON.stringify(explain.plan, null, 2)}
                    </pre>
                    {explain.tables?.length > 0 && (
                      <p style={{ fontSize:11, color:"var(--text-muted)", marginTop:8 }}>
                        Tablas en plan: {explain.tables.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
