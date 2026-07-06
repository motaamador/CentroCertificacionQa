"use client";

import { useState, useEffect } from "react";
import { Play, Save, Trash2, CheckCircle2, XCircle, Code, Plus, List, Dices, Activity } from "lucide-react";

export default function FnTester() {
  const [functions, setFunctions] = useState([]);
  const [selectedFn, setSelectedFn] = useState(null);
  const [params, setParams] = useState({});
  const [expectType, setExpectType] = useState("any");
  const [expectValue, setExpectValue] = useState("");
  const [customField, setCustomField] = useState("");
  const [customOperator, setCustomOperator] = useState("=");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savedCases, setSavedCases] = useState([]);
  const [isBenchmark, setIsBenchmark] = useState(false);
  const [benchmarkRuns, setBenchmarkRuns] = useState(50);
  const [suiteRunning, setSuiteRunning] = useState(false);
  const [suiteProgress, setSuiteProgress] = useState(null);

  useEffect(() => {
    const env = localStorage.getItem("qa_env") || "dev";
    fetch("/api/fn-tester?schema=invme", { headers: { "x-qa-env": env } })
      .then(r => r.json())
      .then(d => setFunctions(d.functions || []))
      .catch(console.error);
    const saved = localStorage.getItem("qa_fn_cases");
    if (saved) setSavedCases(JSON.parse(saved));
  }, []);

  const generateMockData = () => {
    if (!selectedFn) return;
    const newParams = { ...params };
    selectedFn.parametros?.forEach(p => {
      const type = p.udt_name || p.tipo;
      if (type.includes("int") || type === "numeric" || type === "bigint") {
        newParams[p.nombre] = Math.floor(Math.random() * 1000) + 1;
      } else if (type.includes("char") || type === "text") {
        newParams[p.nombre] = "TEST-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      } else if (type.includes("json")) {
        newParams[p.nombre] = JSON.stringify({ test_key: `val_${Math.floor(Math.random()*1000)}` });
      } else if (type === "boolean" || type === "bool") {
        newParams[p.nombre] = Math.random() > 0.5 ? "true" : "false";
      } else if (type === "date" || type === "timestamp") {
        newParams[p.nombre] = new Date().toISOString().slice(0, 10);
      }
    });
    setParams(newParams);
  };

  const handleRun = async () => {
    setLoading(true);
    setResult(null);
    try {
      const pArr = selectedFn.parametros?.map(p => {
        let val = params[p.nombre];
        if (typeof val === 'string') {
          val = val.trim();
          if (val.startsWith("'") && val.endsWith("'")) {
            val = val.slice(1, -1);
          }
        }
        return (val === undefined || val === "") ? null : val;
      }) || [];
      const sqlArgs = selectedFn.parametros?.map((p, i) => `$${i+1}::${p.udt_name || p.tipo}`).join(",") || "";
      const isTable = selectedFn.categoria_retorno === "table" || selectedFn.categoria_retorno === "setof";
      const sql = isTable 
        ? `SELECT * FROM ${selectedFn.esquema}.${selectedFn.nombre}(${sqlArgs})`
        : `SELECT ${selectedFn.esquema}.${selectedFn.nombre}(${sqlArgs})`;

      const env = localStorage.getItem("qa_env") || "dev";
      const res = await fetch("/api/fn-tester", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-qa-env": env },
        body: JSON.stringify({ sql, params: pArr, benchmarkRuns: isBenchmark ? benchmarkRuns : 1 }),
      });
      const data = await res.json();
      
      // Assertion logic
      let pass = true;
      let msg = "Ejecución completada";
      
      if (data.isStressTest) {
        pass = data.failCount === 0;
        msg = data.message;
      } else {
        if (expectType === "not_null" && data.scalarValue === null) { pass = false; msg = "Se esperaba un valor distinto de NULL"; }
      if (expectType === "is_null" && data.scalarValue !== null) { pass = false; msg = "Se esperaba NULL"; }
      if (expectType === "has_rows" && data.rowCount === 0) { pass = false; msg = "Se esperaban filas"; }
      if (expectType === "custom_eval") {
        if (!data.rows || data.rows.length === 0) {
          pass = false; msg = "Falló: No se retornaron filas para evaluar.";
        } else {
          let failedRow = null;
          let failedVal = null;
          let totalChecked = 0;
          
          for (let i = 0; i < data.rows.length; i++) {
            const row = data.rows[i];
            const val = row[customField];
            let rowPass = false;
            
            const valStr = String(val);
            const expStr = String(expectValue);
            const valNum = Number(val);
            const expNum = Number(expectValue);

            if (customOperator === "=") rowPass = valStr === expStr;
            else if (customOperator === "!=") rowPass = valStr !== expStr;
            else if (customOperator === ">") rowPass = valNum > expNum;
            else if (customOperator === "<") rowPass = valNum < expNum;
            else if (customOperator === "CONTIENE") rowPass = valStr.includes(expStr);

            totalChecked++;
            if (!rowPass) {
              failedRow = i + 1;
              failedVal = val;
              break;
            }
          }
          
          if (failedRow !== null) {
            pass = false;
            msg = `Falló en fila ${failedRow}: Columna '${customField}' ('${failedVal}') NO es ${customOperator} '${expectValue}'`;
          } else {
            pass = true;
            msg = `Validado OK (${totalChecked} filas cumplen: '${customField}' ${customOperator} '${expectValue}')`;
          }
          }
        }
      }
      
      setResult({ ...data, pass, assertMsg: msg });

      // Save to qa_history for the PDF report
      const historyEntry = {
        type: "fn",
        status: pass ? "pass" : "fail",
        command: `FN: ${selectedFn.esquema}.${selectedFn.nombre}`,
        message: pass ? "✅ QA Assertion Pasó" : "❌ QA Assertion Falló",
        latency: data.latency,
        details: [
          `Parámetros: ${JSON.stringify(params)}`,
          `Aserción: ${msg}`,
          `Resultado Real: ${data.isStressTest ? data.message : JSON.stringify(data.rows || data.scalarValue || data.message).substring(0, 500)}`
        ],
        timestamp: Date.now()
      };
      const h = JSON.parse(localStorage.getItem("qa_history") || "[]");
      h.unshift(historyEntry);
      localStorage.setItem("qa_history", JSON.stringify(h.slice(0, 100)));
    } catch (e) {
      setResult({ status: "error", message: e.message, pass: false, assertMsg: "Error de ejecución" });
    }
    setLoading(false);
  };

  const handleSave = () => {
    const newCase = {
      id: Date.now(),
      fnName: selectedFn.nombre,
      params,
      expectType,
      expectValue,
      customField,
      customOperator
    };
    const updated = [...savedCases, newCase];
    setSavedCases(updated);
    localStorage.setItem("qa_fn_cases", JSON.stringify(updated));
  };

  const handleRunSuite = async () => {
    if (savedCases.length === 0) return;
    setSuiteRunning(true);
    let passed = 0;
    let failed = 0;
    
    for (const c of savedCases) {
      setSuiteProgress(`Ejecutando ${c.fnName}...`);
      const fnDef = functions.find(f => f.nombre === c.fnName);
      if (!fnDef) { failed++; continue; }
      
      const pArr = fnDef.parametros?.map(p => {
        let val = c.params[p.nombre];
        if (typeof val === 'string') {
          val = val.trim();
          if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        }
        return (val === undefined || val === "") ? null : val;
      }) || [];
      const sqlArgs = fnDef.parametros?.map((p, i) => `$${i+1}::${p.udt_name || p.tipo}`).join(",") || "";
      const isTable = fnDef.categoria_retorno === "table" || fnDef.categoria_retorno === "setof";
      const sql = isTable 
        ? `SELECT * FROM ${fnDef.esquema}.${fnDef.nombre}(${sqlArgs})`
        : `SELECT ${fnDef.esquema}.${fnDef.nombre}(${sqlArgs})`;

      try {
        const env = localStorage.getItem("qa_env") || "dev";
        const res = await fetch("/api/fn-tester", {
          method: "POST", headers: { "Content-Type": "application/json", "x-qa-env": env },
          body: JSON.stringify({ sql, params: pArr })
        });
        const data = await res.json();
        
        let pass = true;
        if (c.expectType === "not_null" && data.scalarValue === null) pass = false;
        if (c.expectType === "is_null" && data.scalarValue !== null) pass = false;
        if (c.expectType === "has_rows" && data.rowCount === 0) pass = false;
        if (c.expectType === "custom_eval") {
          if (!data.rows || data.rows.length === 0) pass = false;
          else {
            for (const row of data.rows) {
              const val = row[c.customField];
              let rowPass = false;
              const valStr = String(val); const expStr = String(c.expectValue);
              const valNum = Number(val); const expNum = Number(c.expectValue);
              if (c.customOperator === "=") rowPass = valStr === expStr;
              else if (c.customOperator === "!=") rowPass = valStr !== expStr;
              else if (c.customOperator === ">") rowPass = valNum > expNum;
              else if (c.customOperator === "<") rowPass = valNum < expNum;
              else if (c.customOperator === "CONTIENE") rowPass = valStr.includes(expStr);
              if (!rowPass) { pass = false; break; }
            }
          }
        }
        if (pass) passed++; else failed++;
      } catch (e) {
        failed++;
      }
    }
    
    setSuiteProgress(null);
    setSuiteRunning(false);
    
    const historyEntry = {
      type: "fn",
      status: failed === 0 ? "pass" : "fail",
      command: `SUITE DE REGRESIÓN: ${savedCases.length} casos`,
      message: failed === 0 ? `✅ Suite Pasó Perfecta (${passed}/${savedCases.length})` : `❌ Suite Falló (${failed} errores)`,
      latency: 0,
      details: [`Casos Evaluados: ${savedCases.length}`, `Exitosos: ${passed}`, `Fallidos: ${failed}`],
      timestamp: Date.now()
    };
    const h = JSON.parse(localStorage.getItem("qa_history") || "[]");
    h.unshift(historyEntry);
    localStorage.setItem("qa_history", JSON.stringify(h.slice(0, 100)));
    
    setResult({
      pass: failed === 0,
      assertMsg: `Suite Finalizada: ${passed} Pasaron, ${failed} Fallaron`,
      message: "Se guardó un registro consolidado de la Suite en el Reporte PDF."
    });
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        
        {/* Panel Izquierdo: Funciones */}
        <div className="qa-card">
          <h3 style={{marginTop:0}}>Catálogo de Funciones</h3>
          <select className="qa-select" onChange={e => {
            const fn = functions.find(f => f.nombre === e.target.value);
            setSelectedFn(fn);
            setParams({});
            setResult(null);
          }}>
            <option value="">-- Seleccionar Función --</option>
            {functions.map(f => <option key={f.nombre} value={f.nombre}>{f.nombre} ({f.categoria_retorno})</option>)}
          </select>

          {selectedFn && (
            <div style={{marginTop: 20}}>
              <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                <h4 style={{margin: 0}}>Parámetros</h4>
                <button className="btn-ghost" onClick={generateMockData} style={{fontSize: 11, padding: "4px 8px"}}>
                  <Dices size={12} /> Auto-llenar (Mock)
                </button>
              </div>
              <div style={{marginTop: 10}}>
              {selectedFn.parametros?.map(p => (
                <div key={p.nombre} style={{marginBottom: 10}}>
                  <label style={{fontSize: 12}}>{p.nombre} ({p.tipo}) {p.requerido?'*':''}</label>
                  <input className="qa-input" type="text" value={params[p.nombre] || ""}
                    onChange={e => setParams({...params, [p.nombre]: e.target.value})} />
                </div>
              ))}
              </div>
              
              <h4 style={{marginTop: 20}}>Assertion QA</h4>
              <select className="qa-select" value={expectType} onChange={e => setExpectType(e.target.value)} style={{marginBottom: expectType === 'custom_eval' ? 10 : 0}}>
                <option value="any">Cualquier resultado (solo ejecutar)</option>
                <option value="not_null">Debe retornar NO NULL (Id positivo, etc)</option>
                <option value="is_null">Debe retornar NULL (Fallo controlado)</option>
                <option value="has_rows">Debe devolver al menos 1 fila</option>
                <option value="custom_eval">Validación Avanzada por Columna</option>
              </select>

              {expectType === "custom_eval" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, padding: 12, background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, marginBottom: 10 }}>
                  <div>
                    <label style={{fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 4}}>Columna</label>
                    <input className="qa-input" placeholder="Ej: saldo" value={customField} onChange={e => setCustomField(e.target.value)} style={{fontSize: 12, padding: "6px 10px"}} />
                  </div>
                  <div>
                    <label style={{fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 4}}>Operador</label>
                    <select className="qa-select" value={customOperator} onChange={e => setCustomOperator(e.target.value)} style={{fontSize: 12, padding: "6px 10px"}}>
                      <option value="=">=</option>
                      <option value="!=">!=</option>
                      <option value=">">&gt;</option>
                      <option value="<">&lt;</option>
                      <option value="CONTIENE">CONTIENE</option>
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 4}}>Valor esperado</label>
                    <input className="qa-input" placeholder="Ej: 0" value={expectValue} onChange={e => setExpectValue(e.target.value)} style={{fontSize: 12, padding: "6px 10px"}} />
                  </div>
                </div>
              )}

              {/* Stress Test */}
              <div style={{marginTop: 20, padding: 12, background: isBenchmark ? "rgba(239,68,68,0.05)" : "var(--bg-surface)", border: `1px solid ${isBenchmark ? "rgba(239,68,68,0.3)" : "var(--border)"}`, borderRadius: 8}}>
                <label style={{display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: isBenchmark ? "#ef4444" : "var(--text-primary)", cursor: "pointer"}}>
                  <input type="checkbox" checked={isBenchmark} onChange={e => setIsBenchmark(e.target.checked)} />
                  <Activity size={14} /> Prueba de Estrés (Benchmark)
                </label>
                {isBenchmark && (
                  <div style={{marginTop: 10, display: "flex", alignItems: "center", gap: 10}}>
                    <span style={{fontSize: 11, color: "var(--text-muted)"}}>Ejecuciones en lote:</span>
                    <input type="number" className="qa-input" value={benchmarkRuns} onChange={e => setBenchmarkRuns(Number(e.target.value))} style={{width: 80, padding: "4px 8px"}} min="1" max="1000" />
                  </div>
                )}
              </div>

              <div style={{marginTop: 20, display: "flex", gap: 10}}>
                <button className="btn-primary" onClick={handleRun} disabled={loading} style={{background: isBenchmark ? "#ef4444" : ""}}>
                  {isBenchmark ? <Activity size={16} /> : <Play size={16} />} 
                  {loading ? "Ejecutando..." : (isBenchmark ? "Lanzar Estrés" : "Ejecutar Prueba")}
                </button>
                <button className="btn-ghost" onClick={handleSave}>
                  <Save size={16} /> Guardar Caso
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Panel Derecho: Resultados y Casos */}
        <div style={{display: "flex", flexDirection: "column", gap: 20}}>
          <div className="qa-card">
            <h3 style={{marginTop:0}}>Resultado Actual</h3>
            {!result ? <p style={{fontSize: 13, color: "var(--text-muted)"}}>No hay resultados</p> : (
              <div>
                <div style={{display: "flex", alignItems: "center", gap: 10, marginBottom: 15}}>
                  {result.pass ? <CheckCircle2 color="#10b981"/> : <XCircle color="#ef4444"/>}
                  <span style={{fontWeight: "bold", color: result.pass ? "#10b981" : "#ef4444"}}>
                    {result.assertMsg}
                  </span>
                </div>
                <pre style={{background: "var(--bg-surface)", padding: 10, borderRadius: 5, fontSize: 12, overflowX: "auto"}}>
                  {JSON.stringify(result.rows || result.scalarValue || result.message, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="qa-card">
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
              <h3 style={{marginTop:0, marginBottom:0}}>Casos Guardados (Suite)</h3>
              {savedCases.length > 0 && (
                <button className="btn-primary" onClick={handleRunSuite} disabled={suiteRunning} style={{background: "linear-gradient(135deg, #8b5cf6, #6366f1)", padding: "4px 12px", fontSize: 12}}>
                  {suiteRunning ? suiteProgress : <><Play size={12}/> Ejecutar Suite ({savedCases.length})</>}
                </button>
              )}
            </div>
            <hr style={{opacity: 0.1, margin: "10px 0"}} />
            {savedCases.length === 0 ? <p style={{fontSize: 13, color: "var(--text-muted)"}}>No hay casos</p> : (
              <ul style={{listStyle: "none", padding: 0}}>
                {savedCases.map(c => (
                  <li key={c.id} style={{background: "var(--bg-surface)", padding: 10, borderRadius: 5, marginBottom: 10, display: "flex", justifyContent: "space-between"}}>
                    <div>
                      <strong>{c.fnName}</strong> <br/>
                      <span style={{fontSize: 12, color: "var(--text-muted)"}}>Esperado: {c.expectType}</span>
                    </div>
                    <button className="btn-ghost" style={{padding: 5}} onClick={() => {
                      const updated = savedCases.filter(sc => sc.id !== c.id);
                      setSavedCases(updated);
                      localStorage.setItem("qa_fn_cases", JSON.stringify(updated));
                    }}><Trash2 size={14} color="#ef4444"/></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
