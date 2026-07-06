"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Plus, Play, Trash2, ChevronDown, ChevronRight, Check, X, AlertTriangle, Database, Globe, BookOpen, Zap } from "lucide-react";
import { SectionHeader } from "@/components/ui";

const uid = () => Math.random().toString(36).slice(2, 9);
const METHODS = ["GET","POST","PUT","DELETE","PATCH"];
const METHOD_COLOR = { GET:"#10b981",POST:"#3b82f6",PUT:"#f59e0b",DELETE:"#ef4444",PATCH:"#8b5cf6" };
const ASSERTION_TARGETS = [
  {value:"status",label:"Status HTTP"},{value:"latency",label:"Latencia (ms)"},
  {value:"body_contains",label:"Body contiene"},{value:"body_json_path",label:"JSONPath en body"},
  {value:"header",label:"Header"},
];
const ASSERTION_OPS = [
  {value:"equals",label:"= igual"},{value:"not_equals",label:"≠ diferente"},
  {value:"contains",label:"contiene"},{value:"not_contains",label:"no contiene"},
  {value:"less_than",label:"< menor"},{value:"greater_than",label:"> mayor"},
  {value:"exists",label:"existe"},{value:"matches_regex",label:"regex"},
];
const newStep = () => ({id:uid(),name:"Nuevo Paso",type:"http",method:"GET",url:"",headers:'{"Content-Type":"application/json"}',body:"",query:"",assertions:[],captures:[]});
const newCollection = () => ({id:uid(),name:"Nueva Colección",description:"",stopOnFailure:true,steps:[newStep()]});
const newAssertion = () => ({id:uid(),target:"status",operator:"equals",path:"",expected:"200"});
const newCapture = () => ({id:uid(),varName:"",source:"body_json_path",path:""});

// ── Demo collection (JSONPlaceholder) ─────────────────────────────────────────
const DEMO_COLLECTION = () => ({
  id: uid(),
  name: "Demo — JSONPlaceholder CRUD",
  description: "Crea un post, captura su ID y verifica el usuario. API pública, no requiere credenciales.",
  stopOnFailure: false,
  steps: [
    {
      id: uid(), name: "1. Crear Post", type: "http", method: "POST",
      url: "{{baseUrl}}/posts",
      headers: '{"Content-Type":"application/json"}',
      body: '{"title":"Test QA Centro Certificación","body":"Prueba automatizada del motor de colecciones","userId":1}',
      query: "",
      assertions: [
        {id:uid(), target:"status",        operator:"equals",   path:"",      expected:"201"},
        {id:uid(), target:"latency",       operator:"less_than",path:"",      expected:"4000"},
        {id:uid(), target:"body_contains", operator:"contains", path:"",      expected:"Test QA"},
        {id:uid(), target:"body_json_path",operator:"exists",   path:"$.id",  expected:""},
      ],
      captures: [
        {id:uid(), varName:"postId", source:"body_json_path", path:"$.id"},
        {id:uid(), varName:"userId", source:"body_json_path", path:"$.userId"},
      ],
    },
    {
      id: uid(), name: "2. Verificar Post", type: "http", method: "GET",
      url: "{{baseUrl}}/posts/{{postId}}",
      headers: '{"Content-Type":"application/json"}',
      body: "", query: "",
      assertions: [
        {id:uid(), target:"status",         operator:"equals",   path:"",       expected:"200"},
        {id:uid(), target:"latency",        operator:"less_than",path:"",       expected:"3000"},
        {id:uid(), target:"body_json_path", operator:"exists",   path:"$.title",expected:""},
        {id:uid(), target:"body_json_path", operator:"equals",   path:"$.userId",expected:"1"},
      ],
      captures: [],
    },
    {
      id: uid(), name: "3. Datos del Usuario", type: "http", method: "GET",
      url: "{{baseUrl}}/users/{{userId}}",
      headers: '{"Content-Type":"application/json"}',
      body: "", query: "",
      assertions: [
        {id:uid(), target:"status",         operator:"equals", path:"",        expected:"200"},
        {id:uid(), target:"body_json_path", operator:"exists", path:"$.email", expected:""},
        {id:uid(), target:"body_json_path", operator:"exists", path:"$.name",  expected:""},
        {id:uid(), target:"body_contains",  operator:"contains",path:"",       expected:"Leanne"},
      ],
      captures: [],
    },
  ],
});

function ipt(extra={}) { return { padding:"6px 10px", borderRadius:6, border:"1px solid var(--border)", background:"var(--bg-surface)", color:"var(--text-primary)", fontSize:12, fontFamily:"var(--font-geist-mono)", outline:"none", width:"100%", boxSizing:"border-box", ...extra }; }

function AssertionRow({a, onChange, onDelete}) {
  const needsPath = a.target==="body_json_path"||a.target==="header";
  const needsVal  = !["exists","not_exists"].includes(a.operator);
  return (
    <div style={{display:"grid",gridTemplateColumns:"140px 130px 1fr 1fr auto",gap:6,alignItems:"center",marginBottom:6}}>
      <select value={a.target} onChange={e=>onChange({...a,target:e.target.value})} style={ipt()}>
        {ASSERTION_TARGETS.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <select value={a.operator} onChange={e=>onChange({...a,operator:e.target.value})} style={ipt()}>
        {ASSERTION_OPS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <input placeholder={needsPath?"$.data.token o header-name":""} value={a.path} onChange={e=>onChange({...a,path:e.target.value})} style={ipt({opacity:needsPath?1:0.3})} disabled={!needsPath}/>
      <input placeholder="Valor esperado" value={a.expected} onChange={e=>onChange({...a,expected:e.target.value})} style={ipt({opacity:needsVal?1:0.3})} disabled={!needsVal}/>
      <button onClick={onDelete} style={{background:"none",border:"none",cursor:"pointer",color:"#ef4444",padding:4}}><Trash2 size={13}/></button>
    </div>
  );
}

function CaptureRow({c, onChange, onDelete}) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"130px 150px 1fr auto",gap:6,alignItems:"center",marginBottom:6}}>
      <input placeholder="nombreVar" value={c.varName} onChange={e=>onChange({...c,varName:e.target.value})} style={ipt({color:"#c3e88d"})}/>
      <select value={c.source} onChange={e=>onChange({...c,source:e.target.value})} style={ipt()}>
        <option value="body_json_path">JSONPath body</option>
        <option value="header">Header</option>
        <option value="status">Status</option>
      </select>
      <input placeholder="$.data.token" value={c.path} onChange={e=>onChange({...c,path:e.target.value})} style={ipt()}/>
      <button onClick={onDelete} style={{background:"none",border:"none",cursor:"pointer",color:"#ef4444",padding:4}}><Trash2 size={13}/></button>
    </div>
  );
}

function StepCard({step, index, onChange, onDelete}) {
  const [open,setOpen]=useState(true);
  const [subTab,setSubTab]=useState("config");
  const upd = (patch) => onChange({...step,...patch});
  const SubBtn = (t,label) => (
    <button onClick={()=>setSubTab(t)} style={{padding:"4px 10px",fontSize:11,borderRadius:5,border:"none",cursor:"pointer",background:subTab===t?"var(--bg-card)":"transparent",color:subTab===t?"var(--text-primary)":"var(--text-muted)",fontWeight:subTab===t?700:400}}>
      {label}{t==="assertions"&&step.assertions.length>0?` (${step.assertions.length})`:""}
      {t==="captures"&&step.captures.length>0?` (${step.captures.length})`:""}
    </button>
  );
  return (
    <div style={{border:"1px solid var(--border)",borderRadius:10,marginBottom:10,overflow:"hidden",background:"var(--bg-surface)"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer",background:"var(--bg-card)"}}>
        <div style={{width:22,height:22,borderRadius:6,background:step.type==="db"?"rgba(139,92,246,0.2)":"rgba(59,130,246,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {step.type==="db"?<Database size={11} color="#8b5cf6"/>:<Globe size={11} color="#3b82f6"/>}
        </div>
        <span style={{fontSize:11,color:"var(--text-muted)",fontWeight:700}}>#{index+1}</span>
        <input value={step.name} onChange={e=>{e.stopPropagation();upd({name:e.target.value})}} onClick={e=>e.stopPropagation()} style={{flex:1,background:"transparent",border:"none",color:"var(--text-primary)",fontWeight:600,fontSize:13,outline:"none"}}/>
        {step.type==="http"&&<span style={{fontSize:10,fontWeight:700,color:METHOD_COLOR[step.method]||"#888"}}>{step.method}</span>}
        <button onClick={e=>{e.stopPropagation();onDelete()}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",padding:2}}><Trash2 size={13}/></button>
        {open?<ChevronDown size={14} color="var(--text-muted)"/>:<ChevronRight size={14} color="var(--text-muted)"/>}
      </div>

      <AnimatePresence>
        {open&&(
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} style={{overflow:"hidden"}}>
            <div style={{padding:"12px 14px"}}>
              {/* Type toggle */}
              <div style={{display:"flex",gap:6,marginBottom:12}}>
                {["http","db"].map(t=>(
                  <button key={t} onClick={()=>upd({type:t})} style={{padding:"4px 12px",borderRadius:6,border:`1px solid ${step.type===t?"var(--accent-blue)":"var(--border)"}`,background:step.type===t?"rgba(59,130,246,0.1)":"transparent",color:step.type===t?"var(--accent-blue)":"var(--text-muted)",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Sub-tabs */}
              <div style={{display:"flex",gap:2,marginBottom:12,background:"var(--bg-surface)",borderRadius:6,padding:3,width:"fit-content"}}>
                {SubBtn("config","Config")}
                {SubBtn("assertions","Aserciones")}
                {SubBtn("captures","Capturas")}
              </div>

              {subTab==="config"&&(
                step.type==="http"?(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <div style={{display:"flex",gap:8}}>
                      <select value={step.method} onChange={e=>upd({method:e.target.value})} style={ipt({width:90,color:METHOD_COLOR[step.method],fontWeight:700})}>
                        {METHODS.map(m=><option key={m} value={m}>{m}</option>)}
                      </select>
                      <input value={step.url} onChange={e=>upd({url:e.target.value})} placeholder="https://api.example.com/endpoint  o  {{baseUrl}}/login" style={ipt({flex:1})}/>
                    </div>
                    <textarea value={step.headers} onChange={e=>upd({headers:e.target.value})} placeholder='{"Authorization":"Bearer {{token}}"}' style={ipt({minHeight:60,resize:"vertical"})}/>
                    {["POST","PUT","PATCH"].includes(step.method)&&(
                      <textarea value={step.body} onChange={e=>upd({body:e.target.value})} placeholder='{"user":"{{user}}","pass":"{{pass}}"}' style={ipt({minHeight:80,resize:"vertical"})}/>
                    )}
                  </div>
                ):(
                  <textarea value={step.query} onChange={e=>upd({query:e.target.value})} placeholder="SELECT * FROM usuario WHERE id = {{userId}} LIMIT 1;" style={ipt({minHeight:100,resize:"vertical"})}/>
                )
              )}

              {subTab==="assertions"&&(
                <div>
                  <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:8}}>Define las reglas que deben cumplirse para que este paso sea exitoso</div>
                  {step.assertions.map((a,i)=>(
                    <AssertionRow key={a.id} a={a}
                      onChange={updated=>upd({assertions:step.assertions.map((x,j)=>j===i?updated:x)})}
                      onDelete={()=>upd({assertions:step.assertions.filter((_,j)=>j!==i)})}
                    />
                  ))}
                  <button onClick={()=>upd({assertions:[...step.assertions,newAssertion()]})} style={{fontSize:11,color:"var(--accent-blue)",background:"rgba(59,130,246,0.08)",border:"1px dashed rgba(59,130,246,0.3)",borderRadius:6,padding:"5px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                    <Plus size={11}/> Agregar Aserción
                  </button>
                </div>
              )}

              {subTab==="captures"&&(
                <div>
                  <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:8}}>Extrae valores de la respuesta y guárdalos como <code style={{color:"#c3e88d"}}>{"{{variable}}"}</code> para los pasos siguientes</div>
                  {step.captures.map((c,i)=>(
                    <CaptureRow key={c.id} c={c}
                      onChange={updated=>upd({captures:step.captures.map((x,j)=>j===i?updated:x)})}
                      onDelete={()=>upd({captures:step.captures.filter((_,j)=>j!==i)})}
                    />
                  ))}
                  <button onClick={()=>upd({captures:[...step.captures,newCapture()]})} style={{fontSize:11,color:"#c3e88d",background:"rgba(195,232,141,0.08)",border:"1px dashed rgba(195,232,141,0.3)",borderRadius:6,padding:"5px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                    <Plus size={11}/> Agregar Captura
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepResult({r, index}) {
  const [open,setOpen]=useState(!r.ok);
  const color = r.ok?"#10b981":"#ef4444";
  return (
    <div style={{border:`1px solid ${color}33`,borderRadius:10,marginBottom:8,overflow:"hidden"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer",background:`${color}08`}}>
        <div style={{width:20,height:20,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {r.ok?<Check size={11} color="white"/>:<X size={11} color="white"/>}
        </div>
        <span style={{fontSize:12,fontWeight:700,color:"var(--text-primary)",flex:1}}>#{index+1} {r.stepName}</span>
        <span style={{fontSize:10,color:"var(--text-muted)"}}>{r.type==="db"?"DB":"HTTP"}</span>
        {r.status>0&&<span style={{fontSize:11,fontWeight:700,color:r.status<300?"#10b981":r.status<500?"#f59e0b":"#ef4444"}}>{r.status}</span>}
        <span style={{fontSize:10,color:"var(--text-muted)"}}>{r.latency}ms</span>
        {open?<ChevronDown size={13} color="var(--text-muted)"/>:<ChevronRight size={13} color="var(--text-muted)"/>}
      </div>
      <AnimatePresence>
        {open&&(
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} style={{overflow:"hidden"}}>
            <div style={{padding:"10px 14px"}}>
              {r.error&&<p style={{color:"#ef4444",fontSize:12,margin:"0 0 8px"}}>❌ {r.error}</p>}
              {r.url&&<p style={{fontSize:10,color:"var(--text-muted)",margin:"0 0 6px",fontFamily:"monospace"}}>{r.url}</p>}
              {r.query&&<p style={{fontSize:10,color:"var(--text-muted)",margin:"0 0 6px",fontFamily:"monospace"}}>{r.query}</p>}
              {r.assertionResults?.length>0&&(
                <div style={{marginBottom:8}}>
                  <p style={{fontSize:10,color:"var(--text-muted)",fontWeight:700,marginBottom:4,textTransform:"uppercase"}}>Aserciones:</p>
                  {r.assertionResults.map((a,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:11,marginBottom:3}}>
                      {a.ok?<Check size={11} color="#10b981"/>:<X size={11} color="#ef4444"/>}
                      <span style={{color:a.ok?"#10b981":"#ef4444"}}>[{a.target}] {a.operator}</span>
                      <span style={{color:"var(--text-muted)",flex:1}}>{a.message}</span>
                    </div>
                  ))}
                </div>
              )}
              {r.response&&(
                <pre style={{margin:0,fontSize:10,color:"#8899aa",background:"#060d13",padding:10,borderRadius:6,overflowX:"auto",maxHeight:120}}>
                  {r.response}
                </pre>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TestCollections() {
  const [collections, setCollections] = useState(() => {
    try { return JSON.parse(localStorage.getItem("qa_collections")||"[]"); } catch { return []; }
  });
  const [selected, setSelected] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [initVars, setInitVars] = useState('{}');

  const save = (cols) => {
    setCollections(cols);
    localStorage.setItem("qa_collections", JSON.stringify(cols));
  };

  const createCollection = () => {
    const c = newCollection();
    const cols = [...collections, c];
    save(cols);
    setSelected(c.id);
    setInitVars('{}');
    setRunResult(null);
  };

  const loadDemo = () => {
    const c = DEMO_COLLECTION();
    const cols = [...collections, c];
    save(cols);
    setSelected(c.id);
    setInitVars('{"baseUrl":"https://jsonplaceholder.typicode.com"}');
    setRunResult(null);
  };

  const updateCollection = (patch) => {
    const cols = collections.map(c => c.id===selected ? {...c,...patch} : c);
    save(cols);
  };

  const deleteCollection = (id) => {
    const cols = collections.filter(c=>c.id!==id);
    save(cols);
    if (selected===id) { setSelected(null); setRunResult(null); }
  };

  const current = collections.find(c=>c.id===selected);

  const updateStep = (idx, patch) => {
    const steps = current.steps.map((s,i)=>i===idx?{...s,...patch}:s);
    updateCollection({steps});
  };

  const addStep = () => updateCollection({steps:[...current.steps, newStep()]});
  const deleteStep = (idx) => updateCollection({steps:current.steps.filter((_,i)=>i!==idx)});

  const runCollection = async () => {
    if (!current) return;
    setRunning(true);
    setRunResult(null);
    let parsedVars = {};
    try { parsedVars = JSON.parse(initVars); } catch {}
    try {
      const res = await fetch("/api/collections", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ collection: current, initialVars: parsedVars }),
      });
      const data = await res.json();
      setRunResult(data);
      // Save to qa_history
      try {
        const hist = JSON.parse(localStorage.getItem("qa_history")||"[]");
        const status = data.failedSteps===0?"pass":data.passedSteps===0?"fail":"warn";
        hist.unshift({
          type:"collection",
          status,
          message:`Colección: ${current.name} — ${data.passedSteps}/${data.totalSteps} pasos OK`,
          timestamp: Date.now(),
          latency: data.totalDuration,
          details: data.stepResults?.map(s=>`${s.ok?"✅":"❌"} ${s.stepName}`),
          stepResults: data.stepResults || [],
        });
        localStorage.setItem("qa_history", JSON.stringify(hist.slice(0,100)));
      } catch {}
    } catch(e) {
      setRunResult({ok:false,error:e.message});
    }
    setRunning(false);
  };

  return (
    <div>
      <SectionHeader title="Motor de Colecciones" desc="Crea suites de prueba encadenadas con aserciones y captura de variables {{token}}" icon={Layers} color="#8b5cf6"/>
      <div style={{display:"grid",gridTemplateColumns:"240px 1fr",gap:16,minHeight:600}}>

        {/* LEFT: Collection list */}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <button onClick={createCollection} className="btn-primary" style={{justifyContent:"center",gap:6}}>
            <Plus size={14}/> Nueva Colección
          </button>
          <button onClick={loadDemo} style={{justifyContent:"center",gap:6,padding:"8px 12px",borderRadius:8,border:"1px solid rgba(139,92,246,0.4)",background:"rgba(139,92,246,0.08)",color:"#a78bfa",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center"}}>
            🧪 Cargar Demo
          </button>
          {collections.length===0&&(
            <div style={{textAlign:"center",padding:"32px 12px",color:"var(--text-muted)",fontSize:12}}>
              <Layers size={28} style={{opacity:0.3,marginBottom:8}}/><br/>Sin colecciones aún
            </div>
          )}
          {collections.map(c=>(
            <div key={c.id} onClick={()=>{setSelected(c.id);setRunResult(null);}}
              style={{padding:"10px 12px",borderRadius:10,border:`1px solid ${selected===c.id?"rgba(139,92,246,0.5)":"var(--border)"}`,background:selected===c.id?"rgba(139,92,246,0.08)":"var(--bg-surface)",cursor:"pointer",transition:"all 0.15s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{margin:0,fontSize:13,fontWeight:600,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</p>
                  <p style={{margin:0,fontSize:10,color:"var(--text-muted)"}}>{c.steps.length} paso(s)</p>
                </div>
                <button onClick={e=>{e.stopPropagation();deleteCollection(c.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",padding:2,flexShrink:0}}><Trash2 size={12}/></button>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT: Editor + Runner */}
        {!current?(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-muted)",flexDirection:"column",gap:12,border:"1px dashed var(--border)",borderRadius:12}}>
            <Layers size={40} style={{opacity:0.2}}/><p style={{fontSize:13}}>Selecciona o crea una colección</p>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {/* Collection header */}
            <div className="qa-card">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:10,marginBottom:10}}>
                <div>
                  <label style={{fontSize:11,color:"var(--text-muted)",display:"block",marginBottom:4}}>Nombre de la Colección</label>
                  <input value={current.name} onChange={e=>updateCollection({name:e.target.value})} style={ipt({fontSize:14,fontWeight:700})}/>
                </div>
                <div>
                  <label style={{fontSize:11,color:"var(--text-muted)",display:"block",marginBottom:4}}>Descripción</label>
                  <input value={current.description} onChange={e=>updateCollection({description:e.target.value})} placeholder="Flujo de login → consulta → validación..." style={ipt()}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:12,color:"var(--text-secondary)"}}>
                    <input type="checkbox" checked={current.stopOnFailure} onChange={e=>updateCollection({stopOnFailure:e.target.checked})}/>
                    Parar al fallar
                  </label>
                </div>
              </div>
              <div>
                <label style={{fontSize:11,color:"var(--text-muted)",display:"block",marginBottom:4}}>Variables iniciales (JSON) <span style={{color:"#c3e88d"}}>{"{{baseUrl}}, {{token}}, ..."}</span></label>
                <input value={initVars} onChange={e=>setInitVars(e.target.value)} placeholder='{"baseUrl":"https://api.example.com","token":"abc"}' style={ipt({fontFamily:"monospace"})}/>
              </div>
            </div>

            {/* Steps */}
            <div className="qa-card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <span style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.05em"}}>Pasos ({current.steps.length})</span>
                <button onClick={addStep} style={{fontSize:11,color:"#8b5cf6",background:"rgba(139,92,246,0.08)",border:"1px solid rgba(139,92,246,0.3)",borderRadius:6,padding:"5px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                  <Plus size={11}/> Agregar Paso
                </button>
              </div>
              {current.steps.map((s,i)=>(
                <StepCard key={s.id} step={s} index={i}
                  onChange={patch=>updateStep(i,patch)}
                  onDelete={()=>deleteStep(i)}
                />
              ))}
            </div>

            {/* Run button */}
            <button onClick={runCollection} disabled={running||current.steps.length===0}
              className="btn-primary"
              style={{justifyContent:"center",gap:8,padding:"12px",fontSize:14,background:"linear-gradient(135deg,#7c3aed,#4f46e5)",opacity:running?0.7:1}}>
              {running?<><Zap size={16} style={{animation:"spin 1s linear infinite"}}/>Ejecutando Suite...</>:<><Play size={16}/>Ejecutar Colección</>}
            </button>

            {/* Results */}
            <AnimatePresence>
              {runResult&&(
                <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="qa-card">
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,padding:"12px 16px",borderRadius:8,background:runResult.ok?"rgba(16,185,129,0.08)":"rgba(239,68,68,0.08)",border:`1px solid ${runResult.ok?"rgba(16,185,129,0.3)":"rgba(239,68,68,0.3)"}`}}>
                    {runResult.ok?<Check size={20} color="#10b981"/>:<X size={20} color="#ef4444"/>}
                    <div style={{flex:1}}>
                      <p style={{margin:0,fontWeight:700,fontSize:14,color:runResult.ok?"#10b981":"#ef4444"}}>
                        {runResult.ok?"✅ Suite Completa — PASS":"❌ Suite Fallida"}
                      </p>
                      {runResult.error?<p style={{margin:"2px 0 0",fontSize:12,color:"#ef4444"}}>{runResult.error}</p>:(
                        <p style={{margin:"2px 0 0",fontSize:12,color:"var(--text-muted)"}}>
                          {runResult.passedSteps}/{runResult.totalSteps} pasos exitosos · {runResult.totalDuration}ms total
                        </p>
                      )}
                    </div>
                    {runResult.capturedVars&&Object.keys(runResult.capturedVars).length>0&&(
                      <div style={{fontSize:10,color:"#c3e88d",fontFamily:"monospace",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        Vars: {Object.keys(runResult.capturedVars).map(k=>`{{${k}}}`).join(", ")}
                      </div>
                    )}
                  </div>
                  {runResult.stepResults?.map((r,i)=><StepResult key={r.stepId||i} r={r} index={i}/>)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
