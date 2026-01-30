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
  Target,
  Users,
  UserPlus,
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
  CalendarDays
} from 'lucide-react';

// --- DEKLARASI GLOBAL UNTUK TYPESCRIPT ---
declare global {
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

const formatInputMasking = (val: any) => {
  if (val === undefined || val === null || val === "") return "";
  const clean = String(val).replace(/\D/g, "");
  return clean ? Number(clean).toLocaleString('id-ID') : "";
};

const getDevColorClass = (val: number) => {
  const abs = Math.abs(val);
  if (abs >= 20) return 'text-rose-600 bg-rose-50 border-rose-200 font-black';
  if (abs >= 5) return 'text-amber-600 bg-amber-50 border-amber-200 font-black';
  return 'text-emerald-600 bg-emerald-50 border-emerald-200 font-black';
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
    real51: { TW1: 0, TW2: 0, TW3: 0, TW4: 0 },
    real52: { TW1: 0, TW2: 0, TW3: 0, TW4: 0 },
    real53: { TW1: 0, TW2: 0, TW3: 0, TW4: 0 },
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
  const [libReady, setLibReady] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]); 
  const [migrationStats, setMigrationStats] = useState({ match: 0, new: 0, orphaned: 0 });
  const [isLocked, setIsLocked] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [expandedMonthlyRPD, setExpandedMonthlyRPD] = useState<Record<string, boolean>>({});
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [chartMode, setChartMode] = useState<'TW' | 'Bulan'>('TW');

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

  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      setActiveTim(currentUser.team);
      if (currentUser.team === "Umum") setActiveWilayah("WA");
      else setActiveWilayah("GG");
    }
  }, [currentUser]);

  useEffect(() => {
    if ((window as any).XLSX) { setLibReady(true); return; }
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => { setLibReady(true); };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth error", err); }
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
        } catch (e) { console.error("Admin setup fail", e); }
      }
      const savedUser = localStorage.getItem(`meseikpa_session_${appId}`);
      if (savedUser) setCurrentUser(JSON.parse(savedUser));
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!fbUser || !currentUser) return;
    const unsubUsers = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', USER_COLLECTION)), (snap) => setAllUsers(snap.docs.map(d => ({ ...d.data(), id: d.id }))));
    const unsubKppn = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', METRICS_COLLECTION, 'kppn_global'), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setKppnMetrics(d);
          setIsLocked(!!d.isLocked);
        }
    });
    const unsubData = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', DATA_COLLECTION)), (snap) => {
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
    if (!fbUser) { setLoginError("Koneksi belum siap."); setIsProcessing(false); return; }
    try {
      const qUser = query(collection(db, 'artifacts', appId, 'public', 'data', USER_COLLECTION), where("username", "==", loginUsername.trim().toLowerCase()), limit(1));
      const snap = await getDocs(qUser);
      if (snap.empty) setLoginError("Username tidak terdaftar.");
      else {
        const userData = snap.docs[0].data();
        if (userData.password === loginPassword) {
          setCurrentUser(userData);
          localStorage.setItem(`meseikpa_session_${appId}`, JSON.stringify(userData));
        } else setLoginError("Password salah.");
      }
    } catch (err) { setLoginError("Sistem login bermasalah."); }
    finally { setIsProcessing(false); }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(`meseikpa_session_${appId}`);
    setLoginUsername(""); setLoginPassword(""); setLoginError(""); setActiveTab('dashboard');
  };

  const globalStats = useMemo(() => {
    const stats = { 
        pagu: 0, rpd: 0, real: 0, 
        pagu51: 0, pagu52: 0, pagu53: 0,
        tw: Array(4).fill(0).map(() => ({ rpd: 0, real: 0, rpd51:0, real51:0, rpd52:0, real52:0, rpd53:0, real53:0 })),
        months: {} as Record<string, { rpd: number, real: number, rpd51:number, real51:number, rpd52:number, real52:number, rpd53:number, real53:number }>,
        belanja: { pegawai: 0, barang: 0, modal: 0 } 
    };
    allMonths.forEach(m => stats.months[m] = { rpd: 0, real: 0, rpd51: 0, real51: 0, rpd52: 0, real52: 0, rpd53: 0, real53: 0 });
    const details = dataTampil.filter(d => !d.isOrphan && getLevel(d.kode) === 8 && (Number(d.pagu) || 0) > 0);
    details.forEach(d => {
      const itemReal = sumMapValues(d.realisasi);
      const itemPagu = (Number(d.pagu) || 0);
      stats.pagu += itemPagu;
      stats.real += itemReal;
      const keys = (d.tempPathKey || "").split("|");
      const accountCode = keys[6] || ""; 
      const is51 = accountCode.startsWith("51");
      const is52 = accountCode.startsWith("52");
      const is53 = accountCode.startsWith("53");
      if (is51) { stats.belanja.pegawai += itemReal; stats.pagu51 += itemPagu; }
      else if (is52) { stats.belanja.barang += itemReal; stats.pagu52 += itemPagu; }
      else if (is53) { stats.belanja.modal += itemReal; stats.pagu53 += itemPagu; }
      allMonths.forEach((m, idx) => {
        const valRPD = (Number(d.rpd?.[m]) || 0);
        const valReal = (Number(d.realisasi?.[m]) || 0);
        stats.rpd += valRPD;
        stats.months[m].rpd += valRPD;
        stats.months[m].real += valReal;
        const twIdx = Math.floor(idx / 3);
        stats.tw[twIdx].rpd += valRPD;
        stats.tw[twIdx].real += valReal;
        if(is51) { stats.tw[twIdx].rpd51 += valRPD; stats.tw[twIdx].real51 += valReal; stats.months[m].rpd51 += valRPD; stats.months[m].real51 += valReal; }
        if(is52) { stats.tw[twIdx].rpd52 += valRPD; stats.tw[twIdx].real52 += valReal; stats.months[m].rpd52 += valRPD; stats.months[m].real52 += valReal; }
        if(is53) { stats.tw[twIdx].rpd53 += valRPD; stats.tw[twIdx].real53 += valReal; stats.months[m].rpd53 += valRPD; stats.months[m].real53 += valReal; }
      });
    });
    return stats;
  }, [dataTampil, allMonths]);

  const handleUpdateKPPN = (category: string, period: string, value: string) => {
    const cleanValue = value.replace(/\D/g, "");
    setKppnMetrics((prev: any) => ({ ...prev, [category]: { ...prev[category], [period]: cleanValue } }));
  };

  const saveKppnGlobal = async () => {
    if (!fbUser || currentUser?.role !== 'admin') return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', METRICS_COLLECTION, 'kppn_global');
      await setDoc(docRef, kppnMetrics, { merge: true });
    } catch (e) { console.error("KPPN save error"); }
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
        uid: userId, username: newUsername.trim().toLowerCase(), password: newPassword, name: newFullName, role: newUserRole, team: newUserTeam, createdAt: new Date()
      });
      setNewUsername(""); setNewPassword(""); setNewFullName("");
    } catch (e) { console.error("User add error"); }
    finally { setIsProcessing(false); }
  };

  const handleChangeUserPassword = async (id: string, newPass: string) => {
    if (!id || !newPass || !fbUser || currentUser?.role !== 'admin') return;
    try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', USER_COLLECTION, id), { password: newPass }); } catch (e) { console.error(e); }
  };

  const handleFileAnalyze = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !libReady) return;
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt: any) => {
        const XLSX = (window as any).XLSX;
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
    } catch (e) { setIsProcessing(false); }
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
    } catch (e) { console.error("Migration error"); } finally { setIsProcessing(false); }
  };

  const processedData = useMemo(() => {
    const normal = dataTampil.filter(d => !d.isOrphan);
    const orphan = dataTampil.filter(d => d.isOrphan);
    const base = (activeTab === 'rapat') ? normal : normal.filter(d => d.wilayah === activeWilayah);
    const calculatedNormal = base.map((item, index) => {
      const level = getLevel(item.kode);
      const isInduk = item.uraian?.toLowerCase().includes('kppn') || item.uraian?.toLowerCase().includes('lokasi');
      const isDetail = level === 8 && (Number(item.pagu) || 0) > 0 && !isInduk;
      let totalRPD = 0, totalReal = 0;
      let mRPD: Record<string, number> = {};
      let mReal: Record<string, number> = {};
      if (isDetail) { totalRPD = sumMapValues(item.rpd); totalReal = sumMapValues(item.realisasi); } 
      else if (!isInduk) {
        for (let i = index + 1; i < base.length; i++) {
            const next = base[i];
            const nLevel = getLevel(next.kode);
            if (next.kode !== "" && nLevel <= level) break;
            if (nLevel === 8 && (Number(next.pagu) || 0) > 0) {
                totalRPD += sumMapValues(next.rpd);
                totalReal += sumMapValues(next.realisasi);
                allMonths.forEach(m => {
                    mRPD[m] = (mRPD[m] || 0) + (Number(next.rpd?.[m]) || 0);
                    mReal[m] = (mReal[m] || 0) + (Number(next.realisasi?.[m]) || 0);
                });
            }
        }
      }
      return { ...item, totalRPD, totalReal, monthRPD: mRPD, monthReal: mReal, level, isDetail };
    });
    const calculatedOrphan = orphan.map(item => ({
        ...item, totalRPD: sumMapValues(item.rpd), totalReal: sumMapValues(item.realisasi),
        monthRPD: item.rpd || {}, monthReal: item.realisasi || {}, level: 8, isDetail: true
    }));
    const merged = [...calculatedNormal, ...calculatedOrphan];
    if (activeTab === 'rapat') return merged.filter(item => item.level <= rapatDepth);
    const allowed = TIM_MAPPING[activeTim] || [];
    let insideAllowed = false;
    return merged.filter((item) => {
      if (item.isOrphan) return true; 
      if (getLevel(item.kode) === 2) insideAllowed = allowed.includes(item.kode);
      return insideAllowed || getLevel(item.kode) === 1; 
    });
  }, [dataTampil, activeWilayah, activeTim, activeTab, rapatDepth, allMonths]);

  const finalDisplay = processedData.filter((d) => (d.uraian && d.uraian.toLowerCase().includes(searchTerm.toLowerCase())) || (d.kode && d.kode.includes(searchTerm)));

  if (isAuthLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <span className="font-black uppercase tracking-widest text-sm italic">Connecting to Cloud...</span>
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
                 {loginError && (
                   <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 animate-in slide-in-from-top duration-300">
                      <AlertTriangle size={18} />
                      <span className="text-xs font-bold italic">{loginError}</span>
                   </div>
                 )}
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Username</label>
                    <div className="relative">
                       <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="Username" required />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Password</label>
                    <div className="relative">
                       <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="••••••••" required />
                    </div>
                 </div>
                 <button type="submit" disabled={isProcessing} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/30 hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                    {isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><LogIn size={18}/> Masuk Sistem</>}
                 </button>
              </form>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
      <aside className={`bg-[#0F172A] text-slate-300 transition-all duration-300 flex flex-col z-40 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-16 flex items-center px-6 bg-slate-900/50 border-b border-white/5">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shrink-0 shadow-lg">M</div>
          {sidebarOpen && <div className="ml-3 font-black text-white italic tracking-tighter leading-tight">MESEIKPA<br/><span className="text-[9px] uppercase tracking-[0.2em] font-bold not-italic text-blue-400">Version 2.0</span></div>}
        </div>
        <nav className="flex-1 py-6 space-y-2 px-3 overflow-y-auto custom-scrollbar">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-white/5'}`}>
            <LayoutDashboard size={20} className={sidebarOpen ? 'mr-3' : ''} />
            {sidebarOpen && <span className="font-semibold text-xs uppercase tracking-wider">Dashboard</span>}
          </button>
          <div className="py-2"><div className="h-px bg-white/10 w-full opacity-30"></div></div>
          <button onClick={() => setActiveTab('rpd')} className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${activeTab === 'rpd' ? 'bg-orange-600 text-white shadow-lg' : 'hover:bg-white/5'}`}>
            <Edit3 size={20} className={sidebarOpen ? 'mr-3' : ''} />
            {sidebarOpen && <span className="font-semibold text-xs uppercase tracking-wider">Entri RPD</span>}
          </button>
          <button onClick={() => setActiveTab('realisasi')} className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${activeTab === 'realisasi' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5'}`}>
            <Activity size={20} className={sidebarOpen ? 'mr-3' : ''} />
            {sidebarOpen && <span className="font-semibold text-xs uppercase tracking-wider">Entri Realisasi</span>}
          </button>
          <div className="py-2"><div className="h-px bg-white/10 w-full opacity-30"></div></div>
          <button onClick={() => setActiveTab('rapat')} className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${activeTab === 'rapat' ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-white/5'}`}>
            <PieChart size={20} className={sidebarOpen ? 'mr-3' : ''} />
            {sidebarOpen && <span className="font-black text-xs uppercase tracking-widest">Rekapitulasi</span>}
          </button>
          {currentUser.role === 'admin' && (
            <>
              <button onClick={() => setActiveTab('migrasi')} className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${activeTab === 'migrasi' ? 'bg-slate-700 text-white' : 'hover:bg-white/5'}`}>
                <FileUp size={20} className={sidebarOpen ? 'mr-3' : ''} />
                {sidebarOpen && <span className="font-semibold text-xs uppercase tracking-wider">Migrasi DIPA</span>}
              </button>
              <button onClick={() => setActiveTab('users')} className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-rose-600 text-white shadow-lg' : 'hover:bg-white/5'}`}>
                  <Users size={20} className={sidebarOpen ? 'mr-3' : ''} />
                  {sidebarOpen && <span className="font-semibold text-xs uppercase tracking-wider">User Control</span>}
              </button>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-white/5">
           <button onClick={handleLogout} className="w-full flex items-center px-3 py-3 rounded-xl hover:bg-rose-600/20 text-rose-400 transition-all">
              <LogOut size={20} className={sidebarOpen ? 'mr-3' : ''} />
              {sidebarOpen && <span className="font-black text-xs uppercase tracking-widest">Logout</span>}
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><Menu size={20} /></button>
            <h2 className="font-black text-slate-800 text-[13px] uppercase tracking-widest italic flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span> BPS SBB
            </h2>
          </div>
          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Cari data..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-100 border-none rounded-2xl py-2.5 pl-12 pr-4 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end leading-none">
                <span className="text-[11px] font-black italic text-slate-800">{currentUser.name}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{currentUser.role}</span>
             </div>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg bg-blue-600`}><User size={20} /></div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-700">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Pagu DIPA Induk', val: globalStats.pagu, icon: Wallet, color: 'indigo' },
                    { label: 'Target RPD', val: globalStats.rpd, icon: Target, color: 'orange' },
                    { label: 'Realisasi', val: globalStats.real, icon: Activity, color: 'blue' },
                    { label: 'Sisa Anggaran', val: globalStats.pagu - globalStats.real, icon: ShieldCheck, color: 'emerald' },
                  ].map((card, i) => {
                    const CardIcon = card.icon;
                    return (
                      <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative group hover:shadow-xl transition-all">
                         <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 bg-${card.color}-100 text-${card.color}-600 rounded-2xl`}><CardIcon size={24} /></div>
                         </div>
                         <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{card.label}</h4>
                         <div className="text-xl font-black text-slate-800 tracking-tighter italic">Rp {formatMoney(card.val)}</div>
                      </div>
                    );
                  })}
               </div>

               <div className="grid grid-cols-1 gap-8">
                  <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-10">
                        <div className="flex flex-col gap-1">
                          <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tighter leading-none">Grafik Performa Akun Belanja</h3>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Rencana (Target RPD) vs Eksekusi (Realisasi)</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                           <button onClick={() => setChartMode('TW')} className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${chartMode === 'TW' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>TW</button>
                           <button onClick={() => setChartMode('Bulan')} className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${chartMode === 'Bulan' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Bulan</button>
                        </div>
                      </div>
                      <div className="h-[300px] flex items-end justify-between gap-2 px-2 overflow-x-auto custom-scrollbar">
                        {(chartMode === 'TW' ? [1,2,3,4] : allMonths).map((key, i) => {
                           const sReal = chartMode === 'TW' ? globalStats.tw[i].real : globalStats.months[key as string].real;
                           const sRPD = chartMode === 'TW' ? globalStats.tw[i].rpd : globalStats.months[key as string].rpd;
                           const maxVal = (globalStats.pagu / (chartMode === 'TW' ? 2 : 6)) || 1;
                           return (
                             <div key={key} className="flex-1 flex flex-col items-center min-w-[50px] group relative">
                                <div className="flex gap-1.5 items-end h-full w-full justify-center">
                                   <div className="w-3 bg-orange-100 rounded-t-lg relative flex flex-col justify-end overflow-hidden" style={{ height: `${Math.min(100, (sRPD / maxVal) * 100)}%` }}>
                                      <div className="w-full bg-orange-400 opacity-80" style={{ height: `${((chartMode === 'TW' ? globalStats.tw[i].rpd51 : globalStats.months[key as string].rpd51) / (sRPD||1)) * 100}%` }}></div>
                                      <div className="w-full bg-orange-500 opacity-80" style={{ height: `${((chartMode === 'TW' ? globalStats.tw[i].rpd52 : globalStats.months[key as string].rpd52) / (sRPD||1)) * 100}%` }}></div>
                                      <div className="w-full bg-orange-600 opacity-80" style={{ height: `${((chartMode === 'TW' ? globalStats.tw[i].rpd53 : globalStats.months[key as string].rpd53) / (sRPD||1)) * 100}%` }}></div>
                                   </div>
                                   <div className="w-3 bg-blue-100 rounded-t-lg relative flex flex-col justify-end overflow-hidden shadow-lg shadow-blue-500/10" style={{ height: `${Math.min(100, (sReal / maxVal) * 100)}%` }}>
                                      <div className="w-full bg-blue-400" style={{ height: `${((chartMode === 'TW' ? globalStats.tw[i].real51 : globalStats.months[key as string].real51) / (sReal||1)) * 100}%` }}></div>
                                      <div className="w-full bg-blue-600" style={{ height: `${((chartMode === 'TW' ? globalStats.tw[i].real52 : globalStats.months[key as string].real52) / (sReal||1)) * 100}%` }}></div>
                                      <div className="w-full bg-blue-800" style={{ height: `${((chartMode === 'TW' ? globalStats.tw[i].real53 : globalStats.months[key as string].real53) / (sReal||1)) * 100}%` }}></div>
                                   </div>
                                </div>
                                <div className="mt-4 text-[9px] font-black text-slate-800 tracking-tighter uppercase">{chartMode === 'TW' ? `TW ${key}` : key}</div>
                             </div>
                           );
                        })}
                      </div>
                      <div className="mt-10 flex justify-center gap-8 border-t border-slate-100 pt-6">
                         <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-orange-500 rounded-full"></div><span className="text-[9px] font-black uppercase text-slate-500">Target RPD Satker</span></div>
                         <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-blue-600 rounded-full shadow-sm"></div><span className="text-[9px] font-black uppercase text-slate-500">Realisasi Satker</span></div>
                      </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'rapat' && (
            <div className="space-y-8 animate-in fade-in duration-700 pb-20">
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* ANALISIS DAYA SERAP KPPN */}
                  <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden relative group">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-emerald-100 text-emerald-600 rounded-3xl"><Activity size={28}/></div>
                        <div className="text-right">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Daya Serap KPPN</span>
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center justify-end gap-1"><CheckCircle2 size={12}/> Monitoring TW</span>
                        </div>
                    </div>
                    <div className="p-6 bg-emerald-50/40 rounded-[2.5rem] border border-emerald-100 space-y-5">
                        <div className="flex justify-between items-center border-b border-emerald-200/50 pb-3">
                           <span className="text-xs font-black text-slate-800 uppercase tracking-widest bg-emerald-100 px-4 py-1.5 rounded-xl">TW {twActive}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                           {['51', '52', '53'].map(code => {
                              const sCat = `real${code}`;
                              const realSub = globalStats.tw[twActive - 1][`real${code}` as keyof typeof globalStats.tw[number]];
                              const paguSub = globalStats[`pagu${code}` as keyof typeof globalStats] as number;
                              const targetNominal = Number(kppnMetrics[sCat]?.[`TW${twActive}`]) || 0;
                              const pctReal = paguSub > 0 ? (realSub / paguSub) * 100 : 0;
                              const pctTarget = paguSub > 0 ? (targetNominal / paguSub) * 100 : 0;
                              return (
                                <div key={code} className="grid grid-cols-12 items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="col-span-3">
                                       <span className="text-[10px] font-black text-slate-500 uppercase block">Belanja {code}</span>
                                       <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${getDevColorClass(pctReal - pctTarget)}`}>{pctReal.toFixed(1)}% / {pctTarget.toFixed(1)}%</span>
                                    </div>
                                    <div className="col-span-4 text-center border-x border-slate-100">
                                       <span className="text-[8px] font-black text-slate-300 block mb-1 uppercase">Real Satker</span>
                                       <span className="text-[11px] font-black italic">Rp {formatMoney(realSub)}</span>
                                    </div>
                                    <div className="col-span-5">
                                       <span className="text-[8px] font-black text-slate-300 block mb-1 text-right uppercase">Input Target Nominal KPPN</span>
                                       <input type="text" value={formatInputMasking(kppnMetrics[sCat]?.[`TW${twActive}`])} readOnly={currentUser.role !== 'admin'} onChange={(e) => handleUpdateKPPN(sCat, `TW${twActive}`, e.target.value)} onBlur={saveKppnGlobal} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-1 text-[11px] font-black text-right outline-none focus:ring-2 focus:ring-emerald-200" placeholder="0" />
                                    </div>
                                </div>
                              );
                           })}
                        </div>
                    </div>
                  </div>

                  {/* DEVIASI HAL III DIPA */}
                  <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden relative group">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-orange-100 text-orange-600 rounded-3xl"><Target size={28}/></div>
                        <div className="text-right">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Deviasi Hal III DIPA</span>
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center justify-end gap-1"><CheckCircle2 size={12}/> Monitoring Bulan</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mb-6">
                       <h4 className="text-lg font-black italic text-slate-800 uppercase tracking-tighter">Monitoring Ketepatan RPD</h4>
                       <button onClick={() => setExpandedMonthlyRPD(prev => ({ ...prev, [twActive]: !prev[twActive] }))} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-all hover:bg-slate-200">
                          <CalendarDays size={16} /> <span className="text-[10px] font-black uppercase">{expandedMonthlyRPD[twActive] ? 'Tutup Detail' : 'Buka Detail'}</span>
                       </button>
                    </div>

                    <div className="space-y-4">
                       {twMonths[twActive].map(m => {
                          const mData = globalStats.months[m];
                          return (
                             <div key={m} className="p-5 bg-slate-50 rounded-[2rem] border border-slate-200 space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                   <span className="text-xs font-black text-slate-800 uppercase">{m}</span>
                                   <div className="flex gap-2">
                                      {['51', '52', '53'].map(code => {
                                         const t = mData[`rpd${code}` as keyof typeof mData];
                                         const r = mData[`real${code}` as keyof typeof mData];
                                         const dev = t > 0 ? ((r - t) / t) * 100 : 0;
                                         return <span key={code} className={`text-[9px] font-black px-2 py-0.5 rounded-lg border ${getDevColorClass(dev)}`}>{code}: {dev.toFixed(1)}%</span>
                                      })}
                                   </div>
                                </div>
                                {expandedMonthlyRPD[twActive] && (
                                   <div className="space-y-2 animate-in slide-in-from-top text-[10px] font-bold text-slate-500 italic">
                                      {['51', '52', '53'].map(code => (
                                         <div key={code} className="grid grid-cols-12 border-b border-slate-100/50 pb-1">
                                            <div className="col-span-3">Akun {code}</div>
                                            <div className="col-span-4">RPD: {formatMoney(mData[`rpd${code}` as keyof typeof mData])}</div>
                                            <div className="col-span-5 text-right">Real: {formatMoney(mData[`real${code}` as keyof typeof mData])}</div>
                                         </div>
                                      ))}
                                   </div>
                                )}
                             </div>
                          );
                       })}
                    </div>
                  </div>
               </div>

               <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-200 flex items-center gap-8">
                  <div className="p-5 bg-blue-100 text-blue-600 rounded-2xl"><Filter size={28}/></div>
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-[0.2em]">Kedalaman Struktur Rekap</label>
                    <select value={rapatDepth} onChange={(e) => setRapatDepth(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-6 text-[13px] font-black text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20">
                        <option value={1}>Level 1: DIPA Induk</option>
                        <option value={2}>Level 2: Rincian Output (RO)</option>
                        <option value={5}>Level 5: Komponen / Sub Komponen</option>
                        <option value={7}>Level 7: Kode Akun (6 Digit)</option>
                        <option value={8}>Level 8: Seluruh Detail</option>
                    </select>
                  </div>
               </div>

               <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar max-h-[72vh]">
                    <table className="w-full border-collapse text-[10px]">
                      <thead className="sticky top-0 z-20 bg-slate-950 text-white font-bold uppercase text-center shadow-lg">
                        <tr>
                          <th className="px-3 py-4 text-left w-20">Kode</th>
                          <th className="px-4 py-4 text-left min-w-[350px]">Uraian</th>
                          <th className="px-3 py-4 text-right w-28">Pagu DIPA</th>
                          {['I','II','III','IV'].map((tw, idx) => (<th key={idx} className="px-2 py-4 text-right w-32 bg-emerald-900/40 border-r border-white/5">TW {tw}</th>))}
                          <th className="px-2 py-4 text-right bg-orange-900 w-28">TOTAL RPD</th>
                          <th className="px-2 py-4 text-right bg-rose-900 w-20 italic">% DEV</th>
                          <th className="px-2 py-4 text-right bg-blue-900 w-28">TOTAL REAL</th>
                          <th className="px-3 py-4 text-right bg-slate-900 w-28">SISA PAGU</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {finalDisplay.map((item: any) => {
                          const isNonFinancial = item.uraian?.toLowerCase().includes('kppn') || item.uraian?.toLowerCase().includes('lokasi');
                          const sisaPagu = (Number(item.pagu) || 0) - (item.totalReal || 0);
                          const devPctFinal = item.totalRPD > 0 ? ((item.totalReal - item.totalRPD) / item.totalRPD) * 100 : 0;
                          let rowBg = "hover:bg-blue-50/30 transition-all";
                          if (item.level === 1) rowBg = "bg-amber-100/60 font-black";
                          if (item.level === 2) rowBg = "bg-blue-100/40 font-black";
                          if (item.level === 7) rowBg = "bg-slate-100 font-black";
                          return (
                            <tr key={item.id} className={rowBg}>
                              <td className="px-3 py-1.5 border-r border-slate-100 text-slate-400 font-mono italic">{item.kode}</td>
                              <td className="px-4 py-1.5 border-r border-slate-100 font-bold text-slate-800" style={{ paddingLeft: `${(item.level * 10)}px` }}>{item.uraian}</td>
                              <td className="px-3 py-1.5 text-right font-black border-r border-slate-100">{!isNonFinancial ? formatMoney(item.pagu) : ""}</td>
                              {[1,2,3,4].map(tw => (
                                <td key={tw} className="px-2 py-2 text-right border-r border-slate-100">
                                  {!isNonFinancial && (
                                    <div className="flex flex-col text-[10px] font-black">
                                      <span className="text-orange-600">{formatMoney(twMonths[tw].reduce((a,m)=>a+(Number(item.monthRPD?.[m])||0),0))}</span>
                                      <span className="text-blue-600">{formatMoney(twMonths[tw].reduce((a,m)=>a+(Number(item.monthReal?.[m])||0),0))}</span>
                                    </div>
                                  )}
                                </td>
                              ))}
                              <td className="px-2 py-1.5 text-right font-black text-orange-800 border-r border-slate-100 bg-orange-50/30">{!isNonFinancial ? formatMoney(item.totalRPD) : ""}</td>
                              <td className={`px-2 py-1.5 text-right font-black border-r border-slate-100 ${getDevColorClass(devPctFinal)}`}>{(!isNonFinancial && item.totalRPD > 0) ? `${devPctFinal.toFixed(1)}%` : "0%"}</td>
                              <td className="px-2 py-1.5 text-right font-black text-blue-800 bg-blue-50/30">{!isNonFinancial ? formatMoney(item.totalReal) : ""}</td>
                              <td className={`px-3 py-1.5 text-right font-black border-r border-slate-100 ${sisaPagu < 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-800'}`}>{!isNonFinancial ? formatMoney(sisaPagu) : ""}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'users' && currentUser?.role === 'admin' && (
            <div className="max-w-6xl mx-auto space-y-10 animate-in slide-in-from-bottom duration-500 pb-20">
               <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
                  <h3 className="text-2xl font-black uppercase italic mb-10 flex items-center gap-4 text-white"><UserPlus className="text-blue-500" /> Registrasi User</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-white">
                     <div className="flex flex-col gap-2">
                       <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Username</label>
                       <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all" placeholder="Username" />
                     </div>
                     <div className="flex flex-col gap-2">
                       <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Password</label>
                       <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all" placeholder="Password" />
                     </div>
                     <div className="flex flex-col gap-2">
                       <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Nama Lengkap</label>
                       <input type="text" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all" placeholder="Nama Lengkap" />
                     </div>
                     <div className="flex flex-col gap-2">
                       <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Role</label>
                       <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as any)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm outline-none appearance-none">
                          <option value="admin" className="text-black">Admin</option>
                          <option value="pimpinan" className="text-black">Pimpinan</option>
                          <option value="ketua_tim" className="text-black">Ketua Tim</option>
                       </select>
                     </div>
                     <div className="lg:col-span-2 flex flex-col gap-2">
                       <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Tim</label>
                       <div className="flex flex-wrap gap-2">
                          {ALL_TEAMS.map(tim => (
                             <button key={tim} onClick={() => setNewUserTeam(tim)} className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${newUserTeam === tim ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                                {tim}
                             </button>
                          ))}
                       </div>
                     </div>
                  </div>
                  <button onClick={handleAddUser} className="mt-12 px-14 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Simpan User</button>
               </div>
               <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                     <thead className="bg-slate-50 border-b border-slate-100 uppercase text-[9px] font-black text-slate-400">
                        <tr><th className="px-8 py-4">Nama</th><th className="px-4 py-4">Username</th><th className="px-4 py-4">Password</th><th className="px-4 py-4 text-center">Hapus</th></tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {allUsers.map((u) => (
                           <tr key={u.id}>
                              <td className="px-8 py-5 font-bold text-slate-800"><div>{u.name}</div><div className="text-[9px] text-blue-500 uppercase tracking-widest">{u.role} • {u.team}</div></td>
                              <td className="px-4 py-5 font-mono text-slate-500 italic">@{u.username}</td>
                              <td className="px-4 py-5">
                                 <div className="flex items-center gap-2">
                                    <input type={showPasswordMap[u.id] ? "text" : "password"} defaultValue={u.password} onBlur={(e) => handleChangeUserPassword(u.id, e.target.value)} className="bg-slate-100 border-none rounded-lg px-2 py-1 w-24 text-[11px]" />
                                    <button onClick={() => setShowPasswordMap(prev => ({ ...prev, [u.id]: !prev[u.id] }))} className="text-slate-400 hover:text-blue-500">{showPasswordMap[u.id] ? <EyeOff size={14}/> : <Eye size={14}/>}</button>
                                 </div>
                              </td>
                              <td className="px-4 py-5 text-center"><button onClick={async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', USER_COLLECTION, u.id))} className="p-2 text-rose-400 hover:bg-rose-100 rounded-lg"><Trash2 size={14}/></button></td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === 'migrasi' && currentUser?.role === 'admin' && (
            <div className="max-w-4xl mx-auto py-4 animate-in slide-in-from-bottom duration-700">
               <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-900 p-8 text-white relative"><h3 className="text-xl font-black uppercase tracking-widest italic text-white">Migrasi Database</h3></div>
                  <div className="p-10 space-y-8">
                    <div className="border-2 border-dashed border-slate-200 rounded-[2.5rem] p-16 text-center hover:border-blue-400 hover:bg-blue-50/20 cursor-pointer transition-all" onClick={() => fileInputRef.current?.click()}>
                      <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileAnalyze} disabled={isProcessing} className="hidden" />
                      <FileUp size={48} className="mx-auto mb-4 text-slate-300" />
                      <span className="text-xs font-black uppercase text-slate-400 italic">Upload File SAKTI (.xlsx)</span>
                    </div>
                    {previewData.length > 0 && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl"><span className="text-[9px] uppercase font-black">Row</span><span className="text-xl font-black block">{previewData.length}</span></div>
                        <div className="p-4 bg-emerald-50 rounded-xl"><span className="text-[9px] uppercase font-black">Match</span><span className="text-xl font-black block">{migrationStats.match}</span></div>
                        <div className="p-4 bg-rose-50 rounded-xl"><span className="text-[9px] uppercase font-black">Orphan</span><span className="text-xl font-black block">{migrationStats.orphaned}</span></div>
                        <button onClick={executeMigration} disabled={isProcessing} className="col-span-3 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Jalankan Sinkronisasi</button>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          )}

          {(activeTab === 'rpd' || activeTab === 'realisasi') && (
            <div className="space-y-6 animate-in fade-in duration-700">
              <div className="flex items-center justify-between mb-4">
                  {currentUser?.role === 'admin' ? (
                    <div className="flex gap-4">
                       <button onClick={handleToggleLock} className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase shadow-md transition-all ${isLocked ? 'bg-rose-100 text-rose-700' : 'bg-slate-900 text-white'}`}>
                          {isLocked ? <Lock size={14} /> : <Unlock size={14} />} {isLocked ? 'Buka Kunci' : 'Kunci Sistem'}
                       </button>
                       <button onClick={() => setShowClearDataModal(true)} className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase bg-white text-slate-600 border border-slate-200"><Eraser size={14} /> Reset Data</button>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border italic text-[11px] font-bold ${isLocked ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                       {isLocked ? <Lock size={16} /> : <ShieldHalf size={16} />} {isLocked ? 'Terkunci' : `Aktif: Tim ${currentUser?.team}`}
                    </div>
                  )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                 <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Wilayah</span>
                    <div className="flex gap-1 p-1 bg-slate-50 rounded-lg">
                      <button disabled={currentUser?.role !== 'admin'} onClick={() => setActiveWilayah("GG")} className={`flex-1 py-1.5 text-[10px] font-black rounded-md transition-all ${activeWilayah === "GG" ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 opacity-50'}`}>GG</button>
                      <button disabled={currentUser?.role !== 'admin'} onClick={() => setActiveWilayah("WA")} className={`flex-1 py-1.5 text-[10px] font-black rounded-md transition-all ${activeWilayah === "WA" ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 opacity-50'}`}>WA</button>
                    </div>
                 </div>
                 <div className="lg:col-span-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Tim Penanggung Jawab</span>
                    <div className="flex flex-wrap gap-1 p-1 bg-slate-50 rounded-lg">
                      {ALL_TEAMS.filter(t => activeWilayah === "GG" ? t !== "Umum" : t === "Umum").map(tim => (
                        <button key={tim} disabled={currentUser?.role !== 'admin'} onClick={() => setActiveTim(tim)} className={`px-4 py-1.5 text-[10px] font-black rounded-md transition-all ${activeTim === tim ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 opacity-50'}`}>{tim}</button>
                      ))}
                    </div>
                 </div>
                 <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Triwulan</span>
                    <div className="flex gap-1 p-1 bg-slate-50 rounded-lg">
                      {[1,2,3,4].map(tw => (<button key={tw} onClick={() => setTwActive(tw)} className={`flex-1 py-1.5 text-[10px] font-black rounded-md transition-all ${twActive === tw ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>TW {tw}</button>))}
                    </div>
                 </div>
              </div>
              <div className="bg-white shadow-2xl border border-slate-200 overflow-hidden rounded-[3.5rem]">
                <div className="overflow-x-auto custom-scrollbar max-h-[72vh]">
                  <table className="w-full border-collapse text-[10px]">
                    <thead className="sticky top-0 z-20 bg-slate-950 text-white font-bold uppercase text-center shadow-lg">
                      <tr>
                        <th className="px-3 py-4 text-left w-20">Kode</th>
                        <th className="px-4 py-4 text-left min-w-[350px]">Uraian</th>
                        <th className="px-3 py-4 text-right w-28">Pagu DIPA</th>
                        {twMonths[twActive].map(m => (<th key={m} className={`px-2 py-4 text-right w-24 ${activeTab === 'rpd' ? 'bg-orange-900' : 'bg-blue-900'}`}>{m}</th>))}
                        <th className="px-3 py-4 text-right bg-slate-800 w-28">TOTAL</th>
                        <th className="px-3 py-4 text-right bg-slate-900 w-28">SISA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {finalDisplay.map((item: any) => {
                        const isInduk = item.uraian?.toLowerCase().includes('kppn') || item.uraian?.toLowerCase().includes('lokasi');
                        const sisaPagu = activeTab === 'rpd' ? (Number(item.pagu) || 0) - (item.totalRPD || 0) : (Number(item.pagu) || 0) - (item.totalReal || 0);
                        const canEditThisTab = (activeTab === 'rpd' && (currentUser?.role === 'admin' || (currentUser?.role === 'ketua_tim' && !isLocked))) || (activeTab === 'realisasi' && currentUser?.role === 'admin');
                        return (
                          <tr key={item.id} className="hover:bg-blue-50/30 transition-all">
                            <td className="px-3 py-1.5 border-r border-slate-100 text-slate-400 font-mono italic">{item.kode}</td>
                            <td className="px-4 py-1.5 border-r border-slate-100 font-bold text-slate-800" style={{ paddingLeft: `${(item.level * 10)}px` }}>{item.uraian}</td>
                            <td className="px-3 py-1.5 text-right font-black border-r border-slate-100">{!isInduk ? formatMoney(item.pagu) : ""}</td>
                            {twMonths[twActive].map((m: string) => (
                                <td key={m} className="px-0 py-0 h-full border-r border-slate-100 bg-blue-50/50">
                                  {!isInduk && item.isDetail ? (
                                    <input type="text" value={formatInputMasking(activeTab === 'rpd' ? item.rpd?.[m] : item.realisasi?.[m])} readOnly={!canEditThisTab} onChange={async (e) => { 
                                        if(fbUser && canEditThisTab) { 
                                          const f = activeTab === 'rpd' ? 'rpd' : 'realisasi'; 
                                          const ex = activeTab === 'rpd' ? (item.rpd || {}) : (item.realisasi || {});
                                          const rawNumber = e.target.value.replace(/\D/g, "");
                                          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', DATA_COLLECTION, item.id), { [f]: { ...ex, [m]: rawNumber } }); 
                                        }
                                      }} className={`no-spinner w-full h-full text-right px-2 py-1.5 outline-none font-bold text-[10px] ${!canEditThisTab ? 'bg-slate-100 text-slate-400' : 'bg-teal-400/20 text-slate-900 focus:bg-white'}`} placeholder="0" />
                                  ) : !isInduk ? (<div className="text-right px-2 py-2 font-black italic">{formatMoney(activeTab === 'rpd' ? item.monthRPD?.[m] : item.monthReal?.[m])}</div>) : null}
                                </td>
                            ))}
                            <td className="px-3 py-1.5 text-right font-black bg-slate-100/50 text-slate-950">{!isInduk ? formatMoney(activeTab === 'rpd' ? item.totalRPD : item.totalReal) : ""}</td>
                            <td className={`px-3 py-1.5 text-right font-black border-r border-slate-100 ${sisaPagu < 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-950'}`}>{!isInduk ? formatMoney(sisaPagu) : ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
        <footer className="bg-white border-t border-slate-200 py-3 px-8 text-center flex items-center justify-center gap-3 shrink-0">
            <ShieldHalf size={14} className="text-slate-300" />
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">© 2026 BPS Kab. Seram Bagian Barat - Cloud Access</p>
        </footer>
      </main>

      {showClearDataModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-sm p-10 text-center border border-slate-200 animate-in zoom-in duration-200">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6"><AlertTriangle size={32} /></div>
              <h3 className="text-xl font-black text-slate-800 mb-2 italic">Konfirmasi Reset</h3>
              <p className="text-[11px] text-slate-500 mb-10 leading-relaxed italic">Hapus semua entri pada tab ini? Tindakan ini tidak dapat dibatalkan.</p>
              <div className="flex flex-col gap-3">
                 <button onClick={async () => { 
                   if (!fbUser || currentUser?.role !== 'admin') return;
                   setIsProcessing(true); 
                   const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', DATA_COLLECTION));
                   let batch = writeBatch(db); 
                   const fieldToClear = activeTab === 'rpd' ? 'rpd' : 'realisasi';
                   snap.docs.forEach(d => batch.update(d.ref, { [fieldToClear]: {} }));
                   await batch.commit(); 
                   setIsProcessing(false); setShowClearDataModal(false); 
                 }} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-rose-700">Ya, Reset</button>
                 <button onClick={() => setShowClearDataModal(false)} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase hover:bg-slate-200">Batal</button>
              </div>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; } .no-spinner::-webkit-outer-spin-button, .no-spinner::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; } .no-spinner { -moz-appearance: textfield; }`}} />
    </div>
  );
}
