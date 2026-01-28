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
  deleteDoc
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
  Layers,
  ShieldCheck,
  TrendingUp,
  Target,
  Users,
  UserPlus,
  Settings2,
  Edit3,
  Briefcase,
  Package,
  HardHat,
  LogOut,
  Eraser,
  ShieldHalf,
  CheckCircle2
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
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // --- STATE DATA ---
  const [dataTampil, setDataTampil] = useState<any[]>([]);
  const [kppnMetrics, setKppnMetrics] = useState<any>({
    rpd: { TW1: 0, TW2: 0, TW3: 0, TW4: 0 },
    real: { TW1: 0, TW2: 0, TW3: 0, TW4: 0 }
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
  const [logs, setLogs] = useState<string[]>([]);
  const [libReady, setLibReady] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]); 
  const [migrationStats, setMigrationStats] = useState({ match: 0, new: 0, orphaned: 0 });
  const [isLocked, setIsLocked] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  
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

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  // Excel Loader
  useEffect(() => {
    if ((window as any).XLSX) { setLibReady(true); return; }
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => { setLibReady(true); addLog("Sistem Excel Aktif."); };
    document.head.appendChild(script);
  }, []);

  // Auth Guard
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Autentikasi gagal:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync
  useEffect(() => {
    if (!user) return;

    const unsubUsers = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', USER_COLLECTION)),
      (snap) => setAllUsers(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
      (err) => console.error("Sinkronisasi user gagal:", err)
    );

    const unsubKppn = onSnapshot(
      doc(db, 'artifacts', appId, 'public', 'data', METRICS_COLLECTION, 'kppn_global'),
      (snap) => snap.exists() && setKppnMetrics(snap.data()),
      (err) => console.error("Sinkronisasi KPPN gagal:", err)
    );

    const unsubData = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', DATA_COLLECTION)),
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
      },
      (err) => console.error("Sinkronisasi data gagal:", err)
    );

    return () => {
      unsubUsers();
      unsubKppn();
      unsubData();
    };
  }, [user]);

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
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', METRICS_COLLECTION, 'kppn_global');
    await setDoc(docRef, {
      [category]: { ...kppnMetrics[category], [tw]: value }
    }, { merge: true });
  };

  const handleAddUser = async () => {
    if (!newUsername || !newPassword || !newFullName || !user) return;
    setIsProcessing(true);
    try {
      const userId = crypto.randomUUID();
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', USER_COLLECTION, userId), {
        uid: userId,
        username: newUsername.trim().toLowerCase(),
        password: newPassword,
        name: newFullName,
        role: newUserRole,
        team: newUserTeam,
        createdAt: new Date()
      });
      setNewUsername(""); setNewPassword(""); setNewFullName("");
      addLog(`Pegawai ${newFullName} berhasil didaftarkan.`);
    } catch (e: any) { addLog("Gagal: " + e.message); }
    finally { setIsProcessing(false); }
  };

  const handleFileAnalyze = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !libReady) return;
    setIsProcessing(true); setLogs([]);
    addLog(`Menganalisa: ${file.name}`);
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
    } catch (e: any) { setIsProcessing(false); addLog("Error: " + e.message); }
  };

  const executeMigration = async () => {
    if (!user) return;
    setIsProcessing(true); addLog("Memulai Migrasi...");
    try {
        const colRef = collection(db, 'artifacts', appId, 'public', 'data', DATA_COLLECTION);
        const snap = await getDocs(colRef);
        const backup = new Map();
        dataTampil.forEach(d => backup.set(d.tempPathKey, { rpd: d.rpd || {}, realisasi: d.realisasi || {} }));
        const orphans: any[] = [];
        const newKeys = new Set(previewData.map(p => p.pathKey));
        dataTampil.forEach(d => { if (sumMapValues(d.rpd) > 0 && !newKeys.has(d.tempPathKey)) orphans.push({ ...d, kode: `(HILANG) ${d.kode}`, isOrphan: true }); });
        
        let batch = writeBatch(db), op = 0;
        for (const docSnap of snap.docs) {
            batch.delete(docSnap.ref);
            if (++op >= 450) { await batch.commit(); batch = writeBatch(db); op = 0; }
        }
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
        addLog("Migrasi Selesai."); setPreviewData([]); setActiveTab('dashboard');
    } catch (e: any) { addLog("Gagal: " + e.message); } finally { setIsProcessing(false); }
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

      if (isDetail) {
        totalRPD = sumMapValues(item.rpd);
        totalReal = sumMapValues(item.realisasi);
      } else if (!isInduk) {
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
        monthRPD: item.rpd || {}, monthReal: item.realisasi || {},
        level: 8, isDetail: true
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

  const finalDisplay = processedData.filter((d) => 
    (d.uraian && d.uraian.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (d.kode && d.kode.includes(searchTerm))
  );

  if (isAuthLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <span className="font-black uppercase tracking-widest text-sm italic">Menghubungkan ke Cloud SBB...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
      <aside className={`bg-[#0F172A] text-slate-300 transition-all duration-300 flex flex-col z-40 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-16 flex items-center px-6 bg-slate-900/50 border-b border-white/5">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shrink-0 shadow-lg">M</div>
          {sidebarOpen && <div className="ml-3 font-black text-white italic tracking-tighter">MESEIKPA</div>}
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
          <button onClick={() => setActiveTab('migrasi')} className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${activeTab === 'migrasi' ? 'bg-slate-700 text-white' : 'hover:bg-white/5'}`}>
            <FileUp size={20} className={sidebarOpen ? 'mr-3' : ''} />
            {sidebarOpen && <span className="font-semibold text-xs uppercase tracking-wider">Migrasi DIPA</span>}
          </button>
          <button onClick={() => setActiveTab('users')} className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-rose-600 text-white shadow-lg' : 'hover:bg-white/5'}`}>
              <Users size={20} className={sidebarOpen ? 'mr-3' : ''} />
              {sidebarOpen && <span className="font-semibold text-xs uppercase tracking-wider">Manajemen User</span>}
          </button>
        </nav>
        <div className="p-4 border-t border-white/5">
           <button onClick={() => setUser(null)} className="w-full flex items-center px-3 py-3 rounded-xl hover:bg-rose-600/20 text-rose-400 transition-all">
              <LogOut size={20} className={sidebarOpen ? 'mr-3' : ''} />
              {sidebarOpen && <span className="font-black text-xs uppercase tracking-widest">Logout SBB</span>}
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><Menu size={20} /></button>
            <h2 className="font-black text-slate-800 text-[13px] uppercase tracking-widest italic flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              BPS Kab. Seram Bagian Barat
            </h2>
          </div>
          <div className="flex items-center gap-4">
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

               <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-7 bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm">
                     <div className="flex items-center justify-between mb-10">
                        <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tighter leading-none">Grafik Performa RPD vs REAL</h3>
                        <TrendingUp className="text-indigo-500" />
                     </div>
                     <div className="h-[300px] flex items-end justify-around gap-10 px-4">
                        {globalStats.tw.map((tw, i) => (
                           <div key={i} className="flex-1 flex flex-col items-center group">
                              <div className="flex gap-2 items-end h-full w-full">
                                 <div className="flex-1 bg-orange-200 rounded-t-xl relative transition-all" style={{ height: `${(tw.rpd / (globalStats.pagu / 2 || 1)) * 100}%` }}></div>
                                 <div className="flex-1 bg-blue-500 rounded-t-xl relative shadow-lg shadow-blue-500/20 transition-all" style={{ height: `${(tw.real / (globalStats.pagu / 2 || 1)) * 100}%` }}></div>
                              </div>
                              <div className="mt-4 text-[11px] font-black text-slate-800 tracking-widest uppercase">TW {i + 1}</div>
                           </div>
                        ))}
                     </div>
                  </div>
                  <div className="lg:col-span-5 bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm flex flex-col">
                     <h3 className="text-lg font-black text-slate-800 uppercase italic mb-8">Realisasi RO Tertinggi</h3>
                     <div className="space-y-4 overflow-y-auto max-h-[350px] custom-scrollbar pr-2">
                        {roDataList.sort((a,b) => b.real - a.real).slice(0, 10).map((ro, i) => (
                           <div key={i} className="space-y-2">
                              <div className="flex justify-between text-[10px] font-bold">
                                 <span className="truncate w-48">{ro.kode} - {ro.uraian}</span>
                                 <span>Rp {formatMoney(ro.real)}</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                 <div className="h-full bg-blue-500" style={{ width: `${(ro.real / (ro.pagu || 1)) * 100}%` }}></div>
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
               {/* MODUL KONFIGURASI KPPN */}
               <div className="bg-slate-900 rounded-[3rem] p-8 shadow-2xl border border-white/10 text-white">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg"><Settings2 size={24} /></div>
                     <div>
                        <h3 className="text-lg font-black uppercase italic leading-tight text-white">Konfigurasi Data KPPN</h3>
                        <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">Target resmi untuk penyandingan data</p>
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
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-400 mb-2 tracking-widest"><Activity size={14} /> Realisasi Anggaran KPPN</div>
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

               {/* PANEL KOMPARASI KINERJA (BARU) */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-lg group">
                     <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-orange-100 text-orange-600 rounded-3xl"><Target size={28}/></div>
                        <div className="text-right">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Status RPD</span>
                           {Math.abs(globalStats.rpd - sumMapValues(kppnMetrics.rpd)) < 1000 ? (
                              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center justify-end gap-1"><CheckCircle2 size={12}/> Match</span>
                           ) : (
                              <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center justify-end gap-1"><AlertTriangle size={12}/> Unmatch</span>
                           )}
                        </div>
                     </div>
                     <h4 className="text-lg font-black italic text-slate-800 mb-4 uppercase tracking-tighter">Komparasi Target RPD</h4>
                     <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs">
                           <span className="text-slate-500 font-bold uppercase tracking-widest">Input Satker</span>
                           <span className="font-black text-slate-800">Rp {formatMoney(globalStats.rpd)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                           <span className="text-slate-500 font-bold uppercase tracking-widest">Target KPPN</span>
                           <span className="font-black text-orange-600 italic underline">Rp {formatMoney(sumMapValues(kppnMetrics.rpd))}</span>
                        </div>
                        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deviasi / Selisih</span>
                           <span className={`text-sm font-black italic ${globalStats.rpd - sumMapValues(kppnMetrics.rpd) === 0 ? 'text-slate-400' : 'text-rose-600'}`}>
                              Rp {formatMoney(globalStats.rpd - sumMapValues(kppnMetrics.rpd))}
                           </span>
                        </div>
                     </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-lg group">
                     <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-blue-100 text-blue-600 rounded-3xl"><Activity size={28}/></div>
                        <div className="text-right">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Status Realisasi</span>
                           {Math.abs(globalStats.real - sumMapValues(kppnMetrics.real)) < 1000 ? (
                              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center justify-end gap-1"><CheckCircle2 size={12}/> Match</span>
                           ) : (
                              <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center justify-end gap-1"><AlertTriangle size={12}/> Unmatch</span>
                           )}
                        </div>
                     </div>
                     <h4 className="text-lg font-black italic text-slate-800 mb-4 uppercase tracking-tighter">Komparasi Realisasi</h4>
                     <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs">
                           <span className="text-slate-500 font-bold uppercase tracking-widest">Input Satker</span>
                           <span className="font-black text-slate-800">Rp {formatMoney(globalStats.real)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                           <span className="text-slate-500 font-bold uppercase tracking-widest">Angka KPPN</span>
                           <span className="font-black text-blue-600 italic underline">Rp {formatMoney(sumMapValues(kppnMetrics.real))}</span>
                        </div>
                        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deviasi / Selisih</span>
                           <span className={`text-sm font-black italic ${globalStats.real - sumMapValues(kppnMetrics.real) === 0 ? 'text-slate-400' : 'text-rose-600'}`}>
                              Rp {formatMoney(globalStats.real - sumMapValues(kppnMetrics.real))}
                           </span>
                        </div>
                     </div>
                  </div>
               </div>

               {/* JENIS BELANJA */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { label: 'Belanja Pegawai (51)', val: globalStats.belanja.pegawai, icon: Briefcase, color: 'indigo' },
                    { label: 'Belanja Barang (52)', val: globalStats.belanja.barang, icon: Package, color: 'emerald' },
                    { label: 'Belanja Modal (53)', val: globalStats.belanja.modal, icon: HardHat, color: 'rose' },
                  ].map((bel, i) => {
                    const BelIcon = bel.icon;
                    return (
                      <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-lg flex items-center gap-6 group hover:border-blue-300 transition-all">
                        <div className={`p-5 bg-${bel.color}-100 text-${bel.color}-600 rounded-3xl group-hover:scale-110 transition-all`}><BelIcon size={28} /></div>
                        <div className="flex-1">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{bel.label}</h4>
                          <div className="text-xl font-black italic tracking-tighter text-slate-800">Rp {formatMoney(bel.val)}</div>
                        </div>
                      </div>
                    );
                  })}
               </div>

               {/* FILTER TABEL */}
               <div className="bg-slate-900 p-8 rounded-[3rem] shadow-xl border border-white/5 flex items-center gap-8">
                  <div className="p-5 bg-white/10 text-white rounded-2xl"><Layers size={28}/></div>
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-[0.2em]">Filter Struktur</label>
                    <select value={rapatDepth} onChange={(e) => setRapatDepth(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-6 text-[13px] font-black text-white outline-none">
                        <option value={1} className="text-black">DIPA Induk</option>
                        <option value={2} className="text-black">Output RO</option>
                        <option value={5} className="text-black">Akun 6 Digit</option>
                        <option value={8} className="text-black">Seluruh Rincian</option>
                    </select>
                  </div>
                  <div className="flex-1">
                     <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Cari Uraian..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-6 text-[13px] font-black text-white outline-none" />
                  </div>
               </div>

               {/* TABEL UTAMA */}
               <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar max-h-[72vh]">
                    <table className="w-full border-collapse text-[10px]">
                      <thead className="sticky top-0 z-20 bg-slate-950 text-white font-bold uppercase text-center shadow-lg">
                        <tr>
                          <th className="px-3 py-4 text-left w-20">Kode</th>
                          <th className="px-4 py-4 text-left min-w-[350px]">Uraian</th>
                          <th className="px-3 py-4 text-right w-28">Pagu DIPA</th>
                          {['I','II','III','IV'].map((tw, idx) => (
                            <th key={idx} className="px-2 py-4 text-right w-32 bg-emerald-900/40 font-black tracking-tighter border-r border-white/5">TW {tw}</th>
                          ))}
                          <th className="px-2 py-4 text-right bg-orange-900 w-28 tracking-tighter">TOTAL RPD</th>
                          <th className="px-2 py-4 text-right bg-blue-900 w-28 tracking-tighter">TOTAL REAL</th>
                          <th className="px-3 py-4 text-right bg-slate-900 w-28 tracking-tighter">SISA PAGU</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {finalDisplay.map((item: any) => {
                          const isNonFinancial = item.uraian?.toLowerCase().includes('kppn') || item.uraian?.toLowerCase().includes('lokasi');
                          const sisaPagu = (Number(item.pagu) || 0) - (item.totalReal || 0);
                          let rowBg = "hover:bg-blue-50/30 transition-all";
                          if (item.level === 1) rowBg = "bg-amber-100/60 font-black";
                          if (item.level === 2) rowBg = "bg-blue-100/40 font-black";
                          if (item.isOrphan) rowBg = "bg-rose-50 italic";
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

          {activeTab === 'migrasi' && (
            <div className="max-w-4xl mx-auto py-4 animate-in slide-in-from-bottom duration-700">
               <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-900 p-8 text-white relative">
                    <h3 className="text-xl font-black uppercase tracking-widest italic text-white">Konsol Migrasi Cloud</h3>
                    <p className="text-slate-400 mt-1 text-[11px]">Sinkronisasi struktur anggaran BPS SBB.</p>
                  </div>
                  <div className="p-10 space-y-8">
                    <div className="border-2 border-dashed border-slate-200 rounded-[2.5rem] p-16 text-center hover:border-blue-400 hover:bg-blue-50/20 cursor-pointer transition-all" onClick={() => fileInputRef.current?.click()}>
                      <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileAnalyze} disabled={isProcessing} className="hidden" />
                      <FileUp size={48} className="mx-auto mb-4 text-slate-300" />
                      <span className="text-xs font-black uppercase text-slate-400 italic">Pilih File SAKTI (.xlsx)</span>
                    </div>
                    {previewData.length > 0 && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl"><span className="text-[9px] uppercase font-black">Struktur</span><span className="text-xl font-black block">{previewData.length}</span></div>
                        <div className="p-4 bg-emerald-50 rounded-xl"><span className="text-[9px] uppercase font-black">Match</span><span className="text-xl font-black block">{migrationStats.match}</span></div>
                        <div className="p-4 bg-rose-50 rounded-xl"><span className="text-[9px] uppercase font-black">Orphan</span><span className="text-xl font-black block">{migrationStats.orphaned}</span></div>
                        <button onClick={executeMigration} disabled={isProcessing} className="col-span-3 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Jalankan Pembaruan</button>
                      </div>
                    )}
                    <div className="h-32 bg-slate-950 rounded-2xl p-4 overflow-y-auto custom-scrollbar font-mono text-[9px] text-emerald-400 shadow-inner">
                        {logs.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                  </div>
               </div>
            </div>
          )}

          {(activeTab === 'rpd' || activeTab === 'realisasi') && (
            <div className="space-y-6 animate-in fade-in duration-700">
              <div className="flex items-center justify-between mb-4">
                 <button onClick={() => setIsLocked(!isLocked)} className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase shadow-md transition-all ${isLocked ? 'bg-rose-100 text-rose-700' : 'bg-slate-900 text-white'}`}>
                    {isLocked ? <Lock size={14} /> : <Unlock size={14} />} {isLocked ? 'Terkunci' : 'Kunci Pengisian'}
                 </button>
                 <button onClick={() => setShowClearDataModal(true)} className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase bg-white text-slate-600 border border-slate-200"><Eraser size={14} /> Reset Nilai</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                 <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Wilayah</span>
                    <div className="flex gap-1 p-1 bg-slate-50 rounded-lg">
                      <button onClick={() => setActiveWilayah("GG")} className={`flex-1 py-1.5 text-[10px] font-black rounded-md transition-all ${activeWilayah === "GG" ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>GG</button>
                      <button onClick={() => setActiveWilayah("WA")} className={`flex-1 py-1.5 text-[10px] font-black rounded-md transition-all ${activeWilayah === "WA" ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>WA</button>
                    </div>
                 </div>
                 <div className="lg:col-span-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Tim Pelaksana</span>
                    <div className="flex flex-wrap gap-1 p-1 bg-slate-50 rounded-lg">
                      {ALL_TEAMS.filter(t => activeWilayah === "GG" ? t !== "Umum" : t === "Umum").map(tim => (
                        <button key={tim} onClick={() => setActiveTim(tim)} className={`px-4 py-1.5 text-[10px] font-black rounded-md transition-all ${activeTim === tim ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400'}`}>{tim}</button>
                      ))}
                    </div>
                 </div>
                 <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Triwulan</span>
                    <div className="flex gap-1 p-1 bg-slate-50 rounded-lg">
                      {[1,2,3,4].map(tw => (
                         <button key={tw} onClick={() => setTwActive(tw)} className={`flex-1 py-1.5 text-[10px] font-black rounded-md transition-all ${twActive === tw ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>TW {tw}</button>
                      ))}
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
                        <th className="px-3 py-4 text-right bg-slate-800 w-28 uppercase">Total {activeTab}</th>
                        <th className="px-3 py-4 text-right bg-slate-900 w-28 tracking-tighter">SISA PAGU</th>
                        <th className="px-2 py-4 text-center">Opsi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {finalDisplay.map((item: any) => {
                        const isInduk = item.uraian?.toLowerCase().includes('kppn') || item.uraian?.toLowerCase().includes('lokasi');
                        const sisaPagu = activeTab === 'rpd' ? (Number(item.pagu) || 0) - (item.totalRPD || 0) : (Number(item.pagu) || 0) - (item.totalReal || 0);
                        return (
                          <tr key={item.id} className="hover:bg-blue-50/30 transition-all">
                            <td className="px-3 py-1.5 border-r border-slate-100 text-slate-400 font-mono italic">{item.kode}</td>
                            <td className="px-4 py-1.5 border-r border-slate-100 font-bold text-slate-800" style={{ paddingLeft: `${(item.level * 10)}px` }}>{item.uraian}</td>
                            <td className="px-3 py-1.5 text-right font-black text-slate-950 border-r border-slate-100">{!isInduk ? formatMoney(item.pagu) : ""}</td>
                            {twMonths[twActive].map((m: string) => (
                                <td key={m} className="px-0 py-0 h-full border-r border-slate-100 bg-blue-50/50 group">
                                  {!isInduk && item.isDetail ? (
                                    <input type="number" value={activeTab === 'rpd' ? (item.rpd?.[m] || "") : (item.realisasi?.[m] || "")} readOnly={isLocked}
                                      onChange={async (e) => { if(user && !isLocked) { const f = activeTab === 'rpd' ? 'rpd' : 'realisasi'; const ex = activeTab === 'rpd' ? (item.rpd || {}) : (item.realisasi || {});
                                          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', DATA_COLLECTION, item.id), { [f]: { ...ex, [m]: e.target.value } }); }
                                      }} className="no-spinner w-full h-full text-right px-2 py-1.5 outline-none font-bold text-[10px] bg-teal-400 text-slate-900" placeholder="0" />
                                  ) : !isInduk ? (<div className="text-right px-2 py-2 text-slate-950 font-black italic">{formatMoney(activeTab === 'rpd' ? item.monthRPD?.[m] : item.monthReal?.[m])}</div>) : null}
                                </td>
                              ))}
                              <td className="px-3 py-1.5 text-right font-black bg-slate-100/50 text-slate-950">{!isInduk ? formatMoney(activeTab === 'rpd' ? item.totalRPD : item.totalReal) : ""}</td>
                            <td className={`px-3 py-1.5 text-right font-black border-r border-slate-100 ${sisaPagu < 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-950'}`}>{!isInduk ? formatMoney(sisaPagu) : ""}</td>
                            <td className="px-2 py-2 text-center">
                               {item.isOrphan && (
                                 <button onClick={async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', DATA_COLLECTION, item.id))} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg"><Trash2 size={14}/></button>
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

          {activeTab === 'users' && (
            <div className="max-w-6xl mx-auto space-y-10 animate-in slide-in-from-bottom duration-500 pb-20">
               <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
                  <h3 className="text-2xl font-black uppercase italic mb-10 flex items-center gap-4 text-white">
                     <UserPlus className="text-blue-500" /> Registrasi Pegawai Baru
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-white">
                     <div className="flex flex-col gap-2">
                       <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Username</label>
                       <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm outline-none" placeholder="Username..." />
                     </div>
                     <div className="flex flex-col gap-2">
                       <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Password</label>
                       <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm outline-none" placeholder="Password..." />
                     </div>
                     <div className="flex flex-col gap-2">
                       <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Nama Lengkap</label>
                       <input type="text" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm outline-none" placeholder="Nama Lengkap..." />
                     </div>
                     <div className="flex flex-col gap-2">
                       <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Peran Sistem</label>
                       <select value={newUserRole} onChange={(e:any) => setNewUserRole(e.target.value)} className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm outline-none">
                          <option value="ketua_tim" className="text-black">Ketua Tim</option>
                          <option value="pimpinan" className="text-black">Pimpinan</option>
                          <option value="admin" className="text-black">Administrator Utama</option>
                       </select>
                     </div>
                     <div className="lg:col-span-2 flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Penugasan Tim</label>
                        <div className="flex flex-wrap gap-2">
                           {ALL_TEAMS.map(t => (
                              <button key={t} onClick={() => setNewUserTeam(t)} className={`px-5 py-3 rounded-xl text-[10px] font-black border transition-all ${newUserTeam === t ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
                                 {t}
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>
                  <button onClick={handleAddUser} className="mt-12 px-14 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Simpan Akun</button>
               </div>
               <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                     <thead className="bg-slate-50 border-b border-slate-100 uppercase text-[9px] font-black text-slate-400">
                        <tr><th className="px-8 py-4">Nama</th><th className="px-4 py-4">Username</th><th className="px-4 py-4 text-center">Hapus</th></tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {allUsers.map((u, i) => (
                           <tr key={i}>
                              <td className="px-8 py-5 font-bold text-slate-800">{u.name}</td>
                              <td className="px-4 py-5 font-mono text-blue-600 italic">@{u.username}</td>
                              <td className="px-4 py-5 text-center">
                                 <button onClick={async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', USER_COLLECTION, u.id))} className="p-2 text-rose-400 hover:bg-rose-100 rounded-lg"><Trash2 size={14}/></button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}
        </div>
        <footer className="bg-white border-t border-slate-200 py-3 px-8 text-center flex items-center justify-center gap-3 shrink-0">
            <ShieldHalf size={14} className="text-slate-300" />
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">© 2026 BPS Kab. Seram Bagian Barat - Internal Cloud Access</p>
        </footer>
      </main>

      {/* MODAL RESET DATA */}
      {showClearDataModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-sm p-10 text-center border border-slate-200 animate-in zoom-in duration-200">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6"><AlertTriangle size={32} /></div>
              <h3 className="text-xl font-black text-slate-800 mb-2 italic">Konfirmasi Reset</h3>
              <p className="text-[11px] text-slate-500 mb-10 leading-relaxed italic">Hapus semua data? Tindakan ini tidak dapat dibatalkan.</p>
              <div className="flex flex-col gap-3">
                 <button onClick={async () => { 
                   if (!user) return;
                   setIsProcessing(true); 
                   const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', DATA_COLLECTION));
                   let batch = writeBatch(db); 
                   const fieldToClear = activeTab === 'rpd' ? 'rpd' : 'realisasi';
                   snap.docs.forEach(d => batch.update(d.ref, { [fieldToClear]: {} }));
                   await batch.commit(); 
                   setIsProcessing(false); 
                   setShowClearDataModal(false); 
                 }} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-rose-700 transition-all">Ya, Hapus Semua</button>
                 <button onClick={() => setShowClearDataModal(false)} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase hover:bg-slate-200 transition-all">Batal</button>
              </div>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .no-spinner::-webkit-outer-spin-button, .no-spinner::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .no-spinner { -moz-appearance: textfield; }
      `}} />
    </div>
  );
}
