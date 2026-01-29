/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc,
  updateDoc, 
  writeBatch, 
  getDocs, 
  deleteDoc,
  where,
  limit
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  LayoutDashboard, 
  FileUp, 
  Trash2, 
  AlertTriangle, 
  Menu, 
  User,
  Wallet,
  Activity,
  Lock,
  Unlock,
  PieChart,
  ShieldCheck,
  TrendingUp,
  Target,
  Users,
  UserPlus,
  Settings2,
  Edit3,
  LogOut,
  Eraser,
  ShieldHalf,
  CheckCircle2,
  LogIn,
  KeyRound,
  Search,
  Filter,
  Eye,
  EyeOff,
  ChevronRight,
  Save,
  Clock
} from 'lucide-react';

// --- DEKLARASI GLOBAL UNTUK TYPESCRIPT ---
declare global {
  interface Window {
    XLSX: any;
  }
  const __firebase_config: string;
  const __app_id: string;
  const __initial_auth_token: string;
}

// ==========================================================
// 1. KONFIGURASI FIREBASE & GLOBAL
// ==========================================================
const getFirebaseConfig = () => {
  try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      return JSON.parse(__firebase_config);
    }
    return {
      apiKey: "AIzaSyDYqadyvJ-9RYxBNOeDxsYAY6wwE5t_y8w",
      authDomain: "mese-ikpa.firebaseapp.com",
      projectId: "mese-ikpa",
      storageBucket: "mese-ikpa.firebasestorage.app",
      messagingSenderId: "968020082155",
      appId: "1:968020082155:web:f86188e6de15dcd8cc2dae"
    };
  } catch (e) {
    return {};
  }
};

const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'meseikpa-primary-store';

const DATA_COLLECTION = 'pagu_anggaran';
const USER_COLLECTION = 'users';
const METRICS_COLLECTION = 'kppn_metrics';

const ALL_TEAMS = ["Nerwilis", "IPDS", "Distribusi", "Produksi", "Sosial", "Umum"];
const TIM_MAPPING: Record<string, string[]> = {
  "Nerwilis": ["2896", "2898", "2899"],
  "IPDS": ["2897", "2900", "2901"],
  "Distribusi": ["2902", "2903", "2908"],
  "Produksi": ["2904", "2909", "2910"],
  "Sosial": ["2905", "2906", "2907"],
  "Umum": ["2886"]
};

// --- FUNGSI UTILITY ---
const formatMoney = (val: any) => {
  const num = Number(val);
  return num ? num.toLocaleString('id-ID') : '0';
};

const cleanString = (str: any) => String(str || "").replace(/\s+/g, "").trim().toUpperCase();

const getLevel = (kode: string): number => {
  if (!kode || kode.includes("(HILANG)")) return 8; 
  const c = cleanString(kode);
  if (c.includes("054.01")) return 1; 
  if (/^[0-9]{4}$/.test(c)) return 2; 
  const dotCount = (c.match(/\./g) || []).length;
  if (dotCount === 1) return 3; 
  if (dotCount === 2) return 4; 
  if (/^[0-9]{3}$/.test(c)) return 5; 
  if (/^[A-Z]$/.test(c)) return 6; 
  if (/^[0-9]{6}$/.test(c)) return 7; 
  return 8; 
};

const sumMapValues = (map: any) => {
    if (!map) return 0;
    return Object.keys(map).reduce((acc, key) => acc + (Number(map[key]) || 0), 0);
};

const generateRowKey = (item: any, currentPath: string[]) => {
    const level = getLevel(item.kode);
    if (level < 8) {
        currentPath[level - 1] = cleanString(item.kode) || cleanString(item.uraian);
        for (let i = level; i < 8; i++) currentPath[i] = "";
    }
    return currentPath.slice(0, 7).filter(Boolean).join("|") + "||" + (cleanString(item.kode) || cleanString(item.uraian));
};

export default function App() {
  const [fbUser, setFbUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // --- LOGIN STATE ---
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // --- STATE DATA ---
  const [dataTampil, setDataTampil] = useState<any[]>([]);
  const [kppnMetrics, setKppnMetrics] = useState<any>({
    rpd: { TW1: 0, TW2: 0, TW3: 0, TW4: 0 },
    real: { TW1: 0, TW2: 0, TW3: 0, TW4: 0 },
    isLocked: false
  });
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rpd' | 'realisasi' | 'rapat' | 'migrasi' | 'users'>('dashboard');
  const [activeWilayah, setActiveWilayah] = useState<string>("GG");
  const [activeTim, setActiveTim] = useState<string>("Nerwilis");
  const [rapatDepth, setRapatDepth] = useState<number>(2); 
  const [twActive, setTwActive] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [libReady, setLibReady] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]); 
  const [migrationStats, setMigrationStats] = useState({ match: 0, new: 0, orphaned: 0 });
  const [isLocked, setIsLocked] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newUserRole, setNewUserRole] = useState<'admin' | 'pimpinan' | 'ketua_tim'>('ketua_tim');
  const [newUserTeam, setNewUserTeam] = useState("Nerwilis");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const allMonths = useMemo(() => ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'], []);
  const twMonths: Record<number, string[]> = {
    1: ['Jan', 'Feb', 'Mar'], 2: ['Apr', 'Mei', 'Jun'],
    3: ['Jul', 'Ags', 'Sep'], 4: ['Okt', 'Nov', 'Des']
  };

  // Efek Otomatis Set Tim Berdasarkan Profil User
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      setActiveTim(currentUser.team);
      if (currentUser.team === "Umum") setActiveWilayah("WA");
      else setActiveWilayah("GG");
    }
  }, [currentUser]);

  // Excel Loader
  useEffect(() => {
    if (window.XLSX) { setLibReady(true); return; }
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => { setLibReady(true); };
    document.head.appendChild(script);
  }, []);

  // Firebase Init & Auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Autentikasi gagal:", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setFbUser(u);
      if (u) {
        try {
          const userSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', USER_COLLECTION));
          if (userSnap.empty) {
            const adminId = crypto.randomUUID();
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', USER_COLLECTION, adminId), {
              uid: adminId, username: "admin", password: "123", name: "Administrator Utama", role: "admin", team: "Umum", createdAt: new Date()
            });
          }
        } catch (e) { console.error("Bootstrap admin error", e); }
      }
      const savedUser = localStorage.getItem(`meseikpa_session_${appId}`);
      if (savedUser) setCurrentUser(JSON.parse(savedUser));
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync
  useEffect(() => {
    if (!fbUser || !currentUser) return;
    const unsubUsers = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', USER_COLLECTION)),
      (snap) => setAllUsers(snap.docs.map(d => ({ ...d.data(), id: d.id }))));
    const unsubKppn = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', METRICS_COLLECTION, 'kppn_global'),
      (snap) => { if (snap.exists()) { const d = snap.data(); setKppnMetrics(d); setIsLocked(!!d.isLocked); } });
    const unsubData = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', DATA_COLLECTION)),
      (snap) => {
        let items = snap.docs.map(d => ({ ...d.data(), id: d.id } as any));
        items.sort((a: any, b: any) => (a.noUrut || 0) - (b.noUrut || 0));
        let curWil = "GG";
        const pathArr: string[] = ["", "", "", "", "", "", "", ""];
        const proc = items.map((item: any) => {
          if (item.kode && String(item.kode).includes("054.01.WA")) curWil = "WA";
          if (item.kode && String(item.kode).includes("054.01.GG")) curWil = "GG"; 
          return { ...item, wilayah: curWil, tempPathKey: generateRowKey(item, pathArr) };
        });
        setDataTampil(proc);
      });
    return () => { unsubUsers(); unsubKppn(); unsubData(); };
  }, [fbUser, currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(""); setIsProcessing(true);
    if (!fbUser) { setLoginError("Koneksi ke server belum siap."); setIsProcessing(false); return; }
    try {
      const qUser = query(collection(db, 'artifacts', appId, 'public', 'data', USER_COLLECTION),
        where("username", "==", loginUsername.trim().toLowerCase()), limit(1));
      const snap = await getDocs(qUser);
      if (snap.empty) { setLoginError("Username tidak terdaftar."); } 
      else {
        const userData = snap.docs[0].data();
        if (userData.password === loginPassword) {
          setCurrentUser(userData);
          localStorage.setItem(`meseikpa_session_${appId}`, JSON.stringify(userData));
        } else { setLoginError("Password salah."); }
      }
    } catch (err: any) { setLoginError("Terjadi kesalahan sistem login."); } finally { setIsProcessing(false); }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(`meseikpa_session_${appId}`);
    setLoginUsername(""); setLoginPassword(""); setLoginError("");
    setActiveTab('dashboard');
  };

  const globalStats = useMemo(() => {
    const stats = { 
        pagu: 0, rpd: 0, real: 0, 
        tw: [{ rpd: 0, real: 0 }, { rpd: 0, real: 0 }, { rpd: 0, real: 0 }, { rpd: 0, real: 0 }],
        belanja: { pegawai: 0, barang: 0, modal: 0 } 
    };
    const details = dataTampil.filter(d => !d.isOrphan && getLevel(d.kode) === 8 && (Number(d.pagu) || 0) > 0);
    details.forEach(d => {
      const itemReal = sumMapValues(d.realisasi);
      stats.pagu += (Number(d.pagu) || 0);
      stats.real += itemReal;
      const keys = (d.tempPathKey || "").split("|");
      const accountCode = keys[6] || ""; 
      if (accountCode.startsWith("51")) stats.belanja.pegawai += itemReal;
      else if (accountCode.startsWith("52")) stats.belanja.barang += itemReal;
      else if (accountCode.startsWith("53")) stats.belanja.modal += itemReal;
      allMonths.forEach((m, idx) => {
        const valRPD = (Number(d.rpd?.[m]) || 0);
        const valReal = (Number(d.realisasi?.[m]) || 0);
        stats.rpd += valRPD;
        const twIdx = Math.floor(idx / 3);
        stats.tw[twIdx].rpd += valRPD;
        stats.tw[twIdx].real += valReal;
      });
    });
    return stats;
  }, [dataTampil, allMonths]);

  const roDataList = useMemo(() => {
    const list: any[] = [];
    const ros = dataTampil.filter(d => getLevel(d.kode) === 2);
    ros.forEach((ro) => {
      let pagu = 0, real = 0;
      const startIndex = dataTampil.indexOf(ro);
      for (let i = startIndex + 1; i < dataTampil.length; i++) {
        const next = dataTampil[i];
        if (next.kode !== "" && getLevel(next.kode) <= 2) break;
        if (getLevel(next.kode) === 8 && (Number(next.pagu) || 0) > 0) {
          pagu += (Number(next.pagu) || 0);
          real += sumMapValues(next.realisasi);
        }
      }
      list.push({ ...ro, pagu, real });
    });
    return list;
  }, [dataTampil]);

  const handleUpdateKPPN = async (category: 'rpd' | 'real', tw: string, value: string) => {
    if (!fbUser || currentUser?.role !== 'admin') return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', METRICS_COLLECTION, 'kppn_global');
    await setDoc(docRef, { [category]: { ...kppnMetrics[category], [tw]: value } }, { merge: true });
  };

  const handleToggleLock = async () => {
    if (!fbUser || currentUser?.role !== 'admin') return;
    const nextVal = !isLocked;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', METRICS_COLLECTION, 'kppn_global');
    await setDoc(docRef, { isLocked: nextVal }, { merge: true });
  };

  const handleAddUser = async () => {
    if (!newUsername || !newPassword || !newFullName || !fbUser) return;
    setIsProcessing(true);
    try {
      const userId = crypto.randomUUID();
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', USER_COLLECTION, userId), {
        uid: userId, username: newUsername.trim().toLowerCase(), password: newPassword,
        name: newFullName, role: newUserRole, team: newUserTeam, createdAt: new Date()
      });
      setNewUsername(""); setNewPassword(""); setNewFullName("");
    } catch (e: any) { console.error(e); } finally { setIsProcessing(false); }
  };

  const handleFileAnalyze = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !libReady) return;
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt: any) => {
        const XLSX = window.XLSX;
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const parsed: any[] = [];
        let count = 1;
        const path: string[] = ["", "", "", "", "", "", "", ""];
        for (let i = 0; i < raw.length; i++) {
            const row = raw[i];
            const kode = row[0] ? String(row[0]).trim() : "";
            const uraian = [row[1], row[2], row[3]].filter(Boolean).join(" ").trim();
            if (!kode && !uraian) continue;
            const satuan = row[4] ? String(row[4]).trim() : "";
            let pagu = 0, foundIdx = -1;
            for (let j = row.length - 1; j >= 5; j--) if (typeof row[j] === 'number') { pagu = row[j]; foundIdx = j; break; }
            let hsat = foundIdx > 5 && typeof row[foundIdx - 1] === 'number' ? row[foundIdx - 1] : 0;
            const pKey = generateRowKey({ kode, uraian }, path);
            parsed.push({ kode, uraian, satuan, hargaSatuan: hsat, pagu, pathKey: pKey, noUrut: count++ });
        }
        const existing = new Set(dataTampil.map(d => d.tempPathKey));
        let match = 0, orphan = 0;
        parsed.forEach(p => { if (existing.has(p.pathKey)) match++; });
        dataTampil.forEach(d => { if (sumMapValues(d.rpd) > 0 && !parsed.some(p => p.pathKey === d.tempPathKey)) orphan++; });
        setPreviewData(parsed);
        setMigrationStats({ match, new: parsed.length - match, orphaned: orphan });
        setIsProcessing(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (e: any) { setIsProcessing(false); }
  };

  const executeMigration = async () => {
    if (!fbUser) return;
    setIsProcessing(true);
    try {
        const colRef = collection(db, 'artifacts', appId, 'public', 'data', DATA_COLLECTION);
        const snap = await getDocs(colRef);
        const backup = new Map();
        dataTampil.forEach(d => backup.set(d.tempPathKey, { rpd: d.rpd || {}, realisasi: d.realisasi || {} }));
        const orphans: any[] = [];
        const newKeys = new Set(previewData.map(p => p.pathKey));
        dataTampil.forEach(d => { if (sumMapValues(d.rpd) > 0 && !newKeys.has(d.tempPathKey)) orphans.push({ ...d, kode: `(HILANG) ${d.kode}`, isOrphan: true }); });
        let batch = writeBatch(db), op = 0;
        for (const docSnap of snap.docs) { batch.delete(docSnap.ref); if (++op >= 450) { await batch.commit(); batch = writeBatch(db); op = 0; } }
        for (const item of previewData) {
            const b = backup.get(item.pathKey) || { rpd: {}, realisasi: {} };
            batch.set(doc(colRef), { ...item, ...b, timestamp: new Date() });
            if (++op >= 450) { await batch.commit(); batch = writeBatch(db); op = 0; }
        }
        for (const orph of orphans) {
            const { id: _, ...clean } = orph;
            batch.set(doc(colRef), clean);
            if (++op >= 450) { await batch.commit(); batch = writeBatch(db); op = 0; }
        }
        if (op > 0) await batch.commit();
        setPreviewData([]); setActiveTab('dashboard');
    } catch (e: any) { console.error(e); } finally { setIsProcessing(false); }
  };

  const processedData = useMemo(() => {
    const normal = dataTampil.filter(d => !d.isOrphan);
    const orphan = dataTampil.filter(d => d.isOrphan);
    const base = (activeTab === 'rapat') ? normal : normal.filter(d => d.wilayah === activeWilayah);
    const calc = base.map((item, index) => {
      const level = getLevel(item.kode);
      const isInduk = item.uraian?.toLowerCase().includes('kppn') || item.uraian?.toLowerCase().includes('lokasi');
      const isDetail = level === 8 && (Number(item.pagu) || 0) > 0 && !isInduk;
      let totalRPD = 0, totalReal = 0;
      let mRPD: Record<string, number> = {};
      let mReal: Record<string, number> = {};
      if (isDetail) { totalRPD = sumMapValues(item.rpd); totalReal = sumMapValues(item.realisasi); } 
      else if (!isInduk) {
        for (let i = index + 1; i < base.length; i++) {
            const n = base[i]; if (n.kode !== "" && getLevel(n.kode) <= level) break;
            if (getLevel(n.kode) === 8 && (Number(n.pagu) || 0) > 0) {
                totalRPD += sumMapValues(n.rpd); totalReal += sumMapValues(n.realisasi);
                allMonths.forEach(m => { mRPD[m] = (mRPD[m] || 0) + (Number(n.rpd?.[m]) || 0); mReal[m] = (mReal[m] || 0) + (Number(n.realisasi?.[m]) || 0); });
            }
        }
      }
      return { ...item, totalRPD, totalReal, monthRPD: mRPD, monthReal: mReal, level, isDetail };
    });
    const merged = [...calc, ...orphan.map(item => ({...item, totalRPD: sumMapValues(item.rpd), totalReal: sumMapValues(item.realisasi), monthRPD: item.rpd || {}, monthReal: item.realisasi || {}, level: 8, isDetail: true}))];
    if (activeTab === 'rapat') return merged.filter(item => item.level <= rapatDepth);
    const allowed = TIM_MAPPING[activeTim] || [];
    let inside = false;
    return merged.filter((item) => {
      if (item.isOrphan) return true; 
      if (getLevel(item.kode) === 2) inside = allowed.includes(item.kode);
      return inside || getLevel(item.kode) === 1; 
    });
  }, [dataTampil, activeWilayah, activeTim, activeTab, rapatDepth, allMonths]);

  const finalDisplay = processedData.filter((d) => 
    (d.uraian && d.uraian.toLowerCase().includes(searchTerm.toLowerCase())) || (d.kode && d.kode.includes(searchTerm))
  );

  const handleUpdateValue = async (itemId: string, month: string, value: string, currentData: any) => {
    if (!fbUser) return;
    const field = activeTab === 'rpd' ? 'rpd' : 'realisasi';
    const existing = activeTab === 'rpd' ? (currentData.rpd || {}) : (currentData.realisasi || {});
    setLastSaved("Menyimpan...");
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', DATA_COLLECTION, itemId), {
        [field]: { ...existing, [month]: value }
      });
      setLastSaved(`Tersimpan ${new Date().toLocaleTimeString()}`);
      setTimeout(() => setLastSaved(null), 3000);
    } catch (e) { setLastSaved("Gagal Simpan"); }
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <span className="font-black uppercase tracking-widest text-xs italic opacity-50">Menyinkronkan Cloud Data...</span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F8FAFC] font-sans p-6">
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
           <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden">
              <div className="bg-[#0F172A] p-10 text-center relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full -mr-10 -mt-10 blur-3xl"></div>
                 <div className="w-16 h-16 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center text-white font-black text-2xl mb-4 shadow-lg shadow-blue-500/30">M</div>
                 <h1 className="text-white text-3xl font-black italic tracking-tighter">MESEIKPA 2.0</h1>
                 <p className="text-slate-400 text-[10px] uppercase font-black tracking-[0.2em] mt-2 italic">BPS Kab. Seram Bagian Barat</p>
              </div>
              <form onSubmit={handleLogin} className="p-10 space-y-6">
                 {loginError && <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-bold italic"><AlertTriangle size={18} />{loginError}</div>}
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Username</label>
                    <div className="relative">
                       <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="Username..." required />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Password</label>
                    <div className="relative">
                       <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="••••••••" required />
                    </div>
                 </div>
                 <button type="submit" disabled={isProcessing} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/30 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                    {isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><LogIn size={18}/> Masuk Sistem</>}
                 </button>
              </form>
              <div className="px-10 pb-10 text-center text-[9px] font-black uppercase text-slate-300 tracking-widest">Akses Cloud Terenkripsi • v2.0.1</div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
      {/* SIDEBAR */}
      <aside className={`bg-[#0F172A] text-slate-300 transition-all duration-300 flex flex-col z-40 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-16 flex items-center px-6 bg-slate-900/50 border-b border-white/5 shrink-0">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shrink-0">M</div>
          {sidebarOpen && <div className="ml-3 font-black text-white italic tracking-tighter leading-tight uppercase">MESEIKPA<br/><span className="text-[9px] tracking-[0.2em] text-blue-400 not-italic">Cloud System</span></div>}
        </div>
        <nav className="flex-1 py-6 space-y-1.5 px-3 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'indigo' },
            { id: 'rpd', label: 'Entri RPD', icon: Edit3, color: 'orange' },
            { id: 'realisasi', label: 'Realisasi', icon: Activity, color: 'blue' },
            { id: 'rapat', label: 'Rekapitulasi', icon: PieChart, color: 'emerald' },
          ].map(btn => (
            <button key={btn.id} onClick={() => setActiveTab(btn.id as any)} className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${activeTab === btn.id ? `bg-${btn.color}-600 text-white shadow-lg` : 'hover:bg-white/5'}`}>
              <btn.icon size={20} className={sidebarOpen ? 'mr-3' : ''} />
              {sidebarOpen && <span className="font-bold text-xs uppercase tracking-wider">{btn.label}</span>}
            </button>
          ))}
          {currentUser.role === 'admin' && (
            <div className="mt-4 pt-4 border-t border-white/5 space-y-1.5">
               <button onClick={() => setActiveTab('migrasi')} className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${activeTab === 'migrasi' ? 'bg-slate-700 text-white' : 'hover:bg-white/5'}`}>
                  <FileUp size={20} className={sidebarOpen ? 'mr-3' : ''} />
                  {sidebarOpen && <span className="font-bold text-xs uppercase tracking-wider">Migrasi DIPA</span>}
               </button>
               <button onClick={() => setActiveTab('users')} className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-rose-600 text-white shadow-lg' : 'hover:bg-white/5'}`}>
                  <Users size={20} className={sidebarOpen ? 'mr-3' : ''} />
                  {sidebarOpen && <span className="font-bold text-xs uppercase tracking-wider">User Manager</span>}
               </button>
            </div>
          )}
        </nav>
        <div className="p-4 border-t border-white/5">
           <button onClick={handleLogout} className="w-full flex items-center px-3 py-3 rounded-xl hover:bg-rose-600/20 text-rose-400 transition-all">
              <LogOut size={20} className={sidebarOpen ? 'mr-3' : ''} />
              {sidebarOpen && <span className="font-black text-xs uppercase tracking-widest">Logout</span>}
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden relative">
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"><Menu size={20} /></button>
            <div className="hidden sm:block">
               <h2 className="font-black text-slate-800 text-[11px] uppercase tracking-[0.2em] italic flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                 BPS Kabupaten Seram Bagian Barat
               </h2>
            </div>
          </div>
          
          <div className="flex-1 max-w-sm mx-8">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input type="text" placeholder="Cari Kode / Uraian..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-100 border-none rounded-2xl py-2 pl-12 pr-4 text-[11px] font-bold focus:ring-2 focus:ring-blue-500/20 transition-all outline-none" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {lastSaved && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full animate-in fade-in slide-in-from-right duration-300">
                <Save size={12} className="animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-tighter">{lastSaved}</span>
              </div>
            )}
            <div className="flex flex-col items-end leading-none">
              <span className="text-[11px] font-black italic text-slate-800">{currentUser.name}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{currentUser.team}</span>
            </div>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg bg-blue-600"><User size={20} /></div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-8 custom-scrollbar bg-[#F1F5F9]">
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-700">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Pagu DIPA Induk', val: globalStats.pagu, icon: Wallet, color: 'indigo' },
                    { label: 'Target RPD', val: globalStats.rpd, icon: Target, color: 'orange' },
                    { label: 'Realisasi', val: globalStats.real, icon: Activity, color: 'blue' },
                    { label: 'Sisa Anggaran', val: globalStats.pagu - globalStats.real, icon: ShieldCheck, color: 'emerald' },
                  ].map((card, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                       <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full bg-${card.color}-500/5 group-hover:scale-150 transition-transform duration-700`}></div>
                       <div className={`p-3 bg-${card.color}-100 text-${card.color}-600 rounded-2xl w-fit mb-4`}><card.icon size={24} /></div>
                       <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{card.label}</h4>
                       <div className="text-xl font-black text-slate-800 tracking-tighter italic">Rp {formatMoney(card.val)}</div>
                    </div>
                  ))}
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-7 bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm">
                     <div className="flex items-center justify-between mb-10">
                        <h3 className="text-sm font-black text-slate-800 uppercase italic tracking-[0.1em] leading-none">Grafik Progres Triwulanan</h3>
                        <div className="flex gap-4 text-[9px] font-black uppercase tracking-widest">
                           <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-300"></span> RPD</div>
                           <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> REAL</div>
                        </div>
                     </div>
                     <div className="h-[280px] flex items-end justify-around gap-8 px-4">
                        {globalStats.tw.map((tw, i) => (
                           <div key={i} className="flex-1 flex flex-col items-center">
                              <div className="flex gap-2 items-end h-full w-full">
                                 <div className="flex-1 bg-orange-100 rounded-t-xl transition-all hover:bg-orange-200" style={{ height: `${(tw.rpd / (globalStats.pagu / 2.5 || 1)) * 100}%` }}></div>
                                 <div className="flex-1 bg-blue-600 rounded-t-xl shadow-lg shadow-blue-500/10 transition-all hover:bg-blue-700" style={{ height: `${(tw.real / (globalStats.pagu / 2.5 || 1)) * 100}%` }}></div>
                              </div>
                              <div className="mt-4 text-[10px] font-black text-slate-500 tracking-widest uppercase">TW {i + 1}</div>
                           </div>
                        ))}
                     </div>
                  </div>
                  <div className="lg:col-span-5 bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm flex flex-col">
                     <h3 className="text-sm font-black text-slate-800 uppercase italic mb-8">Top Realisasi RO</h3>
                     <div className="space-y-4 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                        {roDataList.sort((a,b) => b.real - a.real).slice(0, 8).map((ro, i) => (
                           <div key={i} className="group">
                              <div className="flex justify-between text-[10px] font-bold mb-1.5">
                                 <span className="truncate w-48 text-slate-600 group-hover:text-blue-600 transition-colors uppercase">{ro.kode} - {ro.uraian}</span>
                                 <span className="text-slate-800">Rp {formatMoney(ro.real)}</span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                                 <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(ro.real / (ro.pagu || 1)) * 100}%` }}></div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'rapat' && (
            <div className="space-y-8 animate-in fade-in duration-700 pb-20">
               {/* CONFIG KPPN - Hanya Admin */}
               {currentUser?.role === 'admin' && (
                 <div className="bg-slate-900 rounded-[3rem] p-8 shadow-2xl border border-white/10 text-white">
                    <div className="flex items-center gap-4 mb-8">
                       <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center"><Settings2 size={24} /></div>
                       <div>
                          <h3 className="text-lg font-black uppercase italic leading-tight text-white">Target KPPN Monitor</h3>
                          <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase">Sinkronisasi data resmi dari SAKTI/KPPN</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                       <div className="space-y-4">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-orange-400 mb-2 tracking-widest"><Target size={14} /> Target RPD KPPN</div>
                          <div className="grid grid-cols-4 gap-4">
                             {['TW1', 'TW2', 'TW3', 'TW4'].map(tw => (
                                <div key={tw} className="flex flex-col">
                                   <label className="text-[9px] font-black uppercase mb-1 opacity-50">{tw}</label>
                                   <input type="number" value={kppnMetrics.rpd?.[tw] || ""} onChange={(e) => handleUpdateKPPN('rpd', tw, e.target.value)} 
                                      className="no-spinner bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-black outline-none focus:bg-white/10 text-white" placeholder="0" />
                                </div>
                             ))}
                          </div>
                       </div>
                       <div className="space-y-4">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-400 mb-2 tracking-widest"><Activity size={14} /> Realisasi KPPN</div>
                          <div className="grid grid-cols-4 gap-4">
                             {['TW1', 'TW2', 'TW3', 'TW4'].map(tw => (
                                <div key={tw} className="flex flex-col">
                                   <label className="text-[9px] font-black uppercase mb-1 opacity-50">{tw}</label>
                                   <input type="number" value={kppnMetrics.real?.[tw] || ""} onChange={(e) => handleUpdateKPPN('real', tw, e.target.value)} 
                                      className="no-spinner bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-black outline-none focus:bg-white/10 text-white" placeholder="0" />
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>
               )}

               {/* TABEL REKAPITULASI */}
               <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-6">
                  <div className="w-full md:w-64">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Filter Kedalaman</label>
                    <div className="relative">
                       <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                       <select value={rapatDepth} onChange={(e) => setRapatDepth(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-[11px] font-black text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20">
                           <option value={1}>DIPA INDUK (LEVEL 1)</option>
                           <option value={2}>OUTPUT RO (LEVEL 2)</option>
                           <option value={5}>SUBKOMPONEN (LEVEL 5)</option>
                           <option value={7}>AKUN 6 DIGIT (LEVEL 7)</option>
                           <option value={8}>DETAIL RINCIAN (LEVEL 8)</option>
                       </select>
                    </div>
                  </div>
                  <div className="flex-1 text-[10px] font-bold text-slate-400 italic bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     Gunakan filter kedalaman untuk melihat ringkasan performa per Program, Output, hingga Akun detail. Data disinkronkan secara real-time antar tim.
                  </div>
               </div>

               <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar max-h-[70vh]">
                    <table className="w-full border-collapse text-[10px]">
                      <thead className="sticky top-0 z-30 bg-slate-900 text-white font-black uppercase text-center">
                        <tr>
                          <th className="px-3 py-4 text-left w-24 sticky left-0 bg-slate-900 z-40 border-r border-white/5">KODE</th>
                          <th className="px-4 py-4 text-left min-w-[300px] sticky left-24 bg-slate-900 z-40 border-r border-white/5">URAIAN KEGIATAN</th>
                          <th className="px-3 py-4 text-right w-28">PAGU DIPA</th>
                          {['I','II','III','IV'].map((tw, i) => (
                            <th key={i} className="px-2 py-4 text-right w-28 bg-white/5 border-r border-white/5">TW {tw}</th>
                          ))}
                          <th className="px-2 py-4 text-right bg-orange-600/20 w-28">TOTAL RPD</th>
                          <th className="px-2 py-4 text-right bg-blue-600/20 w-28">TOTAL REAL</th>
                          <th className="px-3 py-4 text-right bg-slate-800 w-28">SISA PAGU</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {finalDisplay.map((item: any) => {
                          const isNonFinancial = item.uraian?.toLowerCase().includes('kppn') || item.uraian?.toLowerCase().includes('lokasi');
                          const sisaPagu = (Number(item.pagu) || 0) - (item.totalReal || 0);
                          let rowStyle = "hover:bg-blue-50/50 transition-colors";
                          if (item.level === 1) rowStyle = "bg-amber-50 font-black";
                          if (item.level === 2) rowStyle = "bg-blue-50/50 font-black";
                          if (item.level === 7) rowStyle = "bg-slate-50 font-bold";
                          if (item.isOrphan) rowStyle = "bg-rose-50 italic";
                          
                          return (
                            <tr key={item.id} className={rowStyle}>
                              <td className={`px-3 py-2 border-r border-slate-100 text-slate-400 font-mono sticky left-0 z-10 ${item.level <= 2 ? 'bg-inherit' : 'bg-white'}`}>{item.kode}</td>
                              <td className={`px-4 py-2 border-r border-slate-100 text-slate-800 sticky left-24 z-10 ${item.level <= 2 ? 'bg-inherit' : 'bg-white'}`} style={{ paddingLeft: `${(item.level * 12)}px` }}>
                                <div className="flex items-center gap-2">
                                  {item.level <= 2 && <ChevronRight size={10} className="text-blue-500" />}
                                  <span className="truncate max-w-[400px]">{item.uraian}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right font-black border-r border-slate-100">{!isNonFinancial ? formatMoney(item.pagu) : ""}</td>
                              {[1,2,3,4].map(tw => (
                                <td key={tw} className="px-2 py-2 text-right border-r border-slate-100">
                                  {!isNonFinancial && (
                                    <div className="flex flex-col gap-0.5 text-[9px] font-black">
                                      <span className="text-orange-500">R: {formatMoney(twMonths[tw].reduce((a,m)=>a+(Number(item.monthRPD?.[m])||0),0))}</span>
                                      <span className="text-blue-600">A: {formatMoney(twMonths[tw].reduce((a,m)=>a+(Number(item.monthReal?.[m])||0),0))}</span>
                                    </div>
                                  )}
                                </td>
                              ))}
                              <td className="px-2 py-2 text-right font-black text-orange-700 bg-orange-50/30 border-r border-slate-100">{!isNonFinancial ? formatMoney(item.totalRPD) : ""}</td>
                              <td className="px-2 py-2 text-right font-black text-blue-800 bg-blue-50/30 border-r border-slate-100">{!isNonFinancial ? formatMoney(item.totalReal) : ""}</td>
                              <td className={`px-3 py-2 text-right font-black ${sisaPagu < 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-800'}`}>{!isNonFinancial ? formatMoney(sisaPagu) : ""}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

          {/* TAB ENTRi RPD / REALISASI */}
          {(activeTab === 'rpd' || activeTab === 'realisasi') && (
            <div className="space-y-6 animate-in fade-in duration-700 pb-20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                 <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ${activeTab === 'rpd' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                       {activeTab === 'rpd' ? <Edit3 size={24}/> : <Activity size={24}/>}
                    </div>
                    <div>
                       <h3 className="text-lg font-black uppercase italic leading-none text-slate-800">Manajemen {activeTab}</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                          {isLocked ? 'Mode Terkunci (Read Only)' : `Penyusunan Anggaran Tim ${currentUser.team}`}
                       </p>
                    </div>
                 </div>

                 {currentUser?.role === 'admin' && (
                    <div className="flex gap-2">
                       <button onClick={handleToggleLock} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all shadow-sm ${isLocked ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
                          {isLocked ? <Lock size={14} /> : <Unlock size={14} />} {isLocked ? 'Buka Kunci' : 'Kunci Sistem'}
                       </button>
                       <button onClick={() => setShowClearDataModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                          <Eraser size={14} /> Reset
                       </button>
                    </div>
                 )}
              </div>

              {/* FILTERS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Wilayah Kerja</span>
                    <div className="flex gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100">
                      <button disabled={currentUser.role !== 'admin'} onClick={() => setActiveWilayah("GG")} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${activeWilayah === "GG" ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 opacity-50'}`}>GALALA</button>
                      <button disabled={currentUser.role !== 'admin'} onClick={() => setActiveWilayah("WA")} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${activeWilayah === "WA" ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 opacity-50'}`}>WAIHAONG</button>
                    </div>
                 </div>
                 <div className="md:col-span-2 bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tim Pelaksana</span>
                    <div className="flex flex-wrap gap-1">
                      {ALL_TEAMS.filter(t => activeWilayah === "GG" ? t !== "Umum" : t === "Umum").map(tim => (
                        <button key={tim} disabled={currentUser.role !== 'admin'} onClick={() => setActiveTim(tim)} className={`px-4 py-2 text-[10px] font-black rounded-xl transition-all ${activeTim === tim ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'}`}>
                          {tim}
                        </button>
                      ))}
                    </div>
                 </div>
                 <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Triwulan Berjalan</span>
                    <div className="flex gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100">
                      {[1,2,3,4].map(tw => (
                         <button key={tw} onClick={() => setTwActive(tw)} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${twActive === tw ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>TW {tw}</button>
                      ))}
                    </div>
                 </div>
              </div>

              {/* MAIN ENTRY TABLE */}
              <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar max-h-[72vh]">
                  <table className="w-full border-collapse text-[10px]">
                    <thead className="sticky top-0 z-30 bg-slate-900 text-white font-black uppercase text-center">
                      <tr>
                        <th className="px-3 py-4 text-left w-24 sticky left-0 bg-slate-900 z-40 border-r border-white/5">KODE</th>
                        <th className="px-4 py-4 text-left min-w-[300px] sticky left-24 bg-slate-900 z-40 border-r border-white/5">URAIAN KEGIATAN</th>
                        <th className="px-3 py-4 text-right w-28 bg-slate-900/90">PAGU DIPA</th>
                        {twMonths[twActive].map(m => (
                          <th key={m} className={`px-2 py-4 text-right w-28 border-r border-white/5 ${activeTab === 'rpd' ? 'bg-orange-600/20' : 'bg-blue-600/20'}`}>{m}</th>
                        ))}
                        <th className="px-3 py-4 text-right bg-slate-800 w-28 uppercase">TOTAL {activeTab}</th>
                        <th className="px-3 py-4 text-right bg-slate-900 w-28">SISA PAGU</th>
                        <th className="px-2 py-4 text-center w-12 bg-slate-900">...</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {finalDisplay.map((item: any) => {
                        const isInduk = item.uraian?.toLowerCase().includes('kppn') || item.uraian?.toLowerCase().includes('lokasi');
                        const sisaPagu = activeTab === 'rpd' ? (Number(item.pagu) || 0) - (item.totalRPD || 0) : (Number(item.pagu) || 0) - (item.totalReal || 0);
                        const canEdit = (activeTab === 'rpd' && (currentUser.role === 'admin' || (currentUser.role === 'ketua_tim' && !isLocked))) || (activeTab === 'realisasi' && currentUser.role === 'admin');
                        
                        return (
                          <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                            <td className={`px-3 py-2.5 border-r border-slate-100 text-slate-400 font-mono sticky left-0 z-10 bg-white group-hover:bg-slate-50`}>{item.kode}</td>
                            <td className={`px-4 py-2.5 border-r border-slate-100 font-bold text-slate-800 sticky left-24 z-10 bg-white group-hover:bg-slate-50`} style={{ paddingLeft: `${(item.level * 12)}px` }}>
                               <span className="truncate block max-w-[350px]">{item.uraian}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-black text-slate-950 border-r border-slate-100 bg-slate-50/30">
                               {!isInduk ? formatMoney(item.pagu) : ""}
                            </td>
                            {twMonths[twActive].map((m: string) => (
                                <td key={m} className="px-0 py-0 border-r border-slate-100 focus-within:bg-blue-50 transition-all">
                                  {!isInduk && item.isDetail ? (
                                    <input 
                                      type="number" 
                                      value={activeTab === 'rpd' ? (item.rpd?.[m] || "") : (item.realisasi?.[m] || "")} 
                                      readOnly={!canEdit}
                                      onChange={(e) => handleUpdateValue(item.id, m, e.target.value, item)} 
                                      className={`no-spinner w-full h-full text-right px-3 py-2.5 outline-none font-bold text-[10px] transition-all bg-transparent focus:bg-white focus:shadow-inner ${!canEdit ? 'text-slate-400 cursor-not-allowed opacity-50' : 'text-slate-900'}`} 
                                      placeholder="0" 
                                    />
                                  ) : !isInduk ? (
                                    <div className="text-right px-3 py-2.5 text-slate-950 font-black italic bg-slate-100/30">
                                      {formatMoney(activeTab === 'rpd' ? item.monthRPD?.[m] : item.monthReal?.[m])}
                                    </div>
                                  ) : null}
                                </td>
                              ))}
                            <td className={`px-3 py-2.5 text-right font-black border-r border-slate-100 ${activeTab === 'rpd' ? 'text-orange-700 bg-orange-50/20' : 'text-blue-800 bg-blue-50/20'}`}>
                               {!isInduk ? formatMoney(activeTab === 'rpd' ? item.totalRPD : item.totalReal) : ""}
                            </td>
                            <td className={`px-3 py-2.5 text-right font-black border-r border-slate-100 ${sisaPagu < 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-900'}`}>
                               {!isInduk ? formatMoney(sisaPagu) : ""}
                            </td>
                            <td className="px-2 py-2 text-center">
                               {item.isOrphan && currentUser.role === 'admin' && (
                                 <button onClick={async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', DATA_COLLECTION, item.id))} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg"><Trash2 size={12}/></button>
                               )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB MIGRASI / USERS (Tetap sama seperti logika sebelumnya namun dengan UI yang disesuaikan sedikit) */}
          {activeTab === 'users' && currentUser?.role === 'admin' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
               <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-xl">
                  <h3 className="text-xl font-black uppercase italic mb-8 flex items-center gap-3"><UserPlus className="text-blue-500" /> Registrasi Akun Pegawai</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {[
                        { label: 'Username', val: newUsername, set: setNewUsername, type: 'text', ph: 'contoh: admin_bps' },
                        { label: 'Password', val: newPassword, set: setNewPassword, type: 'text', ph: '••••••••' },
                        { label: 'Nama Lengkap', val: newFullName, set: setNewFullName, type: 'text', ph: 'Nama sesuai SK...' },
                     ].map((inp, idx) => (
                        <div key={idx} className="flex flex-col gap-1.5">
                           <label className="text-[9px] font-black uppercase text-slate-500 ml-4">{inp.label}</label>
                           <input type={inp.type} value={inp.val} onChange={(e) => inp.set(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-[11px] font-bold outline-none focus:bg-white/10 transition-all" placeholder={inp.ph} />
                        </div>
                     ))}
                     <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-500 ml-4">Peran</label>
                        <select value={newUserRole} onChange={(e:any) => setNewUserRole(e.target.value)} className="w-full bg-white/10 border border-white/10 rounded-xl py-3 px-4 text-white text-[11px] font-bold outline-none">
                           <option value="ketua_tim" className="text-black">Ketua Tim</option>
                           <option value="pimpinan" className="text-black">Pimpinan</option>
                           <option value="admin" className="text-black">Administrator</option>
                        </select>
                     </div>
                     <div className="lg:col-span-2 flex flex-col gap-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-500 ml-4">Grup Tim</label>
                        <div className="flex flex-wrap gap-2">
                           {ALL_TEAMS.map(t => (
                              <button key={t} onClick={() => setNewUserTeam(t)} className={`px-4 py-2 rounded-xl text-[9px] font-black border transition-all ${newUserTeam === t ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
                                 {t}
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>
                  <button onClick={handleAddUser} className="mt-8 px-8 py-3.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Daftarkan Akun</button>
               </div>
               
               <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-[10px]">
                     <thead className="bg-slate-50 border-b border-slate-100 uppercase font-black text-slate-400">
                        <tr>
                           <th className="px-8 py-4">Nama Pegawai</th>
                           <th className="px-4 py-4">Username</th>
                           <th className="px-4 py-4">Keamanan</th>
                           <th className="px-4 py-4 text-center">Aksi</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {allUsers.map((u) => (
                           <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-8 py-4 font-bold text-slate-800">
                                 <div>{u.name}</div>
                                 <div className="text-[9px] text-blue-500 uppercase tracking-widest">{u.role} • {u.team}</div>
                              </td>
                              <td className="px-4 py-4 font-mono text-slate-400 italic">@{u.username}</td>
                              <td className="px-4 py-4">
                                 <div className="flex items-center gap-2">
                                    <input type={showPasswordMap[u.id] ? "text" : "password"} defaultValue={u.password} onBlur={async (e) => {
                                       await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', USER_COLLECTION, u.id), { password: e.target.value });
                                    }} className="bg-slate-100 border-none rounded-lg px-2 py-1.5 w-32 font-mono text-[11px]" />
                                    <button onClick={() => setShowPasswordMap(prev => ({ ...prev, [u.id]: !prev[u.id] }))} className="text-slate-300 hover:text-blue-500 transition-colors">
                                       {showPasswordMap[u.id] ? <EyeOff size={14}/> : <Eye size={14}/>}
                                    </button>
                                 </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                 <button onClick={async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', USER_COLLECTION, u.id))} className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === 'migrasi' && (
            <div className="max-w-3xl mx-auto py-10 animate-in slide-in-from-bottom duration-700">
               <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-900 p-10 text-white relative">
                    <div className="absolute top-0 right-0 p-10 opacity-10"><FileUp size={80} /></div>
                    <h3 className="text-xl font-black uppercase tracking-widest italic text-white">Cloud Migrasi SAKTI</h3>
                    <p className="text-slate-400 mt-2 text-xs font-bold leading-relaxed">Pastikan file Excel berasal dari ekspor SAKTI dengan kolom Kode, Uraian, Satuan, dan Pagu yang sesuai.</p>
                  </div>
                  <div className="p-10 space-y-8">
                    <div className="group border-2 border-dashed border-slate-200 rounded-[2.5rem] p-16 text-center hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileAnalyze} disabled={isProcessing} className="hidden" />
                      <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform"><FileUp size={32} className="text-blue-500" /></div>
                      <span className="text-xs font-black uppercase text-slate-400 italic">Klik untuk Unggah File SAKTI (.xlsx)</span>
                    </div>
                    {previewData.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in zoom-in duration-300">
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-center"><span className="text-[9px] uppercase font-black text-slate-400 block mb-1">Total Struktur</span><span className="text-xl font-black">{previewData.length}</span></div>
                        <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 text-center"><span className="text-[9px] uppercase font-black text-emerald-400 block mb-1">Match Existing</span><span className="text-xl font-black text-emerald-700">{migrationStats.match}</span></div>
                        <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100 text-center"><span className="text-[9px] uppercase font-black text-rose-400 block mb-1">Orphaned</span><span className="text-xl font-black text-rose-700">{migrationStats.orphaned}</span></div>
                        <button onClick={executeMigration} disabled={isProcessing} className="sm:col-span-3 py-5 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                           {isProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><CheckCircle2 size={20}/> Jalankan Migrasi Data</>}
                        </button>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          )}
        </div>

        <footer className="h-10 bg-white border-t border-slate-200 px-8 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-2">
              <Clock size={12} className="text-slate-300" />
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest italic">V2.0.1 Stable Release</span>
           </div>
           <p className="text-[9px] font-black uppercase text-slate-300 tracking-[0.2em]">BPS SBB - Internal Tools Only</p>
        </footer>
      </main>

      {/* MODAL RESET */}
      {showClearDataModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-10 text-center border border-slate-200 animate-in zoom-in duration-300">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6"><AlertTriangle size={32} /></div>
              <h3 className="text-xl font-black text-slate-800 mb-2 italic tracking-tighter uppercase">Konfirmasi Reset</h3>
              <p className="text-[11px] text-slate-500 mb-8 leading-relaxed italic">Hapus semua data {activeTab}? Tindakan ini permanen dan akan berpengaruh pada seluruh tim.</p>
              <div className="flex flex-col gap-3">
                 <button onClick={async () => { 
                   if (!fbUser || currentUser?.role !== 'admin') return;
                   setIsProcessing(true); 
                   const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', DATA_COLLECTION));
                   let batch = writeBatch(db); 
                   const fieldToClear = activeTab === 'rpd' ? 'rpd' : 'realisasi';
                   snap.docs.forEach(d => batch.update(d.ref, { [fieldToClear]: {} }));
                   await batch.commit(); setIsProcessing(false); setShowClearDataModal(false); 
                 }} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-rose-700 transition-all">Ya, Kosongkan Data</button>
                 <button onClick={() => setShowClearDataModal(false)} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase hover:bg-slate-200 transition-all">Batal</button>
              </div>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .no-spinner::-webkit-outer-spin-button, .no-spinner::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .no-spinner { -moz-appearance: textfield; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
      `}} />
    </div>
  );
}
