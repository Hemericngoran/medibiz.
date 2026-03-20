import { useState, useRef, useEffect } from "react";
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

/* ══════════════════════════════════════
   THEME & HELPERS
══════════════════════════════════════ */
const C = {
  p:"#00897B",pd:"#00695C",pl:"#4DB6AC",acc:"#00BFA5",
  bg:"#F0FAF9",bg2:"#E8F5E9",white:"#FFFFFF",
  tx:"#1A2E2B",txl:"#5A7A76",brd:"#B2DFDB",
  err:"#E53935",warn:"#FB8C00",ok:"#43A047",inf:"#039BE5",
  purple:"#7B1FA2",gold:"#F9A825",
  chart:["#00897B","#4DB6AC","#00BFA5","#80CBC4","#26A69A","#00796B","#A5D6A7"],
};
const fmt  = n => new Intl.NumberFormat("fr-FR").format(Math.round(n||0))+" FCFA";
const pct  = n => (Number(n)||0).toFixed(1)+"%";
const fdate= d => { try { return new Date(d).toLocaleDateString("fr-FR"); } catch(e){ return d||""; }};
const today= () => new Date().toISOString().slice(0,10);

// ── API ──
const API = window.location.origin;
const WS_URL = API.replace('http','ws').replace('https','wss');

function getToken() { return localStorage.getItem('medibiz_token'); }
function setToken(t) { localStorage.setItem('medibiz_token', t); }
function clearToken() { localStorage.removeItem('medibiz_token'); localStorage.removeItem('medibiz_user'); }
function getUser() { try { return JSON.parse(localStorage.getItem('medibiz_user')||'null'); } catch(e){ return null; } }
function setUser(u) { localStorage.setItem('medibiz_user', JSON.stringify(u)); }

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+getToken() } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(API+path, opts);
  if (r.status === 401) { clearToken(); window.location.reload(); return; }
  return r.json();
}
const apiGet = p => api('GET', p);
const apiPost = (p, b) => api('POST', p, b);
const apiPut = (p, b) => api('PUT', p, b);
const apiDel = p => api('DELETE', p);

/* ══════════════════════════════════════
   UI COMPONENTS
══════════════════════════════════════ */
const Btn = ({children,onClick,variant="primary",small,full,disabled}) => {
  const s={primary:{background:disabled?C.brd:C.p,color:C.white,border:"none"},danger:{background:C.err,color:C.white,border:"none"},ghost:{background:C.bg,color:C.txl,border:`1.5px solid ${C.brd}`},outline:{background:"transparent",color:C.p,border:`1.5px solid ${C.p}`},gold:{background:C.gold,color:"#1a1a1a",border:"none"}}[variant]||{};
  return <button onClick={onClick} disabled={disabled} style={{...s,padding:small?"5px 11px":"9px 18px",borderRadius:8,fontWeight:700,cursor:disabled?"not-allowed":"pointer",fontSize:small?12:13,display:"inline-flex",alignItems:"center",gap:4,width:full?"100%":"auto",justifyContent:"center",opacity:disabled?0.6:1}}>{children}</button>;
};
const Badge = ({text,color}) => {
  const m={green:[C.ok,"#E8F5E9"],red:[C.err,"#FFEBEE"],orange:[C.warn,"#FFF3E0"],teal:[C.p,"#E0F2F1"],blue:[C.inf,"#E3F2FD"],purple:[C.purple,"#F3E5F5"],gold:[C.gold,"#FFFDE7"]};
  const [fg,bg]=m[color]||m.teal;
  return <span style={{background:bg,color:fg,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{text}</span>;
};
const StatCard = ({icon,label,value,sub,color,small}) => (
  <div style={{background:C.white,borderRadius:12,padding:small?"13px 16px":"18px 22px",boxShadow:"0 2px 12px rgba(0,137,123,0.07)",border:`1px solid ${C.brd}`,flex:1,minWidth:small?130:165}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div>
        <p style={{margin:0,fontSize:10,fontWeight:700,color:C.txl,textTransform:"uppercase",letterSpacing:"0.07em"}}>{label}</p>
        <p style={{margin:"6px 0 2px",fontSize:small?16:20,fontWeight:800,color:color||C.pd,fontFamily:"'Playfair Display',serif"}}>{value}</p>
        {sub&&<p style={{margin:0,fontSize:11,color:C.ok}}>▲ {sub}</p>}
      </div>
      <span style={{fontSize:small?20:24,opacity:0.85}}>{icon}</span>
    </div>
  </div>
);
const Field = ({label,value,onChange,type="text",options,placeholder}) => {
  const s={width:"100%",padding:"9px 12px",border:`1.5px solid ${C.brd}`,borderRadius:8,fontSize:13,color:C.tx,background:C.bg,boxSizing:"border-box",outline:"none"};
  return (
    <div style={{marginBottom:11}}>
      <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txl,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</label>
      {options?<select value={value||""} onChange={e=>onChange(e.target.value)} style={s}>{options.map(o=><option key={o}>{o}</option>)}</select>
      :<input type={type} value={value||""} placeholder={placeholder||""} onChange={e=>onChange(e.target.value)} style={s}/>}
    </div>
  );
};
const Modal = ({title,onClose,children,wide}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:12}}>
    <div style={{background:C.white,borderRadius:16,padding:26,width:wide?680:500,maxWidth:"96vw",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 24px 60px rgba(0,137,123,0.22)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h3 style={{color:C.pd,fontFamily:"'Playfair Display',serif",fontSize:17,margin:0}}>{title}</h3>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.txl}}>✕</button>
      </div>
      {children}
    </div>
  </div>
);
const Table = ({headers,rows,empty}) => (
  <div style={{overflowX:"auto"}}>
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
      <thead><tr style={{background:C.pd}}>{headers.map(h=><th key={h} style={{padding:"10px 13px",textAlign:"left",color:C.white,fontWeight:700,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
      <tbody>{rows.length===0?<tr><td colSpan={headers.length} style={{padding:"28px",textAlign:"center",color:C.txl}}>{empty||"Aucune donnée"}</td></tr>
        :rows.map((row,i)=><tr key={i} style={{background:i%2===0?C.white:C.bg,borderBottom:`1px solid ${C.brd}`}}>{row.map((cell,j)=><td key={j} style={{padding:"9px 13px",color:C.tx,verticalAlign:"middle"}}>{cell}</td>)}</tr>)}
      </tbody>
    </table>
  </div>
);
const Card = ({title,children,action}) => (
  <div style={{background:C.white,borderRadius:13,overflow:"hidden",boxShadow:"0 2px 14px rgba(0,137,123,0.07)",border:`1px solid ${C.brd}`}}>
    {title&&<div style={{padding:"13px 18px",borderBottom:`1px solid ${C.brd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <h3 style={{margin:0,color:C.pd,fontFamily:"'Playfair Display',serif",fontSize:14}}>{title}</h3>{action}
    </div>}
    {children}
  </div>
);
const ProgressBar = ({value,max}) => {
  const r=Math.min(100,Math.round(((Number(value)||0)/(Number(max)||1))*100));
  const col=r>=90?C.ok:r>=60?C.warn:C.err;
  return <div><div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.txl,marginBottom:3}}><span>{r}%</span><span>{value}/{max}</span></div>
    <div style={{height:8,background:C.bg2,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${r}%`,background:col,borderRadius:4}}/></div></div>;
};
const LineEditor = ({items,onChange}) => {
  const total=items.reduce((s,i)=>s+(i.qty*i.pu),0);
  const inp={padding:"6px 8px",border:`1px solid ${C.brd}`,borderRadius:6,fontSize:12,width:"100%"};
  return <div style={{marginBottom:11}}>
    <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txl,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>Lignes Produits</label>
    <div style={{background:C.bg,borderRadius:9,overflow:"hidden",border:`1px solid ${C.brd}`}}>
      <div style={{display:"grid",gridTemplateColumns:"3fr 1fr 2fr 0.4fr",padding:"7px 10px",background:C.pd,fontSize:11,color:C.white,fontWeight:700,gap:6}}>
        <span>Désignation</span><span>Qté</span><span>Prix Unit.</span><span></span>
      </div>
      {items.map((row,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"3fr 1fr 2fr 0.4fr",padding:"6px 8px",borderBottom:`1px solid ${C.brd}`,gap:5,alignItems:"center"}}>
        <input value={row.name} placeholder="Produit..." onChange={e=>onChange(items.map((r,j)=>j===i?{...r,name:e.target.value}:r))} style={inp}/>
        <input type="number" value={row.qty} onChange={e=>onChange(items.map((r,j)=>j===i?{...r,qty:Number(e.target.value)}:r))} style={inp}/>
        <input type="number" value={row.pu} onChange={e=>onChange(items.map((r,j)=>j===i?{...r,pu:Number(e.target.value)}:r))} style={inp}/>
        <button onClick={()=>onChange(items.filter((_,j)=>j!==i))} style={{background:C.err,color:C.white,border:"none",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:11,width:"100%"}}>✕</button>
      </div>)}
      <div style={{padding:"7px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",background:C.bg2}}>
        <button onClick={()=>onChange([...items,{name:"",qty:1,pu:0}])} style={{background:C.p,color:C.white,border:"none",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:12,fontWeight:700}}>＋ Ligne</button>
        <strong style={{color:C.pd,fontSize:12}}>Sous-total: {fmt(total)}</strong>
      </div>
    </div>
  </div>;
};

function exportCSV(data,name) {
  if(!data||!data.length) return;
  const keys=Object.keys(data[0]).filter(k=>k!=="id"&&k!=="items");
  const csv=[keys.join(","),...data.map(row=>keys.map(k=>'"'+(String(row[k]||"").replace(/"/g,'""'))+'"').join(","))].join("\n");
  const a=document.createElement("a");
  a.href="data:text/csv;charset=utf-8,\uFEFF"+encodeURIComponent(csv);
  a.download=name+"_"+today()+".csv"; a.click();
}

function doPrint(doc,isDevis) {
  const sub=(doc.items||[]).reduce((s,i)=>s+i.qty*i.pu,0);
  const disc=sub*((doc.remise||0)/100);
  const base=sub-disc; const tvaA=base*((doc.tva||0)/100); const tot=base+tvaA;
  const w=window.open("","_blank");
  w.document.write(`<!DOCTYPE html><html><head><title>${doc.ref}</title><style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',sans-serif}body{padding:32px;color:#1a2e2b}
  .hdr{display:flex;justify-content:space-between;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #B2DFDB}
  .logo{font-size:18px;font-weight:900;color:#00695C}table{width:100%;border-collapse:collapse;margin:18px 0;font-size:13px}
  thead tr{background:#00695C}thead th{padding:9px 12px;text-align:left;color:white;font-size:12px}
  tbody tr:nth-child(even){background:#F0FAF9}tbody td{padding:8px 12px;border-bottom:1px solid #B2DFDB}
  .tbox{width:270px;margin-left:auto;border:1px solid #B2DFDB;border-radius:8px;overflow:hidden}
  .tr{display:flex;justify-content:space-between;padding:8px 13px;border-bottom:1px solid #B2DFDB;font-size:13px}
  .grand{background:#00695C;color:white;font-weight:900;font-size:15px}
  .footer{margin-top:36px;padding-top:12px;border-top:1px solid #B2DFDB;font-size:11px;color:#5A7A76;text-align:center}
  </style></head><body>
  <div class="hdr"><div><div class="logo">🏥 MediBiz Distribution SARL</div><div style="font-size:11px;color:#5A7A76">Abidjan, Côte d'Ivoire · +225 27 20 00 00</div></div>
  <div style="text-align:right"><div style="font-size:20px;font-weight:900;color:#00695C">${isDevis?"DEVIS":"FACTURE"}</div>
  <div style="font-size:13px;color:#5A7A76">${doc.ref} · ${fdate(doc.date)}</div></div></div>
  <table><thead><tr><th>Désignation</th><th>Qté</th><th>Prix Unit.</th><th>Total HT</th></tr></thead>
  <tbody>${(doc.items||[]).map(i=>`<tr><td>${i.name}</td><td>${i.qty}</td><td>${fmt(i.pu)}</td><td><strong>${fmt(i.qty*i.pu)}</strong></td></tr>`).join("")}</tbody></table>
  <div class="tbox">
  <div class="tr"><span style="color:#5A7A76">Sous-total HT</span><strong>${fmt(sub)}</strong></div>
  ${doc.remise>0?`<div class="tr"><span style="color:#E53935">Remise (${doc.remise}%)</span><span style="color:#E53935">- ${fmt(disc)}</span></div>`:""}
  <div class="tr"><span style="color:#5A7A76">TVA (${doc.tva||0}%)</span><strong>${fmt(tvaA)}</strong></div>
  <div class="tr grand"><span>TOTAL TTC</span><span>${fmt(tot)}</span></div></div>
  <div class="footer">MediBiz Distribution SARL · Abidjan, Côte d'Ivoire · MediBiz Manager v3.0</div>
  </body></html>`);
  w.document.close(); w.print();
}

const sc=s=>({Payée:"green",Livrée:"green",Actif:"green",Valide:"green",Reçu:"green",Validé:"green",Accepté:"green",Traité:"green",Partielle:"orange","En cours":"orange","En attente":"orange","Expiré bientôt":"orange",Envoyé:"blue",Brouillon:"gold",Impayée:"red",Annulée:"red",Inactif:"red",Expiré:"red"}[s]||"teal");

const monthlyData=[
  {m:"Jan",ca:4200000,cout:2800000,bg:1400000,bn:980000},{m:"Fév",ca:3800000,cout:2500000,bg:1300000,bn:890000},
  {m:"Mar",ca:5100000,cout:3200000,bg:1900000,bn:1350000},{m:"Avr",ca:4700000,cout:3000000,bg:1700000,bn:1180000},
  {m:"Mai",ca:5600000,cout:3500000,bg:2100000,bn:1520000},{m:"Jun",ca:6200000,cout:3900000,bg:2300000,bn:1680000},
  {m:"Jul",ca:5800000,cout:3700000,bg:2100000,bn:1500000},{m:"Aoû",ca:6500000,cout:4100000,bg:2400000,bn:1780000},
  {m:"Sep",ca:7100000,cout:4400000,bg:2700000,bn:2020000},{m:"Oct",ca:6800000,cout:4200000,bg:2600000,bn:1900000},
  {m:"Nov",ca:7500000,cout:4600000,bg:2900000,bn:2150000},{m:"Déc",ca:8200000,cout:5000000,bg:3200000,bn:2400000},
];

/* ══════════════════════════════════════
   LOGIN PAGE
══════════════════════════════════════ */
function LoginPage({onLogin}) {
  const [email,setEmail]=useState("admin@medibiz.ci");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  const handleLogin=async(e)=>{
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res=await fetch(API+"/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
      const data=await res.json();
      if(data.token){setToken(data.token);setUser(data.user);onLogin(data.user);}
      else setError(data.error||"Erreur de connexion");
    } catch(e){setError("Impossible de contacter le serveur");}
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${C.pd} 0%,#004D40 50%,#00695C 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.white,borderRadius:20,padding:"48px 40px",width:420,maxWidth:"100%",boxShadow:"0 32px 80px rgba(0,0,0,0.25)"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontSize:52,marginBottom:12}}>🏥</div>
          <h1 style={{color:C.pd,fontFamily:"'Playfair Display',serif",fontSize:26,margin:0}}>MediBiz Manager</h1>
          <p style={{color:C.txl,fontSize:13,margin:"8px 0 0"}}>ERP Grande Distribution Médicale · v3.0</p>
        </div>
        <form onSubmit={handleLogin}>
          <Field label="Adresse Email" value={email} onChange={setEmail} type="email" placeholder="votre@email.com"/>
          <Field label="Mot de passe" value={password} onChange={setPassword} type="password" placeholder="••••••••"/>
          {error&&<div style={{background:"#FFEBEE",color:C.err,padding:"10px 14px",borderRadius:8,fontSize:13,marginBottom:14}}>⚠️ {error}</div>}
          <button type="submit" disabled={loading} style={{width:"100%",padding:"12px",background:loading?C.brd:C.p,color:C.white,border:"none",borderRadius:10,fontWeight:800,fontSize:15,cursor:loading?"not-allowed":"pointer",marginTop:4}}>
            {loading?"Connexion...":"🔐 Se connecter"}
          </button>
        </form>
        <div style={{marginTop:20,padding:"12px 16px",background:C.bg,borderRadius:10,fontSize:12,color:C.txl,textAlign:"center"}}>
          <strong>Compte par défaut :</strong><br/>
          admin@medibiz.ci / medibiz2025
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   NOTIFICATION PANEL
══════════════════════════════════════ */
function NotifPanel({notifications,onClose,onReadAll,onCheck}) {
  const unread=(notifications||[]).filter(n=>!n.read).length;
  const severityColor=s=>({danger:C.err,warning:C.warn,info:C.inf,success:C.ok}[s]||C.p);
  const severityIcon=s=>({danger:"🚨",warning:"⚠️",info:"ℹ️",success:"✅"}[s]||"🔔");
  return (
    <div style={{position:"fixed",top:60,right:20,width:380,maxHeight:"80vh",background:C.white,borderRadius:14,boxShadow:"0 8px 40px rgba(0,0,0,0.2)",zIndex:2000,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.brd}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:C.pd}}>
        <span style={{color:C.white,fontWeight:700,fontSize:14}}>🔔 Notifications {unread>0&&<span style={{background:C.err,borderRadius:20,padding:"2px 8px",fontSize:11,marginLeft:6}}>{unread}</span>}</span>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onCheck} style={{background:"rgba(255,255,255,0.2)",color:C.white,border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11}}>🔄 Vérifier</button>
          <button onClick={onReadAll} style={{background:"rgba(255,255,255,0.2)",color:C.white,border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11}}>✓ Tout lire</button>
          <button onClick={onClose} style={{background:"none",color:C.white,border:"none",cursor:"pointer",fontSize:18}}>✕</button>
        </div>
      </div>
      <div style={{overflowY:"auto",flex:1}}>
        {(notifications||[]).length===0&&<div style={{padding:28,textAlign:"center",color:C.txl,fontSize:13}}>Aucune notification</div>}
        {(notifications||[]).map(n=>(
          <div key={n.id} style={{padding:"12px 16px",borderBottom:`1px solid ${C.brd}`,background:n.read?C.white:C.bg,display:"flex",gap:12,alignItems:"flex-start"}}>
            <span style={{fontSize:20,flexShrink:0}}>{severityIcon(n.severity)}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:n.read?500:700,color:C.tx}}>{n.title}</div>
              <div style={{fontSize:12,color:C.txl,marginTop:2}}>{n.message}</div>
              <div style={{fontSize:10,color:C.txl,marginTop:4}}>{new Date(n.date).toLocaleString("fr-FR")}</div>
            </div>
            {!n.read&&<div style={{width:8,height:8,borderRadius:"50%",background:severityColor(n.severity),flexShrink:0,marginTop:4}}/>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   INSTALL PWA BUTTON
══════════════════════════════════════ */
function InstallPWA() {
  const [prompt,setPrompt]=useState(null);
  const [installed,setInstalled]=useState(false);
  useEffect(()=>{
    window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();setPrompt(e);});
    window.addEventListener('appinstalled',()=>setInstalled(true));
  },[]);
  if(installed||!prompt) return null;
  return (
    <button onClick={async()=>{prompt.prompt();const r=await prompt.userChoice;if(r.outcome==="accepted")setInstalled(true);}}
      style={{background:C.gold,color:"#1a1a1a",border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:6}}>
      📱 Installer l'app
    </button>
  );
}

/* ══════════════════════════════════════
   CHANGE PASSWORD MODAL
══════════════════════════════════════ */
function ChangePasswordModal({onClose}) {
  const [old,setOld]=useState("");
  const [next,setNext]=useState("");
  const [confirm,setConfirm]=useState("");
  const [msg,setMsg]=useState("");
  const [err,setErr]=useState("");

  const handleChange=async()=>{
    setErr(""); setMsg("");
    if(next!==confirm){setErr("Les mots de passe ne correspondent pas");return;}
    if(next.length<6){setErr("Minimum 6 caractères");return;}
    const r=await apiPost("/api/auth/change-password",{oldPassword:old,newPassword:next});
    if(r.success) setMsg("✅ Mot de passe modifié avec succès !");
    else setErr(r.error||"Erreur");
  };

  return <Modal title="🔑 Changer le mot de passe" onClose={onClose}>
    <Field label="Ancien mot de passe" value={old} onChange={setOld} type="password"/>
    <Field label="Nouveau mot de passe" value={next} onChange={setNext} type="password"/>
    <Field label="Confirmer le nouveau mot de passe" value={confirm} onChange={setConfirm} type="password"/>
    {err&&<div style={{background:"#FFEBEE",color:C.err,padding:"10px 14px",borderRadius:8,fontSize:13,marginBottom:12}}>⚠️ {err}</div>}
    {msg&&<div style={{background:"#E8F5E9",color:C.ok,padding:"10px 14px",borderRadius:8,fontSize:13,marginBottom:12}}>{msg}</div>}
    <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
      <Btn variant="ghost" onClick={onClose}>Fermer</Btn>
      <Btn onClick={handleChange}>Enregistrer</Btn>
    </div>
  </Modal>;
}

/* ══════════════════════════════════════
   MAIN APP
══════════════════════════════════════ */
export default function App() {
  const [currentUser,setCurrentUser]=useState(getUser());

  if(!currentUser||!getToken()) return <LoginPage onLogin={u=>{setCurrentUser(u);}}/>;
  return <Dashboard currentUser={currentUser} onLogout={()=>{clearToken();setCurrentUser(null);}}/>;
}

function Dashboard({currentUser,onLogout}) {
  const [tab,setTab]=useState("dashboard");
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(null);
  const [editItem,setEditItem]=useState(null);
  const [form,setForm]=useState({});
  const [lines,setLines]=useState([{name:"",qty:1,pu:0}]);
  const [printD,setPrintD]=useState(null);
  const [isDevisP,setIsDevisP]=useState(false);
  const [sideOpen,setSideOpen]=useState(true);
  const [syncing,setSyncing]=useState(false);
  const [connected,setConnected]=useState(false);
  const [usersOnline,setUsersOnline]=useState(1);
  const [showNotifs,setShowNotifs]=useState(false);
  const [showProfile,setShowProfile]=useState(false);
  const [showChangePwd,setShowChangePwd]=useState(false);
  const [notifications,setNotifications]=useState([]);
  const wsRef=useRef(null);

  const [data,setData]=useState({products:[],employees:[],suppliers:[],clients:[],orders:[],invoices:[],sales:[],expenses:[],devis:[],retours:[],lots:[],paiements:[],inventaire:[],users:[],objectifs:[],journal:[]});

  // ── WebSocket ──
  useEffect(()=>{
    let reconnectTimer;
    function connect() {
      try {
        const ws=new WebSocket(WS_URL+"?token="+getToken());
        wsRef.current=ws;
        ws.onopen=()=>{setConnected(true);};
        ws.onclose=()=>{setConnected(false);reconnectTimer=setTimeout(connect,3000);};
        ws.onerror=()=>setConnected(false);
        ws.onmessage=(e)=>{
          const msg=JSON.parse(e.data);
          if(msg.type==="FULL_SYNC") { setData(msg.data); }
          else if(msg.type==="UPDATE") { setData(prev=>({...prev,[msg.collection]:msg.data,journal:msg.journal||prev.journal})); }
          else if(msg.type==="NOTIFICATION") { setNotifications(msg.notifications||[]); }
          else if(msg.type==="NOTIFICATIONS_READ") { setNotifications(prev=>prev.map(n=>({...n,read:true}))); }
          else if(msg.type==="USERS_COUNT") { setUsersOnline(msg.count); }
        };
      } catch(e){ reconnectTimer=setTimeout(connect,3000); }
    }
    connect();
    // Load notifications
    apiGet("/api/notifications").then(n=>{ if(Array.isArray(n)) setNotifications(n); });
    return ()=>{ if(wsRef.current) wsRef.current.close(); clearTimeout(reconnectTimer); };
  },[]);

  const sf=k=>v=>setForm(f=>({...f,[k]:v}));
  const filt=arr=>(arr||[]).filter(i=>Object.values(i).join(" ").toLowerCase().includes(search.toLowerCase()));
  const unreadNotifs=(notifications||[]).filter(n=>!n.read).length;

  const openModal=(type,item=null)=>{
    setModal(type); setEditItem(item);
    const def={
      product:{name:"",cat:"Consommable",qty:"",pp:"",sp:"",supp:"",min:""},
      employee:{name:"",pos:"",sal:"",phone:"",email:"",status:"Actif"},
      supplier:{name:"",ctt:"",phone:"",email:"",addr:"",cat:"Consommables"},
      client:{name:"",ctt:"",phone:"",email:"",addr:"",cat:"Clinique",total:0},
      order:{ref:"CMD-"+Date.now().toString().slice(-4),date:today(),client:"",status:"En cours"},
      invoice:{ref:"FAC-"+Date.now().toString().slice(-4),date:today(),client:"",tva:"18",remise:"0",status:"Impayée",notes:""},
      devis:{ref:"DEV-"+Date.now().toString().slice(-4),date:today(),client:"",tva:"18",remise:"0",status:"Brouillon",validite:"",notes:""},
      sale:{date:today(),product:"",qty:"",pu:"",pp:"",client:""},
      expense:{date:today(),type:"Loyer",desc:"",montant:"",cat:"Charges fixes"},
      retour:{date:today(),client:"",product:"",qty:"",motif:"",statut:"En cours",montant:""},
      lot:{product:"",lot:"",qty:"",fabrication:"",peremption:"",supp:"",statut:"Valide"},
      paiement:{date:today(),client:"",ref:"",montant:"",mode:"Virement",statut:"En attente",echeance:""},
      inventaire:{date:today(),produit:"",qtyTheo:"",qtyReel:"",motif:"",statut:"En cours"},
      authUser:{name:"",email:"",password:"",role:"Commercial",status:"Actif"},
      objectif:{titre:"",cible:"",actuel:"",periode:"2025",cat:"Financier",unite:"FCFA"},
    };
    if(item){setForm({...item});if(item.items)setLines(item.items.map(i=>({...i})));}
    else{setForm({...(def[type]||{})});setLines([{name:"",qty:1,pu:0}]);}
  };
  const closeModal=()=>{setModal(null);setEditItem(null);setForm({});setLines([{name:"",qty:1,pu:0}]);};

  const colMap={product:"products",employee:"employees",supplier:"suppliers",client:"clients",order:"orders",invoice:"invoices",sale:"sales",expense:"expenses",devis:"devis",retour:"retours",lot:"lots",paiement:"paiements",inventaire:"inventaire",user:"users",objectif:"objectifs"};

  const saveItem=async(type)=>{
    setSyncing(true);
    const col=colMap[type];
    const n=k=>Number(form[k])||0;
    let d={...form};
    if(type==="product") d={...d,qty:n("qty"),pp:n("pp"),sp:n("sp"),min:n("min")};
    if(type==="employee") d={...d,sal:n("sal")};
    if(type==="client") d={...d,total:n("total")};
    if(type==="order"||type==="invoice"||type==="devis") d={...d,items:lines,total:lines.reduce((s,i)=>s+i.qty*i.pu,0)};
    if(type==="sale") d={...d,qty:n("qty"),pu:n("pu"),pp:n("pp")};
    if(type==="expense"||type==="retour"||type==="paiement") d={...d,montant:n("montant")};
    if(type==="lot") d={...d,qty:n("qty")};
    if(type==="inventaire") d={...d,qtyTheo:n("qtyTheo"),qtyReel:n("qtyReel"),ecart:n("qtyReel")-n("qtyTheo")};
    if(type==="objectif") d={...d,cible:n("cible"),actuel:n("actuel")};
    if(type==="authUser") {
      await apiPost("/api/auth/register",{name:d.name,email:d.email,password:d.password,role:d.role});
      setSyncing(false); closeModal(); return;
    }
    try {
      if(editItem) await apiPut(`/api/${col}/${editItem.id}`,d);
      else await apiPost(`/api/${col}`,d);
    } catch(e){console.error(e);}
    setSyncing(false); closeModal();
  };

  const del=async(col,id,lbl)=>{
    if(!window.confirm(`Supprimer "${lbl}" ?`)) return;
    setSyncing(true);
    try { await apiDel(`/api/${col}/${id}`); } catch(e){console.error(e);}
    setSyncing(false);
  };

  const {products=[],employees=[],suppliers=[],clients=[],orders=[],invoices=[],sales=[],expenses=[],devis=[],retours=[],lots=[],paiements=[],inventaire=[],users=[],objectifs=[],journal=[]}=data;
  const totalCA=monthlyData.reduce((s,m)=>s+m.ca,0);
  const totalBG=monthlyData.reduce((s,m)=>s+m.bg,0);
  const totalBN=monthlyData.reduce((s,m)=>s+m.bn,0);
  const stockVal=products.reduce((s,p)=>s+p.qty*p.pp,0);
  const alerts=products.filter(p=>p.qty<=p.min);
  const salaries=employees.reduce((s,e)=>s+Number(e.sal),0);
  const totalExp=expenses.reduce((s,e)=>s+Number(e.montant),0);
  const totalSales=sales.reduce((s,v)=>s+(v.qty*v.pu),0);
  const totalMargin=sales.reduce((s,v)=>s+(v.qty*(v.pu-v.pp)),0);
  const totalPaid=paiements.filter(p=>p.statut==="Reçu").reduce((s,p)=>s+Number(p.montant),0);
  const totalPending=paiements.filter(p=>p.statut==="En attente").reduce((s,p)=>s+Number(p.montant),0);
  const lotsExp=lots.filter(lo=>lo.statut==="Expiré"||lo.statut==="Expiré bientôt");
  const cliOpts=["",...clients.map(c=>c.name)];
  const prodOpts=["",...products.map(p=>p.name)];
  const invOpts=["",...invoices.map(i=>i.ref)];
  const suppOpts=["",...suppliers.map(s=>s.name)];

  const SB=()=><input placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)} style={{padding:"9px 14px",border:`1.5px solid ${C.brd}`,borderRadius:9,fontSize:13,width:230,background:C.bg}}/>;
  const AB=({col,item,type,label})=><span style={{display:"flex",gap:5}}>
    <Btn small variant="outline" onClick={()=>openModal(type,item)}>✏️</Btn>
    <Btn small variant="danger" onClick={()=>del(col,item.id,label)}>🗑</Btn>
  </span>;

  // ── SECTIONS ──
  const renderDashboard=()=><div>
    <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:16}}>
      <StatCard icon="💵" label="CA Annuel" value={fmt(totalCA)} sub="+12.4%"/>
      <StatCard icon="📈" label="Bén. Brut" value={fmt(totalBG)} color={C.ok}/>
      <StatCard icon="🏆" label="Bén. Net" value={fmt(totalBN)} color={C.acc}/>
      <StatCard icon="📦" label="Valeur Stock" value={fmt(stockVal)} color={C.inf}/>
    </div>
    <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:18}}>
      <StatCard icon="🛒" label="Ventes" value={fmt(totalSales)} small/><StatCard icon="💰" label="Marge" value={fmt(totalMargin)} color={C.ok} small/>
      <StatCard icon="✅" label="Paiements" value={fmt(totalPaid)} color={C.ok} small/><StatCard icon="⚠️" label="Alertes Stock" value={alerts.length} color={C.err} small/>
      <StatCard icon="🧪" label="Lots Expirant" value={lotsExp.length} color={C.err} small/><StatCard icon="👥" label="En ligne" value={usersOnline} color={C.inf} small/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:16}}>
      <Card title="📊 CA & Bénéfices — 12 mois"><div style={{padding:"12px 16px"}}>
        <ResponsiveContainer width="100%" height={200}><AreaChart data={monthlyData}>
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.p} stopOpacity={0.2}/><stop offset="95%" stopColor={C.p} stopOpacity={0}/></linearGradient>
            <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.acc} stopOpacity={0.2}/><stop offset="95%" stopColor={C.acc} stopOpacity={0}/></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={C.brd}/><XAxis dataKey="m" tick={{fontSize:9}}/><YAxis tickFormatter={v=>(v/1e6).toFixed(1)+"M"} tick={{fontSize:9}}/><Tooltip formatter={v=>fmt(v)}/><Legend/>
          <Area type="monotone" dataKey="ca" name="CA" stroke={C.p} fill="url(#g1)" strokeWidth={2}/>
          <Area type="monotone" dataKey="bn" name="Bén. Net" stroke={C.acc} fill="url(#g2)" strokeWidth={2}/>
        </AreaChart></ResponsiveContainer>
      </div></Card>
      <Card title="🎯 Objectifs"><div style={{padding:"12px 16px"}}>
        {objectifs.map(o=><div key={o.id} style={{marginBottom:13}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600,marginBottom:3}}><span>{o.titre}</span><Badge text={o.cat} color="teal"/></div>
          <ProgressBar value={o.actuel} max={o.cible}/>
        </div>)}
      </div></Card>
    </div>
    {alerts.length>0&&<div style={{background:"#FFF3E0",border:`1.5px solid ${C.warn}`,borderRadius:11,padding:14,marginBottom:12}}>
      <h4 style={{margin:"0 0 9px",color:C.warn,fontSize:13}}>⚠️ Alertes Stock ({alerts.length})</h4>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {alerts.map(p=><div key={p.id} style={{background:C.white,borderRadius:7,padding:"5px 11px",border:`1px solid ${C.brd}`,fontSize:12}}>
          <strong>{p.name}</strong> <span style={{color:p.qty===0?C.err:C.warn}}>{p.qty===0?"RUPTURE":`${p.qty}/${p.min}`}</span>
        </div>)}
      </div>
    </div>}
  </div>;

  const renderSection=()=>{
    if(tab==="dashboard") return renderDashboard();
    if(tab==="stock") return <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}><SB/><Btn onClick={()=>openModal("product")}>＋ Produit</Btn></div>
      <Card><Table headers={["Nom","Catégorie","Qté","Prix Achat","Prix Vente","Fournisseur","Stock Min","Statut","Actions"]}
        rows={filt(products).map(p=>[<strong>{p.name}</strong>,p.cat,p.qty,fmt(p.pp),fmt(p.sp),p.supp,p.min,
          <Badge text={p.qty===0?"Rupture":p.qty<=p.min?"Stock Faible":"En Stock"} color={p.qty===0?"red":p.qty<=p.min?"orange":"green"}/>,
          <AB col="products" item={p} type="product" label={p.name}/>])}/></Card>
    </div>;

    if(tab==="finances") return <div>
      <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:18}}>
        <StatCard icon="💵" label="CA" value={fmt(totalCA)}/><StatCard icon="📈" label="Bén. Brut" value={fmt(totalBG)} color={C.ok}/>
        <StatCard icon="💸" label="Charges" value={fmt(totalCA-totalBN)} color={C.warn}/><StatCard icon="🏆" label="Bén. Net" value={fmt(totalBN)} color={C.acc}/>
      </div>
      <Card title="📊 Performance Mensuelle"><div style={{padding:"12px 16px"}}>
        <ResponsiveContainer width="100%" height={250}><BarChart data={monthlyData} barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.brd}/><XAxis dataKey="m" tick={{fontSize:9}}/><YAxis tickFormatter={v=>(v/1e6).toFixed(1)+"M"} tick={{fontSize:9}}/><Tooltip formatter={v=>fmt(v)}/><Legend/>
          <Bar dataKey="ca" name="CA" fill={C.p} radius={[3,3,0,0]}/><Bar dataKey="bg" name="Bén. Brut" fill={C.acc} radius={[3,3,0,0]}/><Bar dataKey="bn" name="Bén. Net" fill={C.ok} radius={[3,3,0,0]}/>
        </BarChart></ResponsiveContainer>
      </div></Card>
    </div>;

    if(tab==="ventes") {
      const grouped=sales.reduce((acc,v)=>{if(!acc[v.date])acc[v.date]=[];acc[v.date].push(v);return acc;},{});
      const days=Object.keys(grouped).sort((a,b)=>b.localeCompare(a));
      return <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}><SB/><Btn onClick={()=>openModal("sale")}>＋ Vente</Btn></div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
          <StatCard icon="🛒" label="CA" value={fmt(totalSales)} small/><StatCard icon="💰" label="Marge" value={fmt(totalMargin)} color={C.ok} small/>
        </div>
        {days.map(day=>{
          const dv=grouped[day].filter(v=>Object.values(v).join(" ").toLowerCase().includes(search.toLowerCase()));
          if(!dv.length) return null;
          return <div key={day} style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
              <strong style={{color:C.pd}}>📅 {fdate(day)}</strong>
              <span style={{fontSize:12,color:C.txl}}>CA: <strong style={{color:C.pd}}>{fmt(dv.reduce((s,v)=>s+v.qty*v.pu,0))}</strong></span>
            </div>
            <Card><Table headers={["Produit","Qté","P.Vente","P.Achat","Total","Marge","Client","Actions"]}
              rows={dv.map(v=>[<strong>{v.product}</strong>,v.qty,fmt(v.pu),fmt(v.pp),fmt(v.qty*v.pu),<Badge text={fmt(v.qty*(v.pu-v.pp))} color="green"/>,v.client,<AB col="sales" item={v} type="sale" label={v.product}/>])}/></Card>
          </div>;
        })}
      </div>;
    }

    const simple=(arr,col,type,lbl,headers,mapRow)=><div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}><SB/><Btn onClick={()=>openModal(type)}>＋ {lbl}</Btn></div>
      <Card><Table headers={headers} rows={filt(arr).map(mapRow)}/></Card>
    </div>;

    if(tab==="commandes") return simple(orders,"orders","order","Commande",["Réf","Date","Client","Lignes","Total","Statut","Actions"],
      o=>[<strong style={{color:C.p}}>{o.ref}</strong>,fdate(o.date),o.client,<span style={{fontSize:11}}>{(o.items||[]).length}</span>,<strong>{fmt(o.total||0)}</strong>,<Badge text={o.status} color={sc(o.status)}/>,<AB col="orders" item={o} type="order" label={o.ref}/>]);

    if(tab==="factures") return <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}><SB/><Btn onClick={()=>openModal("invoice")}>＋ Facture</Btn></div>
      <Card><Table headers={["Réf","Date","Client","TVA","Remise","Total","Statut","Actions"]}
        rows={filt(invoices).map(inv=>{
          const s2=(inv.items||[]).reduce((s,i)=>s+i.qty*i.pu,0);
          const tot=(s2-(s2*(inv.remise/100)))*(1+(inv.tva/100));
          return [<strong style={{color:C.p}}>{inv.ref}</strong>,fdate(inv.date),inv.client,pct(inv.tva),pct(inv.remise),<strong>{fmt(tot)}</strong>,<Badge text={inv.status} color={sc(inv.status)}/>,
            <span style={{display:"flex",gap:4}}>
              <Btn small variant="outline" onClick={()=>{setPrintD(inv);setIsDevisP(false);}}>🖨️</Btn>
              <Btn small variant="outline" onClick={()=>openModal("invoice",inv)}>✏️</Btn>
              <Btn small variant="danger" onClick={()=>del("invoices",inv.id,inv.ref)}>🗑</Btn>
            </span>];
        })}/></Card>
    </div>;

    if(tab==="devis") return <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}><SB/><Btn onClick={()=>openModal("devis")}>＋ Devis</Btn></div>
      <Card><Table headers={["Réf","Date","Validité","Client","Lignes","Total","Statut","Actions"]}
        rows={filt(devis).map(d=>[<strong style={{color:C.p}}>{d.ref}</strong>,fdate(d.date),fdate(d.validite),d.client,<span style={{fontSize:11}}>{(d.items||[]).length}</span>,<strong>{fmt(d.total||0)}</strong>,<Badge text={d.status} color={sc(d.status)}/>,
          <span style={{display:"flex",gap:4}}>
            <Btn small variant="outline" onClick={()=>{setPrintD(d);setIsDevisP(true);}}>🖨️</Btn>
            <Btn small variant="outline" onClick={()=>openModal("devis",d)}>✏️</Btn>
            <Btn small variant="danger" onClick={()=>del("devis",d.id,d.ref)}>🗑</Btn>
          </span>])}/></Card>
    </div>;

    if(tab==="depenses") return <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}><SB/><Btn onClick={()=>openModal("expense")}>＋ Dépense</Btn></div>
      <StatCard icon="💸" label="Total Dépenses" value={fmt(totalExp)} color={C.warn} style={{marginBottom:16}}/>
      <div style={{marginBottom:16}}/>
      <Card><Table headers={["Date","Type","Description","Catégorie","Montant","Actions"]}
        rows={filt(expenses).map(e=>[fdate(e.date),<strong>{e.type}</strong>,e.desc,<Badge text={e.cat} color="teal"/>,<strong style={{color:C.err}}>{fmt(Number(e.montant))}</strong>,<AB col="expenses" item={e} type="expense" label={e.type}/>])}/></Card>
    </div>;

    if(tab==="personnel") return <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}><SB/><Btn onClick={()=>openModal("employee")}>＋ Employé</Btn></div>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
        <StatCard icon="👥" label="Effectif" value={employees.length} small/><StatCard icon="💰" label="Masse Sal./Mois" value={fmt(salaries)} color={C.warn} small/>
      </div>
      <Card><Table headers={["Nom","Poste","Salaire/Mois","Téléphone","Email","Statut","Actions"]}
        rows={filt(employees).map(e=>[<strong>{e.name}</strong>,e.pos,fmt(Number(e.sal)),e.phone,e.email,<Badge text={e.status} color={sc(e.status)}/>,<AB col="employees" item={e} type="employee" label={e.name}/>])}/></Card>
    </div>;

    if(tab==="fournisseurs") return simple(suppliers,"suppliers","supplier","Fournisseur",["Entreprise","Contact","Téléphone","Email","Adresse","Catégorie","Actions"],
      s=>[<strong>{s.name}</strong>,s.ctt,s.phone,s.email,s.addr,<Badge text={s.cat} color="teal"/>,<AB col="suppliers" item={s} type="supplier" label={s.name}/>]);

    if(tab==="clients") return simple(clients,"clients","client","Client",["Nom","Contact","Téléphone","Email","Adresse","Catégorie","Total Achats","Actions"],
      c=>[<strong>{c.name}</strong>,c.ctt,c.phone,c.email,c.addr,<Badge text={c.cat} color="teal"/>,<strong style={{color:C.pd}}>{fmt(Number(c.total))}</strong>,<AB col="clients" item={c} type="client" label={c.name}/>]);

    if(tab==="retours") return simple(retours,"retours","retour","Retour",["Date","Client","Produit","Qté","Motif","Montant","Statut","Actions"],
      r=>[fdate(r.date),r.client,<strong>{r.product}</strong>,r.qty,r.motif,<strong style={{color:C.err}}>{fmt(Number(r.montant))}</strong>,<Badge text={r.statut} color={sc(r.statut)}/>,<AB col="retours" item={r} type="retour" label={r.product}/>]);

    if(tab==="lots") return simple(lots,"lots","lot","Lot",["Produit","N° Lot","Qté","Fabrication","Péremption","Fournisseur","Statut","Actions"],
      lo=>[<strong>{lo.product}</strong>,<code style={{background:C.bg,padding:"2px 6px",borderRadius:4,fontSize:11}}>{lo.lot}</code>,lo.qty,fdate(lo.fabrication),
        <span style={{fontWeight:700,color:lo.statut==="Expiré"?C.err:lo.statut==="Expiré bientôt"?C.warn:C.ok}}>{fdate(lo.peremption)}</span>,
        lo.supp,<Badge text={lo.statut} color={sc(lo.statut)}/>,<AB col="lots" item={lo} type="lot" label={lo.lot}/>]);

    if(tab==="paiements") return <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}><SB/><Btn onClick={()=>openModal("paiement")}>＋ Paiement</Btn></div>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
        <StatCard icon="✅" label="Reçus" value={fmt(totalPaid)} color={C.ok}/><StatCard icon="⏳" label="En Attente" value={fmt(totalPending)} color={C.warn}/>
        <StatCard icon="📊" label="Recouvrement" value={pct((totalPaid/(totalPaid+totalPending||1))*100)} color={C.inf}/>
      </div>
      <Card><Table headers={["Date","Client","Réf Facture","Montant","Mode","Échéance","Statut","Actions"]}
        rows={filt(paiements).map(p=>[fdate(p.date),p.client,<strong style={{color:C.p}}>{p.ref}</strong>,<strong>{fmt(Number(p.montant))}</strong>,<Badge text={p.mode} color="blue"/>,fdate(p.echeance),<Badge text={p.statut} color={sc(p.statut)}/>,<AB col="paiements" item={p} type="paiement" label={p.ref}/>])}/></Card>
    </div>;

    if(tab==="inventaire") return simple(inventaire,"inventaire","inventaire","Comptage",["Date","Produit","Qté Théo.","Qté Réelle","Écart","Motif","Statut","Actions"],
      inv=>[fdate(inv.date),<strong>{inv.produit}</strong>,inv.qtyTheo,inv.qtyReel,<span style={{fontWeight:700,color:inv.ecart<0?C.err:inv.ecart>0?C.ok:C.txl}}>{inv.ecart>0?"+":""}{inv.ecart}</span>,inv.motif,<Badge text={inv.statut} color={sc(inv.statut)}/>,<AB col="inventaire" item={inv} type="inventaire" label={inv.produit}/>]);

    if(tab==="utilisateurs") return <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}><SB/>{currentUser.role==="Administrateur"&&<Btn onClick={()=>openModal("authUser")}>＋ Utilisateur</Btn>}</div>
      <div style={{background:"#E3F2FD",border:`1.5px solid ${C.inf}`,borderRadius:9,padding:"11px 14px",marginBottom:14,fontSize:13,color:C.inf}}>
        🔒 Les utilisateurs créés ici peuvent se connecter avec leur email et mot de passe.
      </div>
      <Card><Table headers={["Nom","Email","Rôle","Statut","Actions"]}
        rows={filt(users).map(u=>[<strong>{u.name}</strong>,u.email,<Badge text={u.role} color={u.role==="Administrateur"?"purple":"teal"}/>,<Badge text={u.status} color={sc(u.status)}/>,<AB col="users" item={u} type="user" label={u.name}/>])}/></Card>
    </div>;

    if(tab==="objectifs") return <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}><SB/><Btn onClick={()=>openModal("objectif")}>＋ Objectif</Btn></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
        {filt(objectifs).map(o=>{
          const r=Math.min(100,Math.round(((Number(o.actuel)||0)/(Number(o.cible)||1))*100));
          const col=r>=90?C.ok:r>=60?C.warn:C.err;
          return <div key={o.id} style={{background:C.white,borderRadius:13,padding:18,border:`1px solid ${C.brd}`,boxShadow:"0 2px 10px rgba(0,137,123,0.06)"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><strong style={{color:C.tx,fontSize:13}}>{o.titre}</strong><Badge text={o.cat} color="teal"/></div>
            <div style={{fontSize:11,color:C.txl,marginBottom:7}}>{o.periode}</div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
              <span>Actuel: <strong style={{color:col}}>{o.actuel} {o.unite}</strong></span><span>Cible: <strong>{o.cible}</strong></span>
            </div>
            <div style={{height:9,background:C.bg2,borderRadius:5,overflow:"hidden",marginBottom:8}}><div style={{height:"100%",width:`${r}%`,background:col,borderRadius:5}}/></div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11,color:col,fontWeight:700}}>{r}% atteint</span>
              <AB col="objectifs" item={o} type="objectif" label={o.titre}/>
            </div>
          </div>;
        })}
      </div>
    </div>;

    if(tab==="journal") return <div>
      <div style={{marginBottom:14}}><SB/></div>
      <div style={{background:C.white,borderRadius:13,padding:18,boxShadow:"0 2px 14px rgba(0,137,123,0.07)",border:`1px solid ${C.brd}`}}>
        {filt(journal).map((e,i)=><div key={e.id} style={{display:"flex",gap:12,padding:"9px 0",borderBottom:i<journal.length-1?`1px solid ${C.brd}`:"none"}}>
          <span style={{fontSize:16}}>📌</span>
          <div><div style={{fontSize:13,fontWeight:600,color:C.tx}}>{e.action}</div>
          <div style={{fontSize:11,color:C.txl,marginTop:2}}>{e.user} · <Badge text={e.module} color="teal"/> · {e.date}</div></div>
        </div>)}
        {journal.length===0&&<div style={{textAlign:"center",color:C.txl,padding:24}}>Journal vide</div>}
      </div>
    </div>;

    if(tab==="rapports") return <div>
      <div style={{background:"#E3F2FD",border:`1.5px solid ${C.inf}`,borderRadius:9,padding:"11px 14px",marginBottom:16,fontSize:13,color:C.inf}}>
        📄 Exports CSV — ouvrable dans Excel, Google Sheets ou LibreOffice.
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:13}}>
        {[
          {t:"📦 Stock",fn:()=>exportCSV(products.map(p=>({Nom:p.name,Cat:p.cat,Qté:p.qty,PA:p.pp,PV:p.sp,Supp:p.supp})),"Stock")},
          {t:"👥 Personnel",fn:()=>exportCSV(employees.map(e=>({Nom:e.name,Poste:e.pos,Salaire:e.sal,Téléphone:e.phone,Email:e.email})),"Personnel")},
          {t:"🏥 Clients",fn:()=>exportCSV(clients.map(c=>({Nom:c.name,Contact:c.ctt,Téléphone:c.phone,Adresse:c.addr,Total:c.total})),"Clients")},
          {t:"🧾 Factures",fn:()=>exportCSV(invoices.map(i=>({Réf:i.ref,Date:i.date,Client:i.client,TVA:i.tva,Remise:i.remise,Statut:i.status})),"Factures")},
          {t:"💸 Dépenses",fn:()=>exportCSV(expenses.map(e=>({Date:e.date,Type:e.type,Desc:e.desc,Cat:e.cat,Montant:e.montant})),"Dépenses")},
          {t:"🧪 Lots",fn:()=>exportCSV(lots.map(l2=>({Produit:l2.product,Lot:l2.lot,Péremption:l2.peremption,Statut:l2.statut})),"Lots")},
          {t:"💰 Ventes",fn:()=>exportCSV(sales.map(s=>({Date:s.date,Produit:s.product,Qté:s.qty,PV:s.pu,PA:s.pp,Client:s.client})),"Ventes")},
          {t:"💳 Paiements",fn:()=>exportCSV(paiements.map(p=>({Date:p.date,Client:p.client,Réf:p.ref,Montant:p.montant,Mode:p.mode,Statut:p.statut})),"Paiements")},
        ].map((r,i)=><div key={i} style={{background:C.white,borderRadius:13,padding:18,border:`1px solid ${C.brd}`,boxShadow:"0 2px 10px rgba(0,137,123,0.06)"}}>
          <div style={{fontSize:26,marginBottom:8}}>{r.t.split(" ")[0]}</div>
          <h3 style={{margin:"0 0 14px",color:C.pd,fontFamily:"'Playfair Display',serif",fontSize:13}}>{r.t}</h3>
          <Btn onClick={r.fn} full>⬇️ Exporter CSV</Btn>
        </div>)}
      </div>
    </div>;

    if(tab==="notifications_config") return <div>
      <Card title="📧 Configuration des Notifications Email">
        <div style={{padding:20}}>
          <div style={{background:C.bg,borderRadius:10,padding:18,marginBottom:18}}>
            <h4 style={{color:C.pd,marginBottom:12}}>Configurer les alertes email</h4>
            <p style={{color:C.txl,fontSize:13,lineHeight:1.6,marginBottom:16}}>
              Pour recevoir les alertes par email (ruptures stock, factures impayées, lots expirant), configure les variables d'environnement sur le serveur :
            </p>
            <div style={{background:"#1a2e2b",borderRadius:8,padding:16,fontFamily:"monospace",fontSize:12,color:"#4DB6AC",lineHeight:2}}>
              <div>SMTP_HOST=smtp.gmail.com</div>
              <div>SMTP_PORT=587</div>
              <div>SMTP_USER=ton-email@gmail.com</div>
              <div>SMTP_PASS=mot-de-passe-app-gmail</div>
              <div>SMTP_FROM=MediBiz &lt;noreply@medibiz.ci&gt;</div>
              <div>ADMIN_EMAIL=destinataire@email.com</div>
            </div>
            <p style={{color:C.txl,fontSize:12,marginTop:12}}>
              ⚠️ Pour Gmail, utilise un "mot de passe d'application" depuis les paramètres de sécurité Google.
            </p>
          </div>
          <Btn onClick={async()=>{const r=await apiPost("/api/notifications/check",{});alert(r.message||"Vérification effectuée !");}} variant="outline">
            🔄 Tester les alertes maintenant
          </Btn>
        </div>
      </Card>
    </div>;

    return <div style={{textAlign:"center",padding:40,color:C.txl}}>Section en cours...</div>;
  };

  // ── MODAL ──
  const renderModal=()=>{
    if(!modal) return null;
    const isDoc=modal==="invoice"||modal==="order"||modal==="devis";
    const sub=lines.reduce((s,i)=>s+i.qty*i.pu,0);
    const disc=sub*((Number(form.remise)||0)/100);
    const tvaA=(sub-disc)*((Number(form.tva)||0)/100);
    const tot=sub-disc+tvaA;
    const titles={product:"Produit",employee:"Employé",supplier:"Fournisseur",client:"Client",order:"Commande",invoice:"Facture",devis:"Devis",sale:"Vente",expense:"Dépense",retour:"Retour/SAV",lot:"Lot",paiement:"Paiement",inventaire:"Comptage",user:"Utilisateur",objectif:"Objectif",authUser:"Compte Utilisateur"};
    const G=({children})=><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{children}</div>;
    const Full=({children})=><div style={{gridColumn:"1/-1"}}>{children}</div>;
    return <Modal title={`${editItem?"Modifier":"Nouveau"} ${titles[modal]||""}`} onClose={closeModal} wide={isDoc}>
      <G>
        {modal==="product"&&<><Full><Field label="Nom" value={form.name} onChange={sf("name")}/></Full>
          <Field label="Catégorie" value={form.cat} onChange={sf("cat")} options={["Consommable","Appareil","EPI","Désinfectant","Médicament","Autre"]}/>
          <Field label="Quantité" value={form.qty} onChange={sf("qty")} type="number"/>
          <Field label="Prix Achat (FCFA)" value={form.pp} onChange={sf("pp")} type="number"/>
          <Field label="Prix Vente (FCFA)" value={form.sp} onChange={sf("sp")} type="number"/>
          <Field label="Fournisseur" value={form.supp} onChange={sf("supp")}/>
          <Field label="Stock Min" value={form.min} onChange={sf("min")} type="number"/></>}
        {modal==="employee"&&<><Full><Field label="Nom" value={form.name} onChange={sf("name")}/></Full>
          <Field label="Poste" value={form.pos} onChange={sf("pos")}/>
          <Field label="Salaire (FCFA)" value={form.sal} onChange={sf("sal")} type="number"/>
          <Field label="Téléphone" value={form.phone} onChange={sf("phone")}/>
          <Field label="Email" value={form.email} onChange={sf("email")} type="email"/>
          <Field label="Statut" value={form.status} onChange={sf("status")} options={["Actif","Inactif","Congé","Suspendu"]}/></>}
        {modal==="supplier"&&<><Full><Field label="Entreprise" value={form.name} onChange={sf("name")}/></Full>
          <Field label="Contact" value={form.ctt} onChange={sf("ctt")}/>
          <Field label="Téléphone" value={form.phone} onChange={sf("phone")}/>
          <Field label="Email" value={form.email} onChange={sf("email")} type="email"/>
          <Full><Field label="Adresse" value={form.addr} onChange={sf("addr")}/></Full>
          <Field label="Catégorie" value={form.cat} onChange={sf("cat")} options={["Consommables","Appareils","EPI","Médicaments","Désinfectants","Autre"]}/></>}
        {modal==="client"&&<><Full><Field label="Nom" value={form.name} onChange={sf("name")}/></Full>
          <Field label="Contact" value={form.ctt} onChange={sf("ctt")}/>
          <Field label="Téléphone" value={form.phone} onChange={sf("phone")}/>
          <Field label="Email" value={form.email} onChange={sf("email")} type="email"/>
          <Full><Field label="Adresse" value={form.addr} onChange={sf("addr")}/></Full>
          <Field label="Catégorie" value={form.cat} onChange={sf("cat")} options={["Clinique","Hôpital","Pharmacie","Cabinet","Centre de Santé","Autre"]}/></>}
        {(modal==="order"||modal==="invoice"||modal==="devis")&&<>
          <Field label="Référence" value={form.ref} onChange={sf("ref")}/>
          <Field label="Date" value={form.date} onChange={sf("date")} type="date"/>
          <Field label="Client" value={form.client} onChange={sf("client")} options={cliOpts}/>
          {modal!=="order"&&<><Field label="TVA (%)" value={form.tva} onChange={sf("tva")} type="number"/>
            <Field label="Remise (%)" value={form.remise} onChange={sf("remise")} type="number"/></>}
          {modal==="devis"&&<Field label="Validité" value={form.validite} onChange={sf("validite")} type="date"/>}
          <Field label="Statut" value={form.status} onChange={sf("status")} options={modal==="order"?["En cours","Livrée","Annulée"]:modal==="devis"?["Brouillon","Envoyé","Accepté","Refusé"]:["Impayée","Partielle","Payée"]}/>
          <Full><LineEditor items={lines} onChange={setLines}/></Full>
          {modal!=="order"&&<Full><div style={{display:"flex",justifyContent:"flex-end"}}>
            <div style={{width:250,background:C.white,borderRadius:9,overflow:"hidden",border:`1px solid ${C.brd}`,fontSize:13}}>
              <div style={{display:"flex",justifyContent:"space-between",padding:"7px 12px",borderBottom:`1px solid ${C.brd}`}}><span style={{color:C.txl}}>Sous-total</span><strong>{fmt(sub)}</strong></div>
              {Number(form.remise)>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"7px 12px",borderBottom:`1px solid ${C.brd}`}}><span style={{color:C.err}}>Remise</span><span style={{color:C.err}}>- {fmt(disc)}</span></div>}
              <div style={{display:"flex",justifyContent:"space-between",padding:"7px 12px",borderBottom:`1px solid ${C.brd}`}}><span style={{color:C.txl}}>TVA</span><strong>{fmt(tvaA)}</strong></div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"10px 12px",background:C.pd}}><span style={{color:C.white,fontWeight:800}}>TOTAL TTC</span><strong style={{color:C.white}}>{fmt(tot)}</strong></div>
            </div>
          </div></Full>}
          <Full><Field label="Notes" value={form.notes} onChange={sf("notes")}/></Full>
        </>}
        {modal==="sale"&&<>
          <Field label="Date" value={form.date} onChange={sf("date")} type="date"/>
          <Field label="Produit" value={form.product} onChange={sf("product")} options={prodOpts}/>
          <Field label="Quantité" value={form.qty} onChange={sf("qty")} type="number"/>
          <Field label="Prix Vente (FCFA)" value={form.pu} onChange={sf("pu")} type="number"/>
          <Field label="Prix Achat (FCFA)" value={form.pp} onChange={sf("pp")} type="number"/>
          <Field label="Client" value={form.client} onChange={sf("client")} options={cliOpts}/></>}
        {modal==="expense"&&<>
          <Field label="Date" value={form.date} onChange={sf("date")} type="date"/>
          <Field label="Type" value={form.type} onChange={sf("type")} options={["Loyer","Salaires","Transport","Taxes","Marketing","Maintenance","Utilities","Autre"]}/>
          <Full><Field label="Description" value={form.desc} onChange={sf("desc")}/></Full>
          <Field label="Montant (FCFA)" value={form.montant} onChange={sf("montant")} type="number"/>
          <Field label="Catégorie" value={form.cat} onChange={sf("cat")} options={["Charges fixes","Logistique","Personnel","Fiscalité","Commercial","Autre"]}/></>}
        {modal==="retour"&&<>
          <Field label="Date" value={form.date} onChange={sf("date")} type="date"/>
          <Field label="Client" value={form.client} onChange={sf("client")} options={cliOpts}/>
          <Field label="Produit" value={form.product} onChange={sf("product")} options={prodOpts}/>
          <Field label="Qté retournée" value={form.qty} onChange={sf("qty")} type="number"/>
          <Full><Field label="Motif" value={form.motif} onChange={sf("motif")}/></Full>
          <Field label="Montant (FCFA)" value={form.montant} onChange={sf("montant")} type="number"/>
          <Field label="Statut" value={form.statut} onChange={sf("statut")} options={["En cours","Traité","Annulé"]}/></>}
        {modal==="lot"&&<>
          <Field label="Produit" value={form.product} onChange={sf("product")} options={prodOpts}/>
          <Field label="N° Lot" value={form.lot} onChange={sf("lot")}/>
          <Field label="Quantité" value={form.qty} onChange={sf("qty")} type="number"/>
          <Field label="Fournisseur" value={form.supp} onChange={sf("supp")} options={suppOpts}/>
          <Field label="Fabrication" value={form.fabrication} onChange={sf("fabrication")} type="date"/>
          <Field label="Péremption" value={form.peremption} onChange={sf("peremption")} type="date"/>
          <Field label="Statut" value={form.statut} onChange={sf("statut")} options={["Valide","Expiré bientôt","Expiré"]}/></>}
        {modal==="paiement"&&<>
          <Field label="Date" value={form.date} onChange={sf("date")} type="date"/>
          <Field label="Facture Réf." value={form.ref} onChange={sf("ref")} options={invOpts}/>
          <Field label="Client" value={form.client} onChange={sf("client")} options={cliOpts}/>
          <Field label="Montant (FCFA)" value={form.montant} onChange={sf("montant")} type="number"/>
          <Field label="Mode" value={form.mode} onChange={sf("mode")} options={["Virement","Chèque","Espèces","Mobile Money","Autre"]}/>
          <Field label="Échéance" value={form.echeance} onChange={sf("echeance")} type="date"/>
          <Field label="Statut" value={form.statut} onChange={sf("statut")} options={["En attente","Reçu","Annulé"]}/></>}
        {modal==="inventaire"&&<>
          <Field label="Date" value={form.date} onChange={sf("date")} type="date"/>
          <Field label="Produit" value={form.produit} onChange={sf("produit")} options={prodOpts}/>
          <Field label="Qté Théorique" value={form.qtyTheo} onChange={sf("qtyTheo")} type="number"/>
          <Field label="Qté Réelle" value={form.qtyReel} onChange={sf("qtyReel")} type="number"/>
          <Full><Field label="Motif de l'écart" value={form.motif} onChange={sf("motif")}/></Full>
          <Field label="Statut" value={form.statut} onChange={sf("statut")} options={["En cours","Validé"]}/></>}
        {modal==="user"&&<><Full><Field label="Nom" value={form.name} onChange={sf("name")}/></Full>
          <Field label="Email" value={form.email} onChange={sf("email")} type="email"/>
          <Field label="Rôle" value={form.role} onChange={sf("role")} options={["Administrateur","Gestionnaire Stock","Commercial","Comptable","Observateur"]}/>
          <Field label="Statut" value={form.status} onChange={sf("status")} options={["Actif","Inactif"]}/></>}
        {modal==="authUser"&&<><Full><Field label="Nom complet" value={form.name} onChange={sf("name")}/></Full>
          <Field label="Email (identifiant)" value={form.email} onChange={sf("email")} type="email"/>
          <Field label="Mot de passe" value={form.password} onChange={sf("password")} type="password"/>
          <Field label="Rôle" value={form.role} onChange={sf("role")} options={["Administrateur","Gestionnaire Stock","Commercial","Comptable","Observateur"]}/>
          <Field label="Statut" value={form.status} onChange={sf("status")} options={["Actif","Inactif"]}/></>}
        {modal==="objectif"&&<><Full><Field label="Titre" value={form.titre} onChange={sf("titre")}/></Full>
          <Field label="Valeur Cible" value={form.cible} onChange={sf("cible")} type="number"/>
          <Field label="Valeur Actuelle" value={form.actuel} onChange={sf("actuel")} type="number"/>
          <Field label="Période" value={form.periode} onChange={sf("periode")}/>
          <Field label="Unité" value={form.unite} onChange={sf("unite")} options={["FCFA","commandes","%","jours","clients"]}/>
          <Field label="Catégorie" value={form.cat} onChange={sf("cat")} options={["Financier","Commercial","Opérationnel","Qualité","RH"]}/></>}
      </G>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
        <Btn variant="ghost" onClick={closeModal}>Annuler</Btn>
        <Btn onClick={()=>saveItem(modal)} disabled={syncing}>{syncing?"⏳ Enregistrement...":"Enregistrer"}</Btn>
      </div>
    </Modal>;
  };

  // ── NAV ──
  const navGroups=[
    {label:"Principal",items:[{key:"dashboard",icon:"📊",label:"Tableau de bord"}]},
    {label:"Ventes & Clients",items:[
      {key:"ventes",icon:"🛒",label:"Ventes"},{key:"devis",icon:"📝",label:"Devis"},
      {key:"commandes",icon:"📋",label:"Commandes"},{key:"factures",icon:"🧾",label:"Factures"},
      {key:"paiements",icon:"💳",label:"Paiements"},{key:"retours",icon:"↩️",label:"Retours & SAV"},
      {key:"clients",icon:"🏥",label:"Clients"},
    ]},
    {label:"Stock & Logistique",items:[
      {key:"stock",icon:"📦",label:"Stock"},{key:"lots",icon:"🧪",label:"Lots & Péremption"},
      {key:"inventaire",icon:"🔍",label:"Inventaire"},{key:"fournisseurs",icon:"🏭",label:"Fournisseurs"},
    ]},
    {label:"Finance & RH",items:[
      {key:"finances",icon:"💰",label:"Finances"},{key:"depenses",icon:"💸",label:"Dépenses"},
      {key:"personnel",icon:"👥",label:"Personnel"},
    ]},
    {label:"Pilotage",items:[
      {key:"objectifs",icon:"🎯",label:"Objectifs & KPIs"},{key:"rapports",icon:"📊",label:"Rapports"},
      {key:"journal",icon:"📜",label:"Journal"},{key:"utilisateurs",icon:"🔒",label:"Utilisateurs"},
      {key:"notifications_config",icon:"📧",label:"Alertes Email"},
    ]},
  ];
  const cur=navGroups.flatMap(g=>g.items).find(n=>n.key===tab);

  return (
    <div style={{display:"flex",minHeight:"100vh",background:C.bg}}>
      {/* SIDEBAR */}
      {sideOpen&&<aside style={{width:210,background:`linear-gradient(170deg,${C.pd} 0%,#003D33 100%)`,display:"flex",flexDirection:"column",padding:"0 0 14px",position:"fixed",top:0,left:0,height:"100vh",zIndex:100,overflowY:"auto"}}>
        <div style={{padding:"18px 14px 14px",borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:22}}>🏥</span>
              <div><div style={{color:C.white,fontWeight:900,fontSize:13,fontFamily:"'Playfair Display',serif"}}>MediBiz</div>
              <div style={{color:"rgba(255,255,255,0.4)",fontSize:9}}>Ultimate v3.0</div></div>
            </div>
            <button onClick={()=>setSideOpen(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:16}}>✕</button>
          </div>
          <div style={{marginTop:10,display:"flex",alignItems:"center",gap:5,fontSize:10}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:connected?C.ok:C.err,flexShrink:0}}/>
            <span style={{color:"rgba(255,255,255,0.5)"}}>{connected?"Connecté — Temps réel":"Reconnexion..."}</span>
          </div>
          <div style={{marginTop:4,fontSize:10,color:"rgba(255,255,255,0.4)"}}>👥 {usersOnline} en ligne</div>
        </div>
        <nav style={{flex:1,padding:"8px 7px"}}>
          {navGroups.map(group=><div key={group.label} style={{marginBottom:6}}>
            <div style={{fontSize:9,fontWeight:800,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"0.1em",padding:"3px 7px 2px"}}>{group.label}</div>
            {group.items.map(item=><button key={item.key} onClick={()=>{setTab(item.key);setSearch("");}}
              style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"7px 9px",borderRadius:7,border:"none",
                background:tab===item.key?"rgba(255,255,255,0.18)":"transparent",
                color:tab===item.key?C.white:"rgba(255,255,255,0.55)",
                cursor:"pointer",fontWeight:tab===item.key?700:400,fontSize:12,marginBottom:1,textAlign:"left"}}>
              <span style={{fontSize:13}}>{item.icon}</span>{item.label}
            </button>)}
          </div>)}
        </nav>
        <div style={{padding:"0 9px"}}>
          <div style={{background:"rgba(255,255,255,0.08)",borderRadius:8,padding:"9px 10px"}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginBottom:4}}>{currentUser.name}</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginBottom:8}}>{currentUser.role}</div>
            <button onClick={()=>setShowChangePwd(true)} style={{width:"100%",background:"rgba(255,255,255,0.12)",color:C.white,border:"none",borderRadius:6,padding:"5px",cursor:"pointer",fontSize:11,marginBottom:6}}>🔑 Changer mot de passe</button>
            <button onClick={onLogout} style={{width:"100%",background:"rgba(229,57,53,0.3)",color:"#FFCDD2",border:"none",borderRadius:6,padding:"5px",cursor:"pointer",fontSize:11}}>🚪 Déconnexion</button>
          </div>
        </div>
      </aside>}

      {/* MAIN */}
      <main style={{flex:1,padding:"20px 24px",overflowY:"auto",marginLeft:sideOpen?210:0,transition:"margin 0.2s",minWidth:0}}>
        <div style={{maxWidth:1400,margin:"0 auto"}}>
          {/* TOPBAR */}
          <div style={{marginBottom:18,paddingBottom:12,borderBottom:`1.5px solid ${C.brd}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              {!sideOpen&&<button onClick={()=>setSideOpen(true)} style={{background:C.p,color:C.white,border:"none",borderRadius:8,padding:"7px 12px",cursor:"pointer",fontSize:14}}>☰</button>}
              <h1 style={{margin:0,color:C.pd,fontFamily:"'Playfair Display',serif",fontSize:20,display:"flex",alignItems:"center",gap:8}}>
                {cur?.icon} {cur?.label}
              </h1>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              {syncing&&<span style={{fontSize:12,color:C.txl}}>⏳ Sync...</span>}
              <InstallPWA/>
              {/* NOTIFICATION BELL */}
              <button onClick={()=>setShowNotifs(v=>!v)} style={{position:"relative",background:unreadNotifs>0?C.err:C.bg,color:unreadNotifs>0?C.white:C.txl,border:`1.5px solid ${unreadNotifs>0?C.err:C.brd}`,borderRadius:9,padding:"7px 14px",cursor:"pointer",fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:6}}>
                🔔 {unreadNotifs>0&&<span style={{background:C.white,color:C.err,borderRadius:20,padding:"1px 6px",fontSize:11,fontWeight:800}}>{unreadNotifs}</span>}
              </button>
              <div style={{fontSize:11,color:C.txl}}>
                {new Date().toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})}
              </div>
            </div>
          </div>
          {renderSection()}
        </div>
      </main>

      {/* PANELS & MODALS */}
      {renderModal()}
      {showNotifs&&<NotifPanel notifications={notifications} onClose={()=>setShowNotifs(false)}
        onReadAll={async()=>{await apiPut("/api/notifications/read-all",{});setShowNotifs(false);}}
        onCheck={async()=>{await apiPost("/api/notifications/check",{});}}/>}
      {showChangePwd&&<ChangePasswordModal onClose={()=>setShowChangePwd(false)}/>}
      {printD&&<Modal title={`Imprimer — ${printD.ref}`} onClose={()=>setPrintD(null)}>
        <div style={{textAlign:"center",padding:"20px 0"}}>
          <p style={{color:C.txl,marginBottom:20,fontSize:13}}>Générer le PDF via l'impression du navigateur.</p>
          <div style={{display:"flex",gap:12,justifyContent:"center"}}>
            <Btn variant="ghost" onClick={()=>setPrintD(null)}>Annuler</Btn>
            <Btn onClick={()=>{doPrint(printD,isDevisP);setPrintD(null);}}>🖨️ Imprimer / PDF</Btn>
          </div>
        </div>
      </Modal>}
    </div>
  );
}
