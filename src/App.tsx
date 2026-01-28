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
  where
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  LayoutDashboard, 
  FileUp, 
  Search, 
  Trash2, 
  AlertTriangle, 
  Menu, 
  X, 
  User,
  Info,
  Calendar,
  Wallet,
  Activity,
  Lock,
  Unlock,
  Eraser,
  BarChart3,
  Edit3,
  PieChart,
  Layers,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  Target,
  Briefcase,
  Package,
  HardHat,
  Users,
  LogOut,
  UserPlus,
  ShieldAlert,
  Fingerprint,
  CheckCircle2,
  Settings2,
  ArrowRightLeft,
  KeyRound,
  ShieldHalf
} from 'lucide-react';

// ==========================================================
// 1. KONFIGURASI FIREBASE
// ==========================================================
const firebaseConfig = {
  apiKey: "AIzaSyDYqadyvJ-9RYxBNOeDxsYAY6wwE5t_y8w",
  authDomain: "mese-ikpa.firebaseapp.com",
  projectId: "mese-ikpa",
  storageBucket: "mese-ikpa.firebasestorage.app",
  messagingSenderId: "968020082155",
  appId: "1:968020082155:web:f86188e6de15dcd8cc2dae",
  measurementId: "G-RH2652B9CL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const APP_IDENTIFIER = "meseikpa-primary-store";
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
  // --- STATE AUTH (Login Dinonaktifkan Sementara) ---
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>({
    name: "Admin SBB",
    role: "admin",
    team: "Nerwilis",
    username: "admin"
  });

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // --- STATE DATA ---
  const [dataTampil, setDataTampil] = useState<any[]>([]);
  const [kppnMetrics, setKppnMetrics] = useState<any>({
    rpd: { TW1: 0, TW2: 0, TW3: 0, TW4: 0 },
    real: { TW1: 0, TW2: 0, TW3: 0, TW4: 0 }
  });

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
  
  // --- STATE FORM USER BARU ---
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newUserRole, setNewUserRole] = useState<'admin' | 'pimpinan' | 'ketua_tim'>('ketua_tim');
  const [newUserTeam, setNewUserTeam] = useState("Nerwilis");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  const twMonths: Record<number, string[]> = {
    1: ['Jan', 'Feb', 'Mar'], 2: ['Apr', 'Mei', 'Jun'],
    3: ['Jul', 'Ags', 'Sep'], 4: ['Okt', 'Nov', 'Des']
  };

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  // Load Excel Library
  useEffect(() => {
    if ((window as any).XLSX) { setLibReady(true); return; }
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => { setLibReady(true); addLog("Sistem Excel Aktif."); };
    document.head.appendChild(script);
  }, []);

  // Firebase Base Auth (Bypass login UI tapi tetap konek DB)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        await signInAnonymously(auth);
      } else {
        setIsAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync Users List
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'artifacts', APP_IDENTIFIER, 'public', 'data', USER_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      setAllUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });
  }, [auth.currentUser]);

  // Sync KPPN Metrics
  useEffect(() => {
    if (!isLoggedIn) return;
    const docRef = doc(db, 'artifacts', APP_IDENTIFIER, 'public', 'data', METRICS_COLLECTION, 'kppn_global');
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) setKppnMetrics(snapshot.data());
    });
  }, [isLoggedIn]);

  // Sync Main Data
  useEffect(() => {
    if (!isLoggedIn) return;
    const q = query(collection(db, 'artifacts', APP_IDENTIFIER, 'public', 'data', DATA_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      let dataItems: any[] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      dataItems.sort((a, b) => (a.noUrut || 0) - (b.noUrut || 0));
      
      let currentWilayah = "GG";
      const path: string[] = ["", "", "", "", "", "", "", ""];
      const processed = dataItems.map((item: any) => {
        if (item.kode && String(item.kode).includes("054.01.WA")) currentWilayah = "WA";
        if (item.kode && String(item.kode).includes("054.01.GG")) currentWilayah = "GG"; 
        const rowKey = generateRowKey(item, path);
        return { ...item, wilayah: currentWilayah, tempPathKey: rowKey };
      });
      setDataTampil(processed);
    }, (error) => {
      addLog("Firebase Error: " + error.message);
    });
  }, [isLoggedIn]);

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
  }, [dataTampil]);

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
    if (!isLoggedIn) return;
    const docRef = doc(db, 'artifacts', APP_IDENTIFIER, 'public', 'data', METRICS_COLLECTION, 'kppn_global');
    await setDoc(docRef, {
      [category]: { ...kppnMetrics[category], [tw]: value }
    }, { merge: true });
  };

  const handleAddUser = async () => {
    if (!newUsername || !newPassword || !newFullName) return;
    setIsProcessing(true);
    try {
      const userId = crypto.randomUUID();
      await setDoc(doc(db, 'artifacts', APP_IDENTIFIER, 'public', 'data', USER_COLLECTION, userId), {
        uid: userId,
        username: newUsername.trim().toLowerCase(),
        password: newPassword,
        name: newFullName,
        role: newUserRole,
        team: newUserTeam,
        createdAt: new Date()
      });
      setNewUsername(""); 
      setNewPassword("");
      setNewFullName("");
      addLog(`Pegawai ${newFullName} berhasil didaftarkan.`);
    } catch (e: any) { addLog("Gagal Tambah: " + e.message); }
    finally { setIsProcessing(false); }
  };

  const handleFileAnalyze = async (inputEvent: React.ChangeEvent<HTMLInputElement>) => {
    const file = inputEvent.target.files?.[0];
    if (!file || !libReady) return;
    setIsProcessing(true);
    setLogs([]);
    addLog(`Menganalisa File DIPA: ${file.name}`);
    try {
      const XLSX = (window as any).XLSX;
      const reader = new FileReader();
      reader.onload = async (evt: any) => {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const parsedItems: any[] = [];
        let counter = 1;
        const currentPath: string[] = ["", "", "", "", "", "", "", ""];
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            const colKode = row[0] ? String(row[0]).trim() : "";
            const colUraian = [row[1], row[2], row[3]].filter(Boolean).join(" ").trim();
            if (!colKode && !colUraian) continue;
            const colSatuan = row[4] ? String(row[4]).trim() : "";
            let colPagu = 0, foundPaguIndex = -1;
            for (let j = row.length - 1; j >= 5; j--) {
                if (typeof row[j] === 'number') { colPagu = row[j]; foundPaguIndex = j; break; }
            }
            let colHargaSatuan = foundPaguIndex > 5 && typeof row[foundPaguIndex - 1] === 'number' ? row[foundPaguIndex - 1] : 0;
            const pathKey = generateRowKey({ kode: colKode, uraian: colUraian }, currentPath);
            parsedItems.push({ kode: colKode, uraian: colUraian, satuan: colSatuan, hargaSatuan: colHargaSatuan, pagu: colPagu, pathKey, noUrut: counter++ });
        }
        
        const existingKeys = new Set(dataTampil.map(d => d.tempPathKey));
        let matchCount = 0, orphanedCount = 0;
        parsedItems.forEach(p => { if (existingKeys.has(p.pathKey)) matchCount++; });
        dataTampil.forEach(d => {
            const hasData = (sumMapValues(d.rpd) > 0 || sumMapValues(d.realisasi) > 0);
            const inNew = parsedItems.some(p => p.pathKey === d.tempPathKey);
            if (hasData && !inNew) orphanedCount++;
        });

        setPreviewData(parsedItems);
        setMigrationStats({ match: matchCount, new: parsedItems.length - matchCount, orphaned: orphanedCount });
        addLog(`Analisa Selesai. Menemukan ${parsedItems.length} baris.`);
        setIsProcessing(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (e: any) { setIsProcessing(false); addLog("Error: " + e.message); }
  };

  const executeMigration = async () => {
    setIsProcessing(true);
    addLog("Melakukan Migrasi Pintar (Backup & Restore Isian)...");
    try {
        const colRef = collection(db, 'artifacts', APP_IDENTIFIER, 'public', 'data', DATA_COLLECTION);
        const currentSnap = await getDocs(colRef);
        const dataBackup = new Map();
        dataTampil.forEach(item => {
            dataBackup.set(item.tempPathKey, { rpd: item.rpd || {}, realisasi: item.realisasi || {} });
        });
        const orphanedItems: any[] = [];
        const newKeysSet = new Set(previewData.map(p => p.pathKey));
        dataTampil.forEach(item => {
            const hasValue = (sumMapValues(item.rpd) > 0 || sumMapValues(item.realisasi) > 0);
            if (hasValue && !newKeysSet.has(item.tempPathKey)) {
                orphanedItems.push({ ...item, kode: `(HILANG) ${item.kode || ''}`, uraian: `[PENAMPUNGAN] ${item.uraian}`, pagu: 0, isOrphan: true });
            }
        });
        let batch = writeBatch(db), opCount = 0;
        for (const docSnapshot of currentSnap.docs) {
            batch.delete(docSnapshot.ref);
            if (++opCount >= 450) { await batch.commit(); batch = writeBatch(db); opCount = 0; }
        }
        for (const item of previewData) {
            const backed = dataBackup.get(item.pathKey) || { rpd: {}, realisasi: {} };
            batch.set(doc(colRef), { ...item, ...backed, timestamp: new Date() });
            if (++opCount >= 450) { await batch.commit(); batch = writeBatch(db); opCount = 0; }
        }
        for (const orphan of orphanedItems) {
            const { id, ...cleanOrphan } = orphan;
            batch.set(doc(colRef), cleanOrphan);
            if (++opCount >= 450) { await batch.commit(); batch = writeBatch(db); opCount = 0; }
        }
        if (opCount > 0) await batch.commit();
        addLog("Migrasi Pintar Selesai. Seluruh isian aman.");
        setPreviewData([]); setActiveTab('dashboard');
    } catch (error: any) { addLog("Gagal Migrasi: " + error.message); }
    finally { setIsProcessing(false); }
  };

  const processedData = useMemo(() => {
    const normalData = dataTampil.filter(d => !d.isOrphan);
    const orphanData = dataTampil.filter(d => d.isOrphan);
    const baseSource = (activeTab === 'rapat') ? normalData : normalData.filter(d => d.wilayah === activeWilayah);
    
    const calculatedNormal = baseSource.map((item: any, index: number) => {
      const level = getLevel(item.kode);
      const isNonFinancialInduk = item.uraian?.toLowerCase().includes('kppn') || item.uraian?.toLowerCase().includes('lokasi');
      const isDetail = level === 8 && (Number(item.pagu) || 0) > 0 && !isNonFinancialInduk;
      let totalRPD = 0, totalRealisasi = 0;
      let monthRPD: Record<string, number> = {};
      let monthReal: Record<string, number> = {};
      if (isDetail) {
        totalRPD = sumMapValues(item.rpd);
        totalRealisasi = sumMapValues(item.realisasi);
      } else if (!isNonFinancialInduk) {
        for (let i = index + 1; i < baseSource.length; i++) {
            const next = baseSource[i];
            const nextLevel = getLevel(next.kode);
            if (next.kode !== "" && nextLevel <= level) break;
            if (nextLevel === 8 && (Number(next.pagu) || 0) > 0) {
                totalRPD += sumMapValues(next.rpd);
                totalRealisasi += sumMapValues(next.realisasi);
                allMonths.forEach(m => {
                    monthRPD[m] = (monthRPD[m] || 0) + (Number(next.rpd?.[m]) || 0);
                    monthReal[m] = (monthReal[m] || 0) + (Number(next.realisasi?.[m]) || 0);
                });
            }
        }
      }
      return { ...item, totalRPD, totalRealisasi, monthRPD, monthReal, level, isDetail };
    });

    const calculatedOrphan = orphanData.map(item => ({
        ...item,
        totalRPD: sumMapValues(item.rpd),
        totalRealisasi: sumMapValues(item.realisasi),
        monthRPD: item.rpd || {},
        monthReal: item.realisasi || {},
        level: 8, isDetail: true
    }));

    const merged = [...calculatedNormal, ...calculatedOrphan];

    if (activeTab === 'rapat') return merged.filter(item => item.level <= rapatDepth);
    
    // Filter berdasarkan Tim pengguna yang sedang aktif
    const allowedROs = TIM_MAPPING[activeTim] || [];
    let isInsideAllowedRO = false;
    return merged.filter((item: any) => {
      if (item.isOrphan) return true; 
      const level = getLevel(item.kode);
      if (level === 2) isInsideAllowedRO = allowedROs.includes(item.kode);
      return isInsideAllowedRO || level === 1; 
    });
  }, [dataTampil, activeWilayah, activeTim, activeTab, rapatDepth]);

  const finalDisplay = processedData.filter((d: any) => 
    (d.uraian && d.uraian.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (d.kode && d.kode.includes(searchTerm))
  );

  if (isAuthLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <span className="font-black uppercase tracking-widest italic text-sm">Menghubungkan ke Cloud...</span>
      </div>
    );
  }

  // --- MAIN APP RENDER ---
  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
      <aside className={`bg-[#0F172A] text-slate-300 transition-all duration-300 flex flex-col z-40 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-16 flex items-center px-6 bg-slate-900/50 border-b border-white/5">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shrink-0 shadow-lg">M</div>
          {sidebarOpen && <div className="ml-3 font-black text-white italic tracking-tighter">MESEIKPA</div>}
        </div>
        <nav className="flex-1 py-6 space-y-2 px-3 overflow-y-auto custom-scrollbar">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-white/5'}`}>
            <LayoutDashboard size={20} className={sidebarOpen ? 'mr-3' : 'mx-auto'} />
            {sidebarOpen && <span className="font-semibold text-xs uppercase tracking-wider">Dashboard</span>}
          </button>
          <div className="py-2"><div className="h-px bg-white/10 w-full opacity-30"></div></div>
          <button onClick={() => setActiveTab('rpd')} className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${activeTab === 'rpd' ? 'bg-orange-600 text-white shadow-lg' : 'hover:bg-white/5'}`}>
            <Edit3 size={20} className={sidebarOpen ? 'mr-3' : 'mx-auto'} />
            {sidebarOpen && <span className="font-semibold text-xs uppercase tracking-wider">Entri RPD</span>}
          </button>
          <button onClick={() => setActiveTab('realisasi')} className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${activeTab === 'realisasi' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5'}`}>
            <Activity size={20} className={sidebarOpen ? 'mr-3' : 'mx-auto'} />
            {sidebarOpen && <span className="font-semibold text-xs uppercase tracking-wider">Entri Realisasi</span>}
          </button>
          <div className="py-2"><div className="h-px bg-white/10 w-full opacity-30"></div></div>
          <button onClick={() => setActiveTab('rapat')} className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${activeTab === 'rapat' ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-white/5'}`}>
            <PieChart size={20} className={sidebarOpen ? 'mr-3' : 'mx-auto'} />
            {sidebarOpen && <span className="font-black text-xs uppercase tracking-widest">Rekapitulasi</span>}
          </button>
          <button onClick={() => setActiveTab('migrasi')} className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${activeTab === 'migrasi' ? 'bg-slate-700 text-white' : 'hover:bg-white/5'}`}>
            <FileUp size={20} className={sidebarOpen ? 'mr-3' : 'mx-auto'} />
            {sidebarOpen && <span className="font-semibold text-xs uppercase tracking-wider">Migrasi DIPA</span>}
          </button>
          <button onClick={() => setActiveTab('users')} className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-rose-600 text-white shadow-lg' : 'hover:bg-white/5'}`}>
              <Users size={20} className={sidebarOpen ? 'mr-3' : 'mx-auto'} />
              {sidebarOpen && <span className="font-semibold text-xs uppercase tracking-wider">Manajemen User</span>}
          </button>
        </nav>
        <div className="p-4 border-t border-white/5">
           <div className={`flex items-center gap-3 text-slate-500 px-3 py-3 ${sidebarOpen ? '' : 'justify-center'}`}>
              <ShieldHalf size={20} />
              {sidebarOpen && <span className="text-[9px] font-black uppercase tracking-widest">v4.0 Cloud</span>}
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><Menu size={20} /></button>
            <h2 className="font-black text-slate-800 text-[13px] uppercase tracking-widest italic flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              {activeTab === 'dashboard' ? 'Panel Performa' : activeTab === 'rapat' ? 'Ringkasan Rekapitulasi' : 'Administrator'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end mr-2">
               <span className="text-[10px] font-black text-slate-800 uppercase mb-1 leading-none">BPS Kab. Seram Bagian Barat</span>
               <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter italic">Mode: Administrator Akses Penuh</span>
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
                  ].map((card, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative group hover:shadow-xl transition-all">
                       <div className="flex items-center justify-between mb-4">
                          <div className={`p-3 bg-${card.color}-100 text-${card.color}-600 rounded-2xl`}><card.icon size={24} /></div>
                       </div>
                       <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{card.label}</h4>
                       <div className="text-xl font-black text-slate-800 tracking-tighter italic">Rp {formatMoney(card.val)}</div>
                    </div>
                  ))}
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-7 bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm">
                     <div className="flex items-center justify-between mb-10">
                        <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tighter leading-none">Grafik Performa Triwulanan (RPD vs REAL)</h3>
                        <TrendingUp className="text-indigo-500" />
                     </div>
                     <div className="h-[300px] flex items-end justify-around gap-10 px-4">
                        {globalStats.tw.map((tw, i) => (
                           <div key={i} className="flex-1 flex flex-col items-center group">
                              <div className="flex gap-2 items-end h-full w-full">
                                 <div className="flex-1 bg-orange-200 rounded-t-xl relative group-hover:bg-orange-300 transition-all shadow-inner" style={{ height: `${(tw.rpd / (globalStats.pagu / 2 || 1)) * 100}%` }}>
                                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] py-1 px-2 rounded-lg whitespace-nowrap z-20 shadow-xl">RPD: {formatMoney(tw.rpd)}</div>
                                 </div>
                                 <div className="flex-1 bg-blue-500 rounded-t-xl relative shadow-lg shadow-blue-500/20 group-hover:bg-blue-600 transition-all" style={{ height: `${(tw.real / (globalStats.pagu / 2 || 1)) * 100}%` }}>
                                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] py-1 px-2 rounded-lg whitespace-nowrap z-20 shadow-xl">REAL: {formatMoney(tw.real)}</div>
                                 </div>
                              </div>
                              <div className="mt-4 text-[11px] font-black text-slate-800 tracking-widest uppercase">TW {i === 0 ? 'I' : i === 1 ? 'II' : i === 2 ? 'III' : 'IV'}</div>
                           </div>
                        ))}
                     </div>
                  </div>
                  <div className="lg:col-span-5 bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm flex flex-col">
                     <h3 className="text-lg font-black text-slate-800 uppercase italic mb-8">Peringkat Realisasi RO</h3>
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
               
               {/* BARIS 0: INPUT DATA KPPN (PATOKAN) */}
               <div className="bg-slate-900 rounded-[3rem] p-8 shadow-2xl border border-white/10 text-white">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg"><Settings2 size={24} /></div>
                     <div>
                        <h3 className="text-lg font-black uppercase italic leading-tight">Konfigurasi Patokan Data KPPN</h3>
                        <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">Target RPD dan Realisasi resmi dari KPPN</p>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                     <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-orange-400 mb-2 tracking-widest"><Target size={14} /> Target RPD KPPN Per TW</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                           {['TW1', 'TW2', 'TW3', 'TW4'].map(tw => (
                              <div key={tw} className="flex flex-col">
                                 <label className="text-[9px] font-black uppercase mb-1 opacity-50">{tw}</label>
                                 <input type="number" value={kppnMetrics.rpd?.[tw] || ""} onChange={(e) => handleUpdateKPPN('rpd', tw, e.target.value)} 
                                    className="no-spinner bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-black outline-none focus:bg-white/10 focus:border-orange-500 transition-all text-orange-300" placeholder="0" />
                              </div>
                           ))}
                        </div>
                     </div>
                     <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-400 mb-2 tracking-widest"><Activity size={14} /> Realisasi Anggaran KPPN Per TW</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                           {['TW1', 'TW2', 'TW3', 'TW4'].map(tw => (
                              <div key={tw} className="flex flex-col">
                                 <label className="text-[9px] font-black uppercase mb-1 opacity-50">{tw}</label>
                                 <input type="number" value={kppnMetrics.real?.[tw] || ""} onChange={(e) => handleUpdateKPPN('real', tw, e.target.value)} 
                                    className="no-spinner bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-black outline-none focus:bg-white/10 focus:border-blue-500 transition-all text-blue-300" placeholder="0" />
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>

               {/* BARIS 1: KARTU RPD DAN REALISASI */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* KARTU RPD */}
                  <div className="bg-orange-600 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Target size={120} /></div>
                     <div className="flex items-center justify-between mb-8">
                        <span className="text-xs font-black uppercase tracking-[0.3em] opacity-80 italic block">Penyandingan Target RPD</span>
                        <ArrowRightLeft size={20} className="opacity-50" />
                     </div>
                     
                     <div className="grid grid-cols-1 gap-6 relative z-10">
                        {globalStats.tw.map((tw, i) => {
                           const kppnVal = Number(kppnMetrics.rpd?.[`TW${i+1}`]) || 0;
                           const achievement = kppnVal > 0 ? (tw.rpd / kppnVal * 100).toFixed(1) : "0";
                           return (
                              <div key={i} className="flex items-center justify-between border-b border-white/10 pb-4 last:border-0 last:pb-0">
                                 <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase opacity-60">Triwulan {i+1}</span>
                                    <div className="flex items-baseline gap-4 mt-1">
                                       <div className="flex flex-col">
                                          <span className="text-[9px] font-black uppercase text-white/40">Internal</span>
                                          <span className="text-2xl font-black italic tracking-tighter">Rp {formatMoney(tw.rpd)}</span>
                                       </div>
                                       <div className="w-[2px] h-8 bg-white/20"></div>
                                       <div className="flex flex-col">
                                          <span className="text-[9px] font-black uppercase text-white/40">Patokan KPPN</span>
                                          <span className="text-2xl font-black italic tracking-tighter text-orange-200">Rp {formatMoney(kppnVal)}</span>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black uppercase opacity-50">Match</span>
                                    <span className={`text-sm font-black italic ${Number(achievement) >= 90 ? 'text-emerald-300' : 'text-orange-200'}`}>{achievement}%</span>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>

                  {/* KARTU REALISASI */}
                  <div className="bg-blue-600 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Activity size={120} /></div>
                     <div className="flex items-center justify-between mb-8">
                        <span className="text-xs font-black uppercase tracking-[0.3em] opacity-80 italic block">Penyandingan Realisasi KPPN</span>
                        <ArrowRightLeft size={20} className="opacity-50" />
                     </div>

                     <div className="grid grid-cols-1 gap-6 relative z-10">
                        {globalStats.tw.map((tw, i) => {
                           const kppnVal = Number(kppnMetrics.real?.[`TW${i+1}`]) || 0;
                           const diff = tw.real - kppnVal;
                           return (
                              <div key={i} className="flex items-center justify-between border-b border-white/10 pb-4 last:border-0 last:pb-0">
                                 <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase opacity-60">Triwulan {i+1}</span>
                                    <div className="flex items-baseline gap-4 mt-1">
                                       <div className="flex flex-col">
                                          <span className="text-[9px] font-black uppercase text-white/40">Internal</span>
                                          <span className="text-2xl font-black italic tracking-tighter">Rp {formatMoney(tw.real)}</span>
                                       </div>
                                       <div className="w-[2px] h-8 bg-white/20"></div>
                                       <div className="flex flex-col">
                                          <span className="text-[9px] font-black uppercase text-white/40">Realisasi KPPN</span>
                                          <span className="text-2xl font-black italic tracking-tighter text-blue-200">Rp {formatMoney(kppnVal)}</span>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black uppercase opacity-50">Selisih</span>
                                    <span className={`text-sm font-black italic ${diff === 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{formatMoney(diff)}</span>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>
               </div>

               {/* TABLE REKAPITULASI */}
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
                          const sisaPagu = (Number(item.pagu) || 0) - (item.totalRealisasi || 0);
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
                              <td className="px-2 py-1.5 text-right font-black text-blue-800 bg-blue-50/30">{!isNonFinancial ? formatMoney(item.totalRealisasi) : ""}</td>
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
                    <h3 className="text-xl font-black uppercase tracking-widest italic">Konsol Migrasi Cloud</h3>
                    <p className="text-slate-400 mt-1 text-[11px]">Panel sinkronisasi struktur anggaran BPS Kab. Seram Bagian Barat.</p>
                  </div>
                  <div className="p-10 space-y-8">
                    <div className="space-y-4">
                      <div className="ml-11 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-16 text-center hover:border-blue-400 hover:bg-blue-50/20 cursor-pointer transition-all group" onClick={() => fileInputRef.current?.click()}>
                        <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileAnalyze} disabled={isProcessing} className="hidden" />
                        <FileUp size={48} className="mx-auto mb-4 text-slate-300 group-hover:text-blue-500 transition-all" />
                        <span className="text-xs font-black uppercase text-slate-400 italic">Pilih File Excel SAKTI (.xlsx)</span>
                      </div>
                    </div>

                    {previewData.length > 0 && (
                      <div className="space-y-6 animate-in zoom-in-95 duration-300">
                        <div className="ml-11 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="text-[9px] text-slate-400 font-black uppercase block mb-1">Struktur Baru</span>
                            <span className="text-xl font-black text-slate-800">{previewData.length}</span>
                          </div>
                          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                            <span className="text-[9px] text-emerald-600 font-black uppercase block mb-1">Isian Terpindah</span>
                            <span className="text-xl font-black text-emerald-700">{migrationStats.match} Rincian</span>
                          </div>
                          <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl">
                            <span className="text-[9px] text-rose-600 font-black uppercase block mb-1">Masuk Penampungan</span>
                            <span className="text-xl font-black text-rose-700">{migrationStats.orphaned} Baris</span>
                          </div>
                        </div>
                        <div className="ml-11 pt-4">
                           <button onClick={executeMigration} disabled={isProcessing} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all">
                              {isProcessing ? 'MEMPROSES MIGRASI...' : <><CheckCircle2 size={16} className="inline mr-2"/> JALANKAN PEMBARUAN</>}
                           </button>
                        </div>
                      </div>
                    )}

                    <div className="pt-8 border-t border-slate-100 space-y-4">
                       <div className="h-32 bg-slate-950 rounded-2xl p-4 overflow-y-auto custom-scrollbar font-mono text-[9px] text-emerald-400 shadow-inner">
                          {logs.map((l, i) => <div key={i} className="py-0.5 border-b border-white/5 last:border-0 opacity-80">{l}</div>)}
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {/* TAB ENTRI RPD / REALISASI */}
          {(activeTab === 'rpd' || activeTab === 'realisasi') && (
            <div className="space-y-6 animate-in fade-in duration-700">
              <div className="flex items-center justify-between px-4 mb-2">
                 <div className="flex items-center gap-3">
                    <button onClick={() => setIsLocked(!isLocked)} className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase shadow-md transition-all ${isLocked ? 'bg-rose-100 text-rose-700' : 'bg-slate-900 text-white hover:scale-105'}`}>
                      {isLocked ? <Lock size={14} /> : <Unlock size={14} />} {isLocked ? 'Isian Terkunci' : 'Kunci Pengisian'}
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                <div className="xl:col-span-5 bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-200 flex items-center gap-6">
                  <div className="flex flex-col gap-3 flex-1">
                    <div className="flex p-1 bg-slate-100 rounded-xl">
                      <button onClick={() => setActiveWilayah("GG")} className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${activeWilayah === "GG" ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>GG (PPIS)</button>
                      <button onClick={() => setActiveWilayah("WA")} className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${activeWilayah === "WA" ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>WA (DMPTTL)</button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ALL_TEAMS.filter(t => activeWilayah === "GG" ? t !== "Umum" : t === "Umum").map(tim => (
                        <button key={tim} onClick={() => setActiveTim(tim)} className={`px-2 py-1 text-[9px] font-bold rounded-lg border transition-all ${activeTim === tim ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}>{tim}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="xl:col-span-7 bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-200 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Target size={20}/></div>
                      <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-black uppercase">Tim Aktif</span><span className="text-sm font-black italic">{activeTim}</span></div>
                   </div>
                   <div className="flex p-1 bg-slate-100 rounded-xl">
                      {[1,2,3,4].map(tw => (
                         <button key={tw} onClick={() => setTwActive(tw)} className={`px-5 py-1.5 text-[10px] font-black rounded-lg transition-all ${twActive === tw ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>TW {tw === 1 ? 'I' : tw === 2 ? 'II' : tw === 3 ? 'III' : 'IV'}</button>
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
                        const isNonFinancial = item.uraian?.toLowerCase().includes('kppn') || item.uraian?.toLowerCase().includes('lokasi');
                        const sisaPagu = activeTab === 'rpd' ? (Number(item.pagu) || 0) - (item.totalRPD || 0) : (Number(item.pagu) || 0) - (item.totalRealisasi || 0);
                        let rowBg = "hover:bg-blue-50/30 transition-all";
                        if (item.level === 1) rowBg = "bg-amber-100/60 font-black";
                        if (item.level === 2) rowBg = "bg-blue-100/40 font-black";
                        if (item.isOrphan) rowBg = "bg-rose-50 italic";
                        return (
                          <tr key={item.id} className={rowBg}>
                            <td className="px-3 py-1.5 border-r border-slate-100 text-slate-400 font-mono italic">{item.kode}</td>
                            <td className="px-4 py-1.5 border-r border-slate-100 font-bold text-slate-800" style={{ paddingLeft: `${(item.level * 10)}px` }}>{item.uraian}</td>
                            <td className="px-3 py-1.5 text-right font-black text-slate-950 border-r border-slate-100">{!isNonFinancial ? formatMoney(item.pagu) : ""}</td>
                            {twMonths[twActive].map((m: string) => (
                                <td key={m} className="px-0 py-0 h-full border-r border-slate-100 bg-blue-50/50 group">
                                  {!isNonFinancial && (
                                    <>
                                      {item.isDetail ? (
                                        <input type="number" value={activeTab === 'rpd' ? (item.rpd?.[m] || "") : (item.realisasi?.[m] || "")} readOnly={isLocked}
                                          onChange={async (e) => { if(isLoggedIn && !isLocked) { const f = activeTab === 'rpd' ? 'rpd' : 'realisasi'; const ex = activeTab === 'rpd' ? (item.rpd || {}) : (item.realisasi || {});
                                              await updateDoc(doc(db, 'artifacts', APP_IDENTIFIER, 'public', 'data', DATA_COLLECTION, item.id), { [f]: { ...ex, [m]: e.target.value } }); }
                                          }} className="no-spinner w-full h-full text-right px-2 py-1.5 outline-none font-bold font-sans text-[10px] bg-teal-400 text-slate-900 placeholder-slate-700 focus:bg-teal-300 transition-all shadow-inner" placeholder="0" />
                                      ) : (<div className="text-right px-2 py-2 text-slate-950 font-black italic">{formatMoney(activeTab === 'rpd' ? item.monthRPD?.[m] : item.monthReal?.[m])}</div>)}
                                    </>
                                  )}
                                </td>
                              ))}
                              <td className="px-3 py-1.5 text-right font-black bg-slate-100/50 text-slate-950">{!isNonFinancial ? formatMoney(activeTab === 'rpd' ? item.totalRPD : item.totalRealisasi) : ""}</td>
                            <td className={`px-3 py-1.5 text-right font-black border-r border-slate-100 ${sisaPagu < 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-950'}`}>{!isNonFinancial ? formatMoney(sisaPagu) : ""}</td>
                            <td className="px-2 py-2 text-center">
                               {item.isOrphan && (
                                 <button onClick={async () => await deleteDoc(doc(db, 'artifacts', APP_IDENTIFIER, 'public', 'data', DATA_COLLECTION, item.id))} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg"><Trash2 size={14}/></button>
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
                  <h3 className="text-2xl font-black uppercase italic mb-10 flex items-center gap-4">
                     <UserPlus className="text-blue-500" /> Registrasi Pegawai & Kredensial Baru
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     <div className="space-y-3">
                        <label className="text-[9px] font-black uppercase text-slate-500 ml-2 tracking-widest">Username Login</label>
                        <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:bg-white/10" placeholder="ex: budi.setiawan" />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[9px] font-black uppercase text-slate-500 ml-2 tracking-widest">Password Default</label>
                        <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:bg-white/10" placeholder="••••••••" />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[9px] font-black uppercase text-slate-500 ml-2 tracking-widest">Nama Lengkap Pegawai</label>
                        <input type="text" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:bg-white/10" placeholder="Nama..." />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[9px] font-black uppercase text-slate-500 ml-2 tracking-widest">Peran Sistem</label>
                        <select value={newUserRole} onChange={(e:any) => setNewUserRole(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm outline-none">
                           <option value="ketua_tim" className="text-black">Ketua Tim</option>
                           <option value="pimpinan" className="text-black">Pimpinan</option>
                           <option value="admin" className="text-black">Administrator Utama</option>
                        </select>
                     </div>
                     <div className="lg:col-span-2 space-y-3">
                        <label className="text-[9px] font-black uppercase text-slate-500 ml-2 tracking-widest">Penugasan Tim</label>
                        <div className="flex flex-wrap gap-2">
                           {ALL_TEAMS.map(t => (
                              <button key={t} onClick={() => setNewUserTeam(t)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black border transition-all ${newUserTeam === t ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
                                 {t}
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>
                  
                  <button onClick={handleAddUser} className="mt-12 px-14 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all">Simpan Akun Pegawai</button>
               </div>
               
               <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                     <thead className="bg-slate-50 border-b border-slate-100 uppercase text-[9px] font-black text-slate-400">
                        <tr><th className="px-8 py-4">Nama Pegawai</th><th className="px-4 py-4">Username</th><th className="px-4 py-4">Tim</th><th className="px-4 py-4">Role</th><th className="px-4 py-4 text-center">Hapus</th></tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {allUsers.map((u, i) => (
                           <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="px-8 py-5 font-bold text-slate-800">{u.name}</td>
                              <td className="px-4 py-5 font-mono text-[10px] text-blue-600 italic">@{u.username}</td>
                              <td className="px-4 py-5 font-black text-slate-800 uppercase tracking-tighter">Tim {u.team}</td>
                              <td className="px-4 py-5"><span className={`px-3 py-1 rounded-full font-black text-[9px] uppercase ${u.role === 'admin' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span></td>
                              <td className="px-4 py-5 text-center">
                                 <button onClick={async () => await deleteDoc(doc(db, 'artifacts', APP_IDENTIFIER, 'public', 'data', USER_COLLECTION, u.id))} className="p-2 text-rose-400 hover:bg-rose-100 rounded-lg transition-all"><Trash2 size={14}/></button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}
        </div>
        <footer className="bg-white border-t border-slate-200 py-3 px-8 text-center">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">© 2026 BPS Kab. Seram Bagian Barat - Internal Cloud Access</p>
        </footer>
      </main>

      {showClearDataModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-sm p-10 text-center border border-slate-200 animate-in zoom-in duration-200">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6"><AlertTriangle size={32} /></div>
              <h3 className="text-xl font-black text-slate-800 mb-2 italic">Konfirmasi Reset</h3>
              <p className="text-[11px] text-slate-500 mb-10 leading-relaxed italic">Anda akan menghapus seluruh data input <b>{activeTab.toUpperCase()}</b> pada struktur anggaran saat ini. Tindakan ini tidak dapat dibatalkan.</p>
              <div className="flex flex-col gap-3">
                 <button onClick={async () => { 
                   setIsProcessing(true); 
                   const snap = await getDocs(collection(db, 'artifacts', APP_IDENTIFIER, 'public', 'data', DATA_COLLECTION));
                   let batch = writeBatch(db); 
                   const fieldToClear = activeTab === 'rpd' ? 'rpd' : 'realisasi';
                   snap.docs.forEach(d => batch.update(d.ref, { [fieldToClear]: {} }));
                   await batch.commit(); 
                   setIsProcessing(false); 
                   setShowClearDataModal(false); 
                   addLog(`Seluruh data ${activeTab.toUpperCase()} telah dibersihkan.`);
                 }} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-rose-700 transition-all">Ya, Hapus Semua Isian</button>
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