const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'medibiz-secret-key-2025';
const DB_FILE = path.join(__dirname, '..', 'database.json');

// ── EMAIL CONFIG ──
// Configure avec tes identifiants SMTP (Gmail, etc.)
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  user: process.env.SMTP_USER || '',   // Ton email Gmail
  pass: process.env.SMTP_PASS || '',   // Mot de passe app Gmail
  from: process.env.SMTP_FROM || 'MediBiz Manager <noreply@medibiz.ci>',
  adminEmail: process.env.ADMIN_EMAIL || '', // Email destinataire alertes
};

// ── INITIAL DATA ──
const initialData = {
  products: [
    {id:1,name:"Gants Latex (boîte 100)",cat:"Consommable",qty:450,pp:3500,sp:5500,supp:"MedSupply CI",min:50},
    {id:2,name:"Seringues 5ml (boîte 100)",cat:"Consommable",qty:320,pp:4200,sp:6800,supp:"PharmaDist",min:100},
    {id:3,name:"Masques FFP2 (boîte 20)",cat:"EPI",qty:28,pp:8000,sp:14000,supp:"SafeMed",min:50},
    {id:4,name:"Tensiomètre Digital",cat:"Appareil",qty:15,pp:45000,sp:78000,supp:"MedEquip SA",min:5},
    {id:5,name:"Oxymètre de pouls",cat:"Appareil",qty:22,pp:18000,sp:32000,supp:"MedEquip SA",min:8},
    {id:6,name:"Compresses stériles",cat:"Consommable",qty:0,pp:2500,sp:4200,supp:"MedSupply CI",min:80},
    {id:7,name:"Alcool médical 500ml",cat:"Désinfectant",qty:180,pp:1200,sp:2200,supp:"PharmaDist",min:60},
    {id:8,name:"Glucomètre + Bandelettes",cat:"Appareil",qty:12,pp:35000,sp:58000,supp:"MedEquip SA",min:5},
  ],
  employees: [
    {id:1,name:"Kouassi Aimé",pos:"Directeur Commercial",sal:350000,phone:"+225 07 12 34 56",email:"aime.k@medibiz.ci",status:"Actif"},
    {id:2,name:"Diallo Fatou",pos:"Responsable Stock",sal:220000,phone:"+225 05 98 76 54",email:"fatou.d@medibiz.ci",status:"Actif"},
  ],
  suppliers: [
    {id:1,name:"MedSupply CI",ctt:"M. Traoré",phone:"+225 20 31 45 67",email:"contact@medsupply.ci",addr:"Abidjan, Plateau",cat:"Consommables"},
    {id:2,name:"PharmaDist",ctt:"Mme. Coulibaly",phone:"+225 20 22 33 44",email:"info@pharmadist.ci",addr:"Abidjan, Zone 4",cat:"Médicaments"},
  ],
  clients: [
    {id:1,name:"Clinique Sainte Marie",ctt:"Dr. Yao",phone:"+225 27 20 12 34",email:"achats@cliniquesm.ci",addr:"Cocody",cat:"Clinique",total:2450000},
    {id:2,name:"CHU de Treichville",ctt:"M. Gnébré",phone:"+225 27 21 23 45",email:"logistique@chu-tr.ci",addr:"Treichville",cat:"Hôpital",total:5800000},
  ],
  orders: [],
  invoices: [
    {id:1,ref:"FAC-001",date:"2025-03-01",client:"CHU de Treichville",items:[{name:"Gants Latex",qty:50,pu:5500}],tva:18,remise:5,status:"Impayée",notes:""},
  ],
  sales: [
    {id:1,date:"2025-03-18",product:"Gants Latex",qty:20,pu:5500,pp:3500,client:"CHU de Treichville"},
  ],
  expenses: [
    {id:1,date:"2025-03-01",type:"Loyer",desc:"Loyer entrepôt Mars 2025",montant:450000,cat:"Charges fixes"},
  ],
  devis: [],
  retours: [],
  lots: [
    {id:1,product:"Gants Latex (boîte 100)",lot:"LOT-2024-A",qty:200,fabrication:"2024-01-15",peremption:"2026-01-15",supp:"MedSupply CI",statut:"Valide"},
    {id:2,product:"Masques FFP2",lot:"LOT-2023-B",qty:28,fabrication:"2023-06-01",peremption:"2025-06-01",supp:"SafeMed",statut:"Expiré bientôt"},
  ],
  paiements: [],
  inventaire: [],
  objectifs: [
    {id:1,titre:"CA Mensuel",cible:7000000,actuel:6200000,periode:"Mars 2025",cat:"Financier",unite:"FCFA"},
  ],
  journal: [],
  notifications: [],
  // Auth users (hashed passwords)
  authUsers: [
    // Default admin: admin / medibiz2025
    {id:1,name:"Administrateur",email:"admin@medibiz.ci",passwordHash:"$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi",role:"Administrateur",status:"Actif"},
  ],
};

// ── DATABASE ──
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch(e) {}
  saveDB(initialData);
  return JSON.parse(JSON.stringify(initialData));
}
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}
let db = loadDB();

// ── EMAIL SENDER ──
async function sendEmail(to, subject, html) {
  if (!EMAIL_CONFIG.user || !EMAIL_CONFIG.pass) {
    console.log(`[EMAIL] Non configuré. Sujet: ${subject}`);
    return false;
  }
  try {
    const transporter = nodemailer.createTransport({
      host: EMAIL_CONFIG.host,
      port: EMAIL_CONFIG.port,
      secure: false,
      auth: { user: EMAIL_CONFIG.user, pass: EMAIL_CONFIG.pass },
    });
    await transporter.sendMail({ from: EMAIL_CONFIG.from, to, subject, html });
    console.log(`[EMAIL] Envoyé: ${subject}`);
    return true;
  } catch(e) {
    console.error('[EMAIL] Erreur:', e.message);
    return false;
  }
}

function emailTemplate(title, body, color='#00897B') {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="font-family:'Segoe UI',sans-serif;background:#F0FAF9;padding:32px">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,137,123,0.15)">
    <div style="background:${color};padding:28px 32px">
      <h1 style="color:white;margin:0;font-size:22px">🏥 MediBiz Manager</h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px">Notification automatique</p>
    </div>
    <div style="padding:28px 32px">
      <h2 style="color:#00695C;margin:0 0 16px;font-size:18px">${title}</h2>
      ${body}
    </div>
    <div style="padding:16px 32px;background:#F0FAF9;font-size:11px;color:#5A7A76;text-align:center">
      MediBiz Distribution SARL · Abidjan, Côte d'Ivoire<br/>
      Cet email est généré automatiquement — ne pas répondre
    </div>
  </div></body></html>`;
}

// ── NOTIFICATION SYSTEM ──
function addNotification(type, title, message, severity='info') {
  const notif = { id: Date.now()+Math.random(), type, title, message, severity, date: new Date().toISOString(), read: false };
  db.notifications = [notif, ...(db.notifications||[])].slice(0, 100);
  saveDB(db);
  broadcast({ type: 'NOTIFICATION', notification: notif, notifications: db.notifications });
  return notif;
}

async function checkAlerts() {
  db = loadDB();
  const to = EMAIL_CONFIG.adminEmail;
  let alerts = [];

  // 1. Stock alerts
  const stockAlerts = (db.products||[]).filter(p => p.qty <= p.min);
  if (stockAlerts.length > 0) {
    const ruptures = stockAlerts.filter(p => p.qty === 0);
    const faibles = stockAlerts.filter(p => p.qty > 0);
    if (ruptures.length > 0) {
      const msg = ruptures.map(p=>`<li><strong>${p.name}</strong> — Stock: 0 / Min: ${p.min}</li>`).join('');
      addNotification('stock', '🚨 Rupture de Stock', `${ruptures.length} produit(s) en rupture`, 'danger');
      alerts.push({ subject: `🚨 RUPTURE DE STOCK — ${ruptures.length} produit(s)`, html: emailTemplate('Rupture de Stock Critique', `<p style="color:#E53935;font-weight:bold">Les produits suivants sont en rupture totale :</p><ul style="color:#1a2e2b">${msg}</ul><p>Veuillez passer commande immédiatement.</p>`, '#E53935') });
    }
    if (faibles.length > 0) {
      const msg = faibles.map(p=>`<li><strong>${p.name}</strong> — Stock: ${p.qty} / Min: ${p.min}</li>`).join('');
      addNotification('stock', '⚠️ Stock Faible', `${faibles.length} produit(s) sous le seuil minimum`, 'warning');
      alerts.push({ subject: `⚠️ Stock Faible — ${faibles.length} produit(s)`, html: emailTemplate('Alerte Stock Faible', `<p>Les produits suivants sont en dessous du stock minimum :</p><ul style="color:#1a2e2b">${msg}</ul>`, '#FB8C00') });
    }
  }

  // 2. Unpaid invoices
  const unpaid = (db.invoices||[]).filter(i => i.status === 'Impayée');
  if (unpaid.length > 0) {
    const total = unpaid.reduce((s,i) => {
      const sub = (i.items||[]).reduce((ss,it)=>ss+it.qty*it.pu,0);
      return s + (sub-(sub*(i.remise/100)))*(1+(i.tva/100));
    }, 0);
    const msg = unpaid.map(i=>`<li><strong>${i.ref}</strong> — Client: ${i.client} — Date: ${i.date}</li>`).join('');
    addNotification('invoice', '💰 Factures Impayées', `${unpaid.length} facture(s) impayée(s)`, 'warning');
    alerts.push({ subject: `💰 ${unpaid.length} Facture(s) Impayée(s)`, html: emailTemplate('Factures Impayées', `<p>${unpaid.length} facture(s) sont en attente de paiement :</p><ul>${msg}</ul><p style="font-weight:bold;color:#00695C">Montant total : ${new Intl.NumberFormat('fr-FR').format(Math.round(total))} FCFA</p>`) });
  }

  // 3. Expiring lots (within 60 days)
  const soon = new Date(); soon.setDate(soon.getDate() + 60);
  const expiringLots = (db.lots||[]).filter(lo => {
    try { return lo.statut !== 'Expiré' && new Date(lo.peremption) <= soon; } catch(e){ return false; }
  });
  if (expiringLots.length > 0) {
    const msg = expiringLots.map(lo=>`<li><strong>${lo.product}</strong> — Lot: ${lo.lot} — Péremption: ${lo.peremption}</li>`).join('');
    addNotification('lot', '🧪 Lots Expirant', `${expiringLots.length} lot(s) expirant dans 60 jours`, 'warning');
    alerts.push({ subject: `🧪 ${expiringLots.length} Lot(s) Proche(s) de Péremption`, html: emailTemplate('Lots Proches de Péremption', `<p>Les lots suivants expirent dans moins de 60 jours :</p><ul>${msg}</ul><p>Veuillez vérifier et retirer les produits concernés.</p>`, '#FB8C00') });
  }

  // Send emails
  if (to) {
    for (const alert of alerts) {
      await sendEmail(to, alert.subject, alert.html);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (alerts.length > 0) {
    console.log(`[ALERTES] ${alerts.length} alerte(s) générée(s)`);
  }
}

// ── CRON JOBS ──
// Check alerts every day at 8:00 AM
cron.schedule('0 8 * * *', () => {
  console.log('[CRON] Vérification des alertes quotidiennes...');
  checkAlerts();
});
// Also check every 30 minutes
cron.schedule('*/30 * * * *', () => checkAlerts());

// ── WEBSOCKET ──
const clients = new Map();
function broadcast(message, excludeWs=null) {
  wss.clients.forEach(client => {
    if (client !== excludeWs && client.readyState === 1) {
      client.send(JSON.stringify(message));
    }
  });
}

wss.on('connection', (ws, req) => {
  const clientId = Date.now();
  clients.set(ws, { id: clientId, user: null });
  console.log(`✅ Client connecté (${wss.clients.size} total)`);
  broadcast({ type: 'USERS_COUNT', count: wss.clients.size });

  // Send full data on connect
  ws.send(JSON.stringify({ type: 'FULL_SYNC', data: { ...db, authUsers: undefined } }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`❌ Client déconnecté (${wss.clients.size} restant)`);
    broadcast({ type: 'USERS_COUNT', count: wss.clients.size });
  });
  ws.on('error', () => clients.delete(ws));
});

// ── MIDDLEWARE ──
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Serve React build
app.use(express.static(path.join(__dirname, '..', 'build')));

// ── AUTH MIDDLEWARE ──
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token requis' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch(e) {
    res.status(401).json({ error: 'Token invalide' });
  }
}

// ── AUTH ROUTES ──
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  db = loadDB();
  const user = (db.authUsers||[]).find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  if (user.status !== 'Actif') return res.status(401).json({ error: 'Compte désactivé' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  // Log login
  db.journal = [{ id: Date.now(), date: new Date().toLocaleString('fr-FR'), user: user.name, action: 'Connexion à l\'application', module: 'Auth' }, ...db.journal].slice(0, 200);
  saveDB(db);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.post('/api/auth/register', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Administrateur') return res.status(403).json({ error: 'Accès refusé' });
  const { name, email, password, role } = req.body;
  db = loadDB();
  if ((db.authUsers||[]).find(u => u.email === email)) return res.status(400).json({ error: 'Email déjà utilisé' });
  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = { id: Date.now(), name, email, passwordHash, role: role||'Commercial', status: 'Actif' };
  db.authUsers = [...(db.authUsers||[]), newUser];
  saveDB(db);
  res.json({ success: true });
});

app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  db = loadDB();
  const user = (db.authUsers||[]).find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  const ok = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Ancien mot de passe incorrect' });
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  saveDB(db);
  res.json({ success: true });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

// ── NOTIFICATIONS ──
app.get('/api/notifications', authMiddleware, (req, res) => {
  db = loadDB();
  res.json(db.notifications||[]);
});

app.put('/api/notifications/read-all', authMiddleware, (req, res) => {
  db = loadDB();
  db.notifications = (db.notifications||[]).map(n => ({ ...n, read: true }));
  saveDB(db);
  broadcast({ type: 'NOTIFICATIONS_READ' });
  res.json({ success: true });
});

app.post('/api/notifications/check', authMiddleware, async (req, res) => {
  await checkAlerts();
  res.json({ success: true, message: 'Vérification effectuée' });
});

// ── DATA API ──
const collections = ['products','employees','suppliers','clients','orders','invoices',
  'sales','expenses','devis','retours','lots','paiements','inventaire','users','objectifs','journal'];

app.get('/api/db/all', authMiddleware, (req, res) => {
  db = loadDB();
  res.json({ ...db, authUsers: undefined });
});

app.get('/api/:collection', authMiddleware, (req, res) => {
  const { collection } = req.params;
  if (!collections.includes(collection)) return res.status(404).json({ error: 'Collection inconnue' });
  db = loadDB();
  res.json(db[collection]||[]);
});

app.post('/api/:collection', authMiddleware, (req, res) => {
  const { collection } = req.params;
  if (!collections.includes(collection)) return res.status(404).json({ error: 'Collection inconnue' });
  db = loadDB();
  const item = { ...req.body, id: Date.now()+Math.random() };
  delete item._user;
  db[collection] = [...(db[collection]||[]), item];
  const label = item.name||item.ref||item.titre||item.product||item.produit||'';
  if (collection !== 'journal') {
    db.journal = [{ id: Date.now(), date: new Date().toLocaleString('fr-FR'), user: req.user.name, action: `Création: ${label}`, module: collection }, ...db.journal].slice(0, 200);
  }
  saveDB(db);
  broadcast({ type: 'UPDATE', collection, data: db[collection], journal: db.journal });
  // Check alerts after stock change
  if (collection === 'products' || collection === 'sales') setTimeout(checkAlerts, 2000);
  res.json(item);
});

app.put('/api/:collection/:id', authMiddleware, (req, res) => {
  const { collection, id } = req.params;
  if (!collections.includes(collection)) return res.status(404).json({ error: 'Collection inconnue' });
  db = loadDB();
  const item = { ...req.body }; delete item._user;
  db[collection] = (db[collection]||[]).map(i => String(i.id)===String(id) ? { ...item, id: i.id } : i);
  const label = item.name||item.ref||item.titre||item.product||'';
  if (collection !== 'journal') {
    db.journal = [{ id: Date.now(), date: new Date().toLocaleString('fr-FR'), user: req.user.name, action: `Modification: ${label}`, module: collection }, ...db.journal].slice(0, 200);
  }
  saveDB(db);
  broadcast({ type: 'UPDATE', collection, data: db[collection], journal: db.journal });
  if (collection === 'products') setTimeout(checkAlerts, 2000);
  res.json({ success: true });
});

app.delete('/api/:collection/:id', authMiddleware, (req, res) => {
  const { collection, id } = req.params;
  if (!collections.includes(collection)) return res.status(404).json({ error: 'Collection inconnue' });
  db = loadDB();
  const item = (db[collection]||[]).find(i => String(i.id)===String(id));
  db[collection] = (db[collection]||[]).filter(i => String(i.id)!==String(id));
  const label = item?.name||item?.ref||item?.titre||'';
  db.journal = [{ id: Date.now(), date: new Date().toLocaleString('fr-FR'), user: req.user.name, action: `Suppression: ${label}`, module: collection }, ...db.journal].slice(0, 200);
  saveDB(db);
  broadcast({ type: 'UPDATE', collection, data: db[collection], journal: db.journal });
  res.json({ success: true });
});

// ── HEALTH CHECK ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '3.0.0', clients: wss.clients.size, time: new Date().toISOString() });
});

// ── FALLBACK ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});

// ── START ──
server.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  let localIP = 'localhost';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family==='IPv4' && !net.internal) { localIP = net.address; break; }
    }
  }
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   MEDIBIZ MANAGER ULTIMATE v3.0            ║');
  console.log('║   Données Temps Réel + Auth + Notifications ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`\n  🌐 Local    : http://localhost:${PORT}`);
  console.log(`  🏢 Réseau   : http://${localIP}:${PORT}`);
  console.log(`\n  🔑 Login par défaut :`);
  console.log(`     Email    : admin@medibiz.ci`);
  console.log(`     Mot de passe : medibiz2025`);
  console.log(`\n  📧 Email alertes : ${EMAIL_CONFIG.adminEmail||'(non configuré)'}`);
  console.log(`\n  ✅ Serveur prêt !`);
  console.log('═'.repeat(46)+'\n');

  // Initial alert check
  setTimeout(checkAlerts, 5000);
});
