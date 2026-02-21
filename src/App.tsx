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
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { 
  LayoutDashboard, FileUp, Trash2, AlertTriangle, Menu, User,
  Activity, Lock, Unlock, PieChart as PieIcon, Target, Users, UserPlus,
  Edit3, LogOut, Eraser, ShieldHalf, CheckCircle2, LogIn, KeyRound, Search,
  Filter, Eye, EyeOff, CalendarDays, TrendingUp, ClipboardCheck, Info
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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
    real51: { TW1: 0, TW2: 0, TW3: 0, TW4: 0, Jan: 0, Feb: 0, Mar: 0, Apr: 0, Mei: 0, Jun: 0, Jul: 0, Ags: 0, Sep: 0, Okt: 0, Nov: 0, Des: 0 },
    real52: { TW1: 0, TW2: 0, TW3: 0, TW4: 0, Jan: 0, Feb: 0, Mar: 0, Apr: 0, Mei: 0, Jun: 0, Jul: 0, Ags: 0, Sep: 0, Okt: 0, Nov: 0, Des: 0 },
    real53: { TW1: 0, TW2: 0, TW3: 0, TW4: 0, Jan: 0, Feb: 0, Mar: 0, Apr: 0, Mei: 0, Jun: 0, Jul: 0, Ags: 0, Sep: 0, Okt: 0, Nov: 0, Des: 0 },
    isLocked: false,
    revisiKe: "DIPA AWAL"
  });
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rpd' | 'realisasi' | 'rapat' | 'migrasi' | 'users' | 'capaian'>('dashboard');
  const [activeWilayah, setActiveWilayah] = useState<string>("GG");
  const [activeTim, setActiveTim] = useState<string>("Nerwilis");
  const [rapatDepth, setRapatDepth] = useState<number>(2);
  const [auditFilter, setAuditFilter] = useState<'all' | 'aman' | 'meleset' | 'anomali'>('all'); // State baru
  const [twActive, setTwActive] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  // const [, setLogs] = useState<string[]>([]); 
  const [libReady, setLibReady] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]); 
  const [migrationStats, setMigrationStats] = useState({ match: 0, new: 0, orphaned: 0 });
  const [isLocked, setIsLocked] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  
  // Fitur Rekap Bulanan State
  const [expandedMonthlyRPD, setExpandedMonthlyRPD] = useState<Record<string, boolean>>({});
  const [rekapPeriod, setRekapPeriod] = useState<string>(allMonths[new Date().getMonth()]);

  // Monitoring GAP Monthly Filter - Diisolasi hanya untuk Capaian Output
  const [selectedMonthGap, setSelectedMonthGap] = useState<string>("");

  // State Password Visibility
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newUserRole, setNewUserRole] = useState<'admin' | 'pimpinan' | 'ketua_tim'>('ketua_tim');
  const [newUserTeam, setNewUserTeam] = useState("Nerwilis");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRPDRef = useRef<HTMLInputElement>(null);
  const allMonths = useMemo(() => ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'], []);
  const [rekapPeriod, setRekapPeriod] = useState<string>(allMonths[new Date().getMonth()]);

  const twMonths: Record<number, string[]> = {
    1: ['Jan', 'Feb', 'Mar'], 2: ['Apr', 'Mei', 'Jun'],
    3: ['Jul', 'Ags', 'Sep'], 4: ['Okt', 'Nov', 'Des']
  };
  // const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  // Efek Otomatis Set Tim Berdasarkan Profil User
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      setActiveTim(currentUser.team);
      if (currentUser.team === "Umum") setActiveWilayah("WA");
      else setActiveWilayah("GG");
    }
  }, [currentUser]);

  // Enhanced Excel & PDF Loader
  useEffect(() => {
    // 1. Loader Dasar
    if (!(window as any).XLSX) {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      script.onload = () => setLibReady(true);
      document.head.appendChild(script);
    } else { setLibReady(true); }

    // 2. Loader untuk Excel Rapi (ExcelJS)
    const scriptExcelJS = document.createElement('script');
    scriptExcelJS.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js";
    document.head.appendChild(scriptExcelJS);

    // 3. Loader untuk Download File (FileSaver)
    const scriptFileSaver = document.createElement('script');
    scriptFileSaver.src = "https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js";
    document.head.appendChild(scriptFileSaver);
  }, []);

  // Firebase Init & Auth Bootstrap
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
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setFbUser(u);
      
      if (u) {
        try {
          const userSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', USER_COLLECTION));
          if (userSnap.empty) {
            const adminId = crypto.randomUUID();
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', USER_COLLECTION, adminId), {
              uid: adminId,
              username: "admin",
              password: "123",
              name: "Administrator Utama",
              role: "admin",
              team: "Umum",
              createdAt: new Date()
            });
          }
        } catch (e) { console.error("Bootstrap admin error", e); }
      }

      const savedUser = localStorage.getItem(`meseikpa_session_${appId}`);
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
      
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync
  useEffect(() => {
    if (!fbUser || !currentUser) return;

    const unsubUsers = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', USER_COLLECTION)),
      (snap) => setAllUsers(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
      (err) => console.error("Sinkronisasi user gagal:", err)
    );

    const unsubKppn = onSnapshot(
      doc(db, 'artifacts', appId, 'public', 'data', METRICS_COLLECTION, 'kppn_global'),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setKppnMetrics(d);
          setIsLocked(!!d.isLocked);
        }
      },
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
  }, [fbUser, currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsProcessing(true);

    if (!fbUser) {
        setLoginError("Koneksi ke server belum siap. Tunggu sebentar...");
        setIsProcessing(false);
        return;
    }

    try {
  // PAKSA SESI HANGUS SAAT BROWSER DITUTUP
  const auth = getAuth();
  await setPersistence(auth, browserSessionPersistence);

  const qUser = query(
    collection(db, 'artifacts', appId, 'public', 'data', USER_COLLECTION),
    where("username", "==", loginUsername.trim().toLowerCase()),
    limit(1)
  );
      
      const snap = await getDocs(qUser);
      if (snap.empty) {
        setLoginError("Username tidak terdaftar.");
      } else {
        const userData = snap.docs[0].data();
        if (userData.password === loginPassword) {
          setCurrentUser(userData);
          localStorage.setItem(`meseikpa_session_${appId}`, JSON.stringify(userData));
        } else {
          setLoginError("Password salah.");
        }
      }
    } catch (err: any) {
      setLoginError("Terjadi kesalahan sistem login.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(`meseikpa_session_${appId}`);
    setLoginUsername("");
    setLoginPassword("");
    setLoginError("");
    setActiveTab('dashboard');
  };

  const handleExportExcel = async () => {
    const ExcelJS = (window as any).ExcelJS;
    if (!ExcelJS) { alert("Sistem Excel belum siap, tunggu sebentar..."); return; }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(activeTab.toUpperCase());

    const columns = [
      { header: 'KODE', key: 'kode', width: 15 },
      { header: 'URAIAN', key: 'uraian', width: 50 },
      { header: 'PAGU DIPA', key: 'pagu', width: 20 },
    ];
    
    twMonths[twActive].forEach(m => columns.push({ header: m, key: m, width: 15 }));
    columns.push({ header: 'TOTAL', key: 'total', width: 20 });
    columns.push({ header: 'SISA', key: 'sisa', width: 20 });

    worksheet.columns = columns;

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    finalDisplay.forEach(item => {
      const isInduk = item.uraian?.toLowerCase().includes('kppn') || item.uraian?.toLowerCase().includes('lokasi');
      const currentTotal = activeTab === 'rpd' ? item.totalRPD : item.totalReal;
      const sisa = (Number(item.pagu) || 0) - currentTotal;

      const rowData: any = {
        kode: item.kode,
        uraian: item.uraian,
        pagu: isInduk ? null : Number(item.pagu),
        total: isInduk ? null : currentTotal,
        sisa: isInduk ? null : sisa
      };

      twMonths[twActive].forEach(m => {
        rowData[m] = isInduk ? null : Number(activeTab === 'rpd' ? (item.rpd?.[m] || 0) : (item.realisasi?.[m] || 0));
      });

      const row = worksheet.addRow(rowData);
      if (item.level === 1) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
      if (item.level === 2) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } };
    });

    // BAGIAN ANTI-ERROR TS (Sudah diperbaiki)
    worksheet.eachRow((row: any) => {
      row.eachCell((cell: any, colNumber: number) => {
        if (colNumber >= 3 && cell.value !== null) {
          cell.numFmt = '#,##0';
        }
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    (window as any).saveAs(new Blob([buffer]), `Laporan_${activeTab}_TW${twActive}_${new Date().toLocaleDateString('id-ID')}.xlsx`);
  };
  const handleExportRekapFull = async () => {
    const ExcelJS = (window as any).ExcelJS;
    if (!ExcelJS) { alert("Sistem Excel belum siap..."); return; }
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('REKAP_AUDIT');
    const columns = [
      { header: 'KODE', key: 'kode', width: 15 },
      { header: 'URAIAN', key: 'uraian', width: 50 },
      { header: 'PAGU DIPA', key: 'pagu', width: 20 },
    ];
    allMonths.forEach(m => columns.push({ header: `RPD ${m.toUpperCase()}`, key: `rpd_${m}`, width: 15 }));
    allMonths.forEach(m => columns.push({ header: `REAL ${m.toUpperCase()}`, key: `real_${m}`, width: 15 }));
    columns.push({ header: 'TOTAL RPD', key: 'totalRPD', width: 20 }, { header: 'TOTAL REAL', key: 'totalReal', width: 20 }, { header: 'DEV %', key: 'deviasi', width: 15 });
    worksheet.columns = columns;
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
    finalDisplay.forEach((item: any) => {
      const isInduk = item.uraian?.toLowerCase().includes('kppn') || item.uraian?.toLowerCase().includes('lokasi');
      const dev = item.totalRPD > 0 ? ((item.totalReal - item.totalRPD) / item.totalRPD * 100) : 0;
      const rowData: any = { kode: item.kode, uraian: item.uraian, pagu: isInduk ? null : Number(item.pagu), totalRPD: isInduk ? null : item.totalRPD, totalReal: isInduk ? null : item.totalReal, deviasi: isInduk ? null : Number(dev.toFixed(2)) };
      allMonths.forEach(m => {
        rowData[`rpd_${m}`] = isInduk ? null : Number(item.monthRPD?.[m] || 0);
        rowData[`real_${m}`] = isInduk ? null : Number(item.monthReal?.[m] || 0);
      });
      const row = worksheet.addRow(rowData);
      if (item.level === 1) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
    });
    worksheet.eachRow((row: any) => {
      row.eachCell((cell: any) => { 
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; 
      });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    (window as any).saveAs(new Blob([buffer]), `BACKUP_MESE_REKAP_${new Date().getTime()}.xlsx`);
  };  
  const handleImportExcel = async (e: any) => {
    const file = e.target.files?.[0];
    const XLSX = (window as any).XLSX;
    if (!file || !XLSX) return;

    if (!window.confirm("Apakah Anda yakin ingin memperbarui database berdasarkan file Excel ini? Data lama akan tertimpa.")) {
       e.target.value = ""; return;
    }

    const reader = new FileReader();
    reader.onload = async (evt: any) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        let updateCount = 0;
        const batch = writeBatch(db);
        const colRef = collection(db, 'artifacts', appId, 'public', 'data', DATA_COLLECTION);
        const fieldName = activeTab === 'rpd' ? 'rpd' : 'realisasi';

        // Cari index kolom bulan di Excel (Mulai dari Januari s.d Desember)
        const headers = rawData[0];
        const monthColumns: any = {};
        allMonths.forEach(m => {
           const idx = headers.indexOf(m);
           if (idx !== -1) monthColumns[m] = idx;
        });

        // Ambil data dari database untuk dicocokkan kodenya
        const snap = await getDocs(colRef);
        
        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          const kodeExcel = String(row[0] || "").trim();
          if (!kodeExcel) continue;

          const docMatch = snap.docs.find(d => d.data().kode === kodeExcel);
          if (docMatch) {
            const currentData = docMatch.data()[fieldName] || {};
            const newData = { ...currentData };
            
            // Masukkan angka dari Excel ke data bulan yang sesuai
            Object.keys(monthColumns).forEach(m => {
               const val = row[monthColumns[m]];
               if (val !== undefined && val !== null && !isNaN(val)) {
                 newData[m] = String(val).replace(/\D/g, "");
               }
            });

            batch.update(docMatch.ref, { [fieldName]: newData });
            updateCount++;
          }
        }

        await batch.commit();
        alert(`Berhasil! ${updateCount} baris data ${activeTab.toUpperCase()} telah diperbarui.`);
      } catch (err) {
        alert("Gagal membaca file. Pastikan format kolom KODE tidak berubah.");
      }
      e.target.value = "";
    };
    reader.readAsArrayBuffer(file);
  };

  // --- LOGIKA GLOBAL STATS ---
  const globalStats = useMemo(() => {
    const stats: any = {
        pagu: 0, rpd: 0, real: 0,
        pagu51: 0, pagu52: 0, pagu53: 0,
        real51: 0, real52: 0, real53: 0,
        rpd51: 0, rpd52: 0, rpd53: 0,
        outputTarget: 0, outputReal: 0, outputCount: 0,
        gapCount: 0,
        anomaliList: [],
        avgFisik: 0,
        avgAnggaran: 0,
        avgTarget: 0,
        activeMonth: "",
        months: allMonths.reduce((acc: any, m) => {
          acc[m] = { name: m, rpd: 0, real: 0, rpd51:0, real51:0, rpd52:0, real52:0, rpd53:0, real53:0 };
          return acc;
        }, {}),
        tw: [0,1,2,3].map(() => ({ rpd: 0, real: 0, rpd51:0, real51:0, rpd52:0, real52:0, rpd53:0, real53:0 }))
    };

    const details = dataTampil.filter(d => !d.isOrphan && getLevel(d.kode) === 8);
    details.forEach(d => {
      const p = Number(d.pagu) || 0;
      const r = sumMapValues(d.realisasi);
      const rp = sumMapValues(d.rpd);
      const acc = (d.tempPathKey || "").split("|")[6] || "";

      stats.pagu += p; stats.real += r; stats.rpd += rp;

      const is51 = acc.startsWith("51");
      const is52 = acc.startsWith("52");
      const is53 = acc.startsWith("53");

      if (is51) { stats.pagu51 += p; stats.real51 += r; stats.rpd51 += rp; }
      else if (is52) { stats.pagu52 += p; stats.real52 += r; stats.rpd52 += rp; }
      else if (is53) { stats.pagu53 += p; stats.real53 += r; stats.rpd53 += rp; }

      allMonths.forEach((m, idx) => {
        const valRPD = (Number(d.rpd?.[m]) || 0);
        const valReal = (Number(d.realisasi?.[m]) || 0);
        
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

    const outputs = dataTampil.filter(d => getLevel(d.kode) === 4);
    
    // Perbaikan: Gunakan bulan berjalan (Februari) sebagai default jika belum pilih bulan
    let targetMonth = selectedMonthGap;
    if (!targetMonth) {
        const currentMonthIdx = new Date().getMonth(); 
        targetMonth = allMonths[currentMonthIdx];
    }
    if (!targetMonth) targetMonth = "Jan";
    stats.activeMonth = targetMonth;
    const mIdx = allMonths.indexOf(targetMonth);

    let sumFisik = 0, sumAnggaran = 0, sumTarget = 0, roCount = 0;

    outputs.forEach(o => {
      let roPagu = 0, roRealKeu = 0;
      const bIdx = dataTampil.findIndex(d => d.id === o.id);
      for (let i = bIdx + 1; i < dataTampil.length; i++) {
        const next = dataTampil[i];
        if (next.kode !== "" && getLevel(next.kode) <= 4) break;
        if (getLevel(next.kode) === 8) {
          roPagu += (Number(next.pagu) || 0);
          for (let j = 0; j <= mIdx; j++) {
            roRealKeu += (Number(next.realisasi?.[allMonths[j]]) || 0);
          }
        }
      }

      const pctAnggaran = roPagu > 0 ? (roRealKeu / roPagu * 100) : 0;
      const pctFisik = Number(o.realCapaian?.[targetMonth]) || 0;
      const pctTarget = Number(o.targetCapaian?.[targetMonth]) || 0;

      const gapFisikKeu = pctFisik - pctAnggaran;
      const gapFisikTarget = pctFisik - pctTarget;

      if (Math.abs(gapFisikKeu) >= 20 || Math.abs(gapFisikTarget) >= 20) {
        stats.gapCount++;
        stats.anomaliList.push({
            kode: o.kode,
            uraian: o.uraian,
            fisik: pctFisik,
            anggaran: pctAnggaran,
            target: pctTarget,
            gapFisikKeu,
            gapFisikTarget
        });
      }

      sumFisik += pctFisik;
      sumAnggaran += pctAnggaran;
      sumTarget += pctTarget;
      roCount++;
    });

    stats.avgFisik = roCount > 0 ? sumFisik / roCount : 0;
    stats.avgAnggaran = roCount > 0 ? sumAnggaran / roCount : 0;
    stats.avgTarget = roCount > 0 ? sumTarget / roCount : 0;
    stats.outputCount = roCount;

    return stats;
  }, [dataTampil, allMonths, selectedMonthGap]);

  const deviasiKPPN = useMemo(() => {
    const totalPagu = globalStats.pagu || 1;
    let akumulasiSkorBulanan = 0;
    
    // KUNCI: Menentukan sampai bulan apa hitungan dilakukan
    // Kita ambil bulan saat ini (Februari = index 1)
    const currentMonthIdx = new Date().getMonth(); 
    const monthsToCalculate = allMonths.slice(0, currentMonthIdx + 1); 

    monthsToCalculate.forEach((m) => {
      const mData = globalStats.months[m];
      const getMDev = (real: number, rpd: number, pagu: number) => {
        if (rpd <= 0) return 0;
        return (Math.abs(real - rpd) / rpd) * (pagu / totalPagu);
      };

      const skorBulanIni = (
        getMDev(mData.real51, mData.rpd51, globalStats.pagu51) +
        getMDev(mData.real52, mData.rpd52, globalStats.pagu52) +
        getMDev(mData.real53, mData.rpd53, globalStats.pagu53)
      ) * 100;

      akumulasiSkorBulanan += skorBulanIni;
    });

    // Pembagi hanya berdasarkan jumlah bulan yang sudah dilewati (Jan & Feb)
    const jumlahBulanBerjalan = monthsToCalculate.length;
    return jumlahBulanBerjalan > 0 ? (akumulasiSkorBulanan / jumlahBulanBerjalan) : 0;
  }, [globalStats, allMonths]);

  const handleUpdateKPPN = (category: string, period: string, value: string) => {
    const cleanValue = value.replace(/\D/g, "");
    setKppnMetrics((prev: any) => ({
      ...prev,
      [category]: { ...prev[category], [period]: cleanValue }
    }));
  };

  const saveKppnGlobal = async () => {
    if (!fbUser || currentUser?.role !== 'admin') return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', METRICS_COLLECTION, 'kppn_global');
      await setDoc(docRef, kppnMetrics, { merge: true });
    } catch (e:any) {
      console.error("Gagal menyimpan data KPPN.");
    }
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
        uid: userId,
        username: newUsername.trim().toLowerCase(),
        password: newPassword,
        name: newFullName,
        role: newUserRole,
        team: newUserTeam,
        createdAt: new Date()
      });
      setNewUsername(""); setNewPassword(""); setNewFullName("");
    } catch (e: any) { console.error("Gagal: " + e.message); }
    finally { setIsProcessing(false); }
  };

  const handleChangeUserPassword = async (id: string, newPass: string) => {
    if (!id || !newPass || !fbUser || currentUser?.role !== 'admin') return;
    try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', USER_COLLECTION, id), { password: newPass });
    } catch (e: any) { console.error(e); }
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
        setPreviewData([]); setActiveTab('dashboard');
    } catch (e: any) { console.error(e); } finally { setIsProcessing(false); }
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

      // RESET: Pastikan semua bulan mulai dari nol (Sesuai Aturan Kode Dasar)
      allMonths.forEach(m => { mRPD[m] = 0; mReal[m] = 0; });

      if (isDetail) {
        // Jika level 8, ambil angka bulanan langsung dari item tersebut
        totalRPD = sumMapValues(item.rpd);
        totalReal = sumMapValues(item.realisasi);
        allMonths.forEach(m => {
          mRPD[m] = Number(item.rpd?.[m]) || 0;
          mReal[m] = Number(item.realisasi?.[m]) || 0;
        });
      } else if (!isInduk) {
        // Jika level atas, jumlahkan rincian bulanan dari semua Level 8 di bawahnya
        for (let i = index + 1; i < base.length; i++) {
            const next = base[i];
            const nLevel = getLevel(next.kode);
            if (next.kode !== "" && nLevel <= level) break;
            if (nLevel === 8 && (Number(next.pagu) || 0) > 0) {
                totalRPD += sumMapValues(next.rpd);
                totalReal += sumMapValues(next.realisasi);
                allMonths.forEach(m => {
                    mRPD[m] += (Number(next.rpd?.[m]) || 0);
                    mReal[m] += (Number(next.realisasi?.[m]) || 0);
                });
            }
        }
      }
      return { ...item, totalRPD, totalReal, monthRPD: mRPD, monthReal: mReal, level, isDetail };
    });

    const calculatedOrphan = orphan.map(item => ({
        ...item, 
        totalRPD: sumMapValues(item.rpd), 
        totalReal: sumMapValues(item.realisasi),
        monthRPD: item.rpd || {}, 
        monthReal: item.realisasi || {},
        level: 8, isDetail: true
    }));

    const allMerged = [...calculatedNormal, ...calculatedOrphan];
    
    // --- PENERAPAN ISOLASI FILTER (Berdasarkan Aturan Kode Dasar) ---
    if (activeTab === 'rapat') {
      // Logika Filter Audit hanya aktif saat di tab Rekapitulasi (Rapat)
      const filteredByAudit = allMerged.filter(item => {
        if (auditFilter === 'all') return true;
        const dev = item.totalRPD > 0 ? Math.abs(((item.totalReal - item.totalRPD) / item.totalRPD) * 100) : 0;
        const hasRealNoRPD = item.totalReal > 0 && item.totalRPD === 0;
        const adaAktivitas = item.totalRPD > 0 || item.totalReal > 0;

        if (auditFilter === 'aman') return adaAktivitas && dev <= 5 && !hasRealNoRPD && item.totalRPD > 0;
        if (auditFilter === 'meleset') return adaAktivitas && dev > 5;
        if (auditFilter === 'anomali') return hasRealNoRPD;
        return true;
      });

      return filteredByAudit.filter(item => item.level <= rapatDepth);
    }
    
    // Logika untuk Tab RPD dan Realisasi (Abaikan Audit Filter)
    const allowed = TIM_MAPPING[activeTim] || [];
    let insideAllowed = false;
    return allMerged.filter((item) => {
      if (item.isOrphan) return true; 
      if (getLevel(item.kode) === 2) insideAllowed = allowed.includes(item.kode);
      return insideAllowed || getLevel(item.kode) === 1; 
    });
  }, [dataTampil, activeWilayah, activeTim, activeTab, rapatDepth, allMonths, auditFilter]);
  
  const finalDisplay = processedData.filter((d) => 
    (d.uraian && d.uraian.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (d.kode && d.kode.includes(searchTerm))
  );

  const capaianOutputData = useMemo(() => {
    const outputItems = dataTampil.filter(d => getLevel(d.kode) === 4);
    
    return outputItems.map((out) => {
      let totalPaguOut = 0;
      let monthlyFinancials: Record<string, { rpd: number, real: number }> = {};
      
      // Inisialisasi monthlyFinancials untuk tiap bulan
      allMonths.forEach(m => monthlyFinancials[m] = { rpd: 0, real: 0 });

      const baseIdx = dataTampil.findIndex(d => d.id === out.id);
      for (let i = baseIdx + 1; i < dataTampil.length; i++) {
        const next = dataTampil[i];
        if (next.kode !== "" && getLevel(next.kode) <= 4) break;
        if (getLevel(next.kode) === 8) {
          const p = (Number(next.pagu) || 0);
          totalPaguOut += p;
          allMonths.forEach(m => {
            monthlyFinancials[m].rpd += (Number(next.rpd?.[m]) || 0);
            monthlyFinancials[m].real += (Number(next.realisasi?.[m]) || 0);
          });
        }
      }

      // Hitung Suggestion (Otomatis)
      const suggestedTarget: Record<string, string> = {};
      const suggestedReal: Record<string, string> = {};

      allMonths.forEach(m => {
        // Logika Target: (RPD / Pagu) atau Minimal 0.5
        const rpdPct = totalPaguOut > 0 ? (monthlyFinancials[m].rpd / totalPaguOut * 100) : 0;
        suggestedTarget[m] = rpdPct > 0 ? rpdPct.toFixed(2) : "0.50";

        // Logika Realisasi: (Realisasi / Pagu)
        const realPct = totalPaguOut > 0 ? (monthlyFinancials[m].real / totalPaguOut * 100) : 0;
        suggestedReal[m] = realPct.toFixed(2);
      });

      return {
        ...out,
        paguOutput: totalPaguOut,
        suggestedTarget, // Data otomatis hasil hitungan
        suggestedReal,   // Data otomatis hasil hitungan
        targetCapaian: out.targetCapaian || {}, 
        realCapaian: out.realCapaian || {}      
      };
    });
  }, [dataTampil, allMonths]);

  const GapMonitoringCard = ({ showDetails = false, isDashboard = false }: { showDetails?: boolean, isDashboard?: boolean }) => {
    const isGapAlert = globalStats.gapCount > 0;
    
    if (isDashboard) {
      return (
        <div className={`bg-white ${isDashboard ? 'p-6' : 'p-8'} rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all h-full flex flex-col`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 ${isGapAlert ? 'bg-rose-50 text-rose-600' : 'bg-violet-50 text-violet-600'} rounded-2xl`}>
                  <ClipboardCheck size={20}/>
                </div>
                <div className="text-right leading-none">
                  <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider">Status {globalStats.activeMonth}</span>
                  <span className={`text-[11px] font-bold ${isGapAlert ? 'text-rose-500' : 'text-violet-500'} italic uppercase`}>Capaian Output</span>
                </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center mb-4 text-center">
                <div className={`text-5xl font-black tracking-tighter italic leading-none ${isGapAlert ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {globalStats.gapCount}
                </div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Perlu Konfirmasi</div>
            </div>
            <div className="space-y-2 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <div className="flex justify-between items-center text-[9px] font-black uppercase"><span className="text-slate-400">Avg. Fisik</span><span className="text-slate-800 font-bold">{globalStats.avgFisik.toFixed(1)}%</span></div>
                <div className="flex justify-between items-center text-[9px] font-black uppercase"><span className="text-slate-400">Avg. Keu</span><span className="text-slate-800 font-bold">{globalStats.avgAnggaran.toFixed(1)}%</span></div>
            </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 w-full animate-in fade-in duration-500">
          {showDetails && (
              <div className="flex flex-wrap gap-1 p-1 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  {allMonths.map(m => (
                      <button 
                        key={m} 
                        onClick={() => setSelectedMonthGap(m)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${globalStats.activeMonth === m ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                          {m}
                      </button>
                  ))}
                  <button onClick={() => setSelectedMonthGap("")} className="px-3 py-1.5 text-[9px] font-black text-slate-300 hover:text-indigo-600 ml-auto uppercase italic underline">Auto</button>
              </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className={`lg:col-span-4 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden`}>
                  <div className="flex justify-between items-start mb-6">
                      <div className={`p-4 ${isGapAlert ? 'bg-rose-50 text-rose-600' : 'bg-violet-50 text-violet-600'} rounded-2xl`}>
                        <ClipboardCheck size={24}/>
                      </div>
                      <div className="text-right leading-none">
                        <span className="text-[10px] font-black text-slate-400 uppercase block tracking-widest">Status {globalStats.activeMonth}</span>
                        <span className={`text-xs font-bold ${isGapAlert ? 'text-rose-500' : 'text-violet-500'} italic uppercase`}>Monitoring GAP</span>
                      </div>
                  </div>
                  <div className="flex flex-col items-center mb-6 text-center">
                      <div className={`text-6xl font-black tracking-tighter italic ${isGapAlert ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {globalStats.gapCount}
                      </div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Perlu Konfirmasi</div>
                  </div>
                  <div className="space-y-3 bg-slate-50 p-5 rounded-[2rem] border border-slate-100">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase"><span className="text-slate-400">Avg. Fisik</span><span className="text-slate-800 font-bold">{globalStats.avgFisik.toFixed(1)}%</span></div>
                      <div className="flex justify-between items-center text-[10px] font-black uppercase"><span className="text-slate-400">Avg. Keu</span><span className="text-slate-800 font-bold">{globalStats.avgAnggaran.toFixed(1)}%</span></div>
                  </div>
              </div>

              <div className="lg:col-span-8 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <h4 className="text-xs font-black uppercase italic text-slate-800 mb-4 flex items-center gap-2">
                    <Info size={14} className="text-indigo-500"/> Output Perlu Konfirmasi ({globalStats.activeMonth})
                  </h4>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2" style={{maxHeight:'220px'}}>
                      {globalStats.anomaliList.length > 0 ? globalStats.anomaliList.map((item: any, idx: number) => (
                          <div key={idx} className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 flex items-center justify-between gap-4 animate-in slide-in-from-right duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                              <div className="min-w-0">
                                  <div className="text-[11px] font-black text-slate-800 truncate">{item.uraian}</div>
                                  <div className="text-[9px] font-bold text-slate-400 font-mono tracking-tighter">{item.kode}</div>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                  <div className="text-center px-3 py-1 bg-white rounded-lg border border-rose-100 shadow-sm">
                                      <span className="block text-[7px] font-black text-slate-400 uppercase leading-none mb-1">GAP KEU</span>
                                      <span className="text-[10px] font-black text-rose-600 italic">{(item.gapFisikKeu).toFixed(1)}%</span>
                                  </div>
                                  <div className="text-center px-3 py-1 bg-white rounded-lg border border-rose-100 shadow-sm">
                                      <span className="block text-[7px] font-black text-slate-400 uppercase leading-none mb-1">GAP TGT</span>
                                      <span className="text-[10px] font-black text-rose-600 italic">{(item.gapFisikTarget).toFixed(1)}%</span>
                                  </div>
                              </div>
                          </div>
                      )) : (
                          <div className="h-full flex flex-col items-center justify-center text-emerald-500 opacity-60 italic">
                              <CheckCircle2 size={32} className="mb-2"/>
                              <span className="text-[10px] font-black uppercase tracking-widest text-center">Semua Output Sinkron pada Bulan Ini</span>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>
    );
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <span className="font-black uppercase tracking-widest text-sm italic">Menghubungkan ke Cloud...</span>
      </div>
    );
  }

  // --- RENDER LOGIN VIEW ---
  // --- RENDER LOGIN VIEW (DESAIN MESE) ---
  if (!currentUser) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F8FAFC] font-sans p-6">
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
           <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden">
              <div className="bg-[#0F172A] p-10 text-center relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full -mr-10 -mt-10 blur-3xl"></div>
                 
                 {/* Tulisan MESE di dalam kotak Biru Gradasi */}
                 <div className="w-40 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] mx-auto flex items-center justify-center text-white font-black text-4xl shadow-xl shadow-blue-500/30 italic tracking-tighter mb-4">
                   MESE
                 </div>

                 <h2 className="text-blue-400 text-[10px] uppercase font-black tracking-[0.3em] mt-1">MonEv SinErgi IKPA</h2>
                 
                 <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest">BPS Kab. Seram Bagian Barat</p>
                 </div>
              </div>
              
              <form onSubmit={handleLogin} className="p-10 space-y-5">
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
                        <input 
                          type="text" 
                          value={loginUsername}
                          onChange={(e) => setLoginUsername(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all" 
                          placeholder="Masukkan username..."
                          required
                        />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Password Access</label>
                    <div className="relative">
                        <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="password" 
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all" 
                          placeholder="••••••••"
                          required
                        />
                    </div>
                 </div>
                 <button 
                   type="submit" 
                   disabled={isProcessing}
                   className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/30 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4"
                 >
                    {isProcessing ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <><LogIn size={18}/> Verifikasi & Masuk</>
                    )}
                 </button>
              </form>
           </div>
           <p className="text-center mt-8 text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-50 italic">Saka Mese Nusa • Integritas Tanpa Batas</p>
        </div>
      </div>
    );
  }

  // --- RENDER MAIN APP VIEW ---
  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
      <aside className={`bg-[#0F172A] text-slate-300 transition-all duration-300 flex flex-col z-40 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-16 flex items-center px-6 bg-slate-900/50 border-b border-white/5">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shrink-0 shadow-lg">M</div>
          {sidebarOpen && <div className="ml-3 font-black text-white italic tracking-tighter leading-tight">MESEIKPA<br/><span className="text-[9px] uppercase tracking-[0.2em] font-bold not-italic text-blue-400">Version 2.0</span></div>}
        </div>
        <nav className="flex-1 py-6 space-y-2 px-3 overflow-y-auto custom-scrollbar">
          <button onClick={() => { setActiveTab('dashboard'); }} className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-white/5'}`}>
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
          <button onClick={() => setActiveTab('capaian')} className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${activeTab === 'capaian' ? 'bg-violet-600 text-white shadow-lg' : 'hover:bg-white/5'}`}>
            <TrendingUp size={20} className={sidebarOpen ? 'mr-3' : ''} />
            {sidebarOpen && <span className="font-semibold text-xs uppercase tracking-wider">Capaian Output</span>}
          </button>
          <div className="py-2"><div className="h-px bg-white/10 w-full opacity-30"></div></div>
          <button onClick={() => setActiveTab('rapat')} className={`w-full flex items-center px-3 py-3 rounded-xl transition-all ${activeTab === 'rapat' ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-white/5'}`}>
            <PieIcon size={20} className={sidebarOpen ? 'mr-3' : ''} />
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
                  {sidebarOpen && <span className="font-semibold text-xs uppercase tracking-wider">Manajemen User</span>}
              </button>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-white/5"> 
                  <div className="px-4 mb-2">
                    <button
                      onClick={() => {
                        const linkTersimpan = localStorage.getItem('urlKertasKerja') || 'https://docs.google.com/spreadsheets/d/1tx4-XDr0VREI0s1s2iyfJ7MOQ-mu4Esixx9B_FFXEQM/edit?usp=sharing';
                        window.open(linkTersimpan, '_blank');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 transition-all rounded-xl group"
                    >
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <Target size={20} />
                      </div>
                      <span className="font-medium text-sm">Kertas Kerja</span>
                    </button>
                  </div>
          <button onClick={handleLogout} className="w-full flex items-center px-3 py-3 rounded-xl hover:bg-rose-600/20 text-rose-400 transition-all">
              <LogOut size={20} className={sidebarOpen ? 'mr-3' : ''} />
              {sidebarOpen && <span className="font-black text-xs uppercase tracking-widest">Logout Sistem</span>}
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
          
          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Cari Uraian atau Kode..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-100 border-none rounded-2xl py-2.5 pl-12 pr-4 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end leading-none">
                <span className="text-[11px] font-black italic text-slate-800">{currentUser.name}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{currentUser.role} • {currentUser.team}</span>
             </div>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg bg-blue-600`}><User size={20} /></div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
              <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                  <div className="z-10">
                      <div className="px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-3 inline-block shadow-lg animate-pulse">
                          Kondisi Terakhir: {kppnMetrics.revisiKe || "DIPA AWAL"}
                      </div>
                      <h1 className="text-3xl font-black text-slate-800 italic tracking-tighter leading-none">MonEv SinErgi IKPA</h1>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-blue-600 font-black uppercase text-[12px] tracking-widest italic">BPS Kab. Seram Bagian Barat</span>
                      </div>
                  </div>
                  <div className="z-10 text-right">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Pagu</span>
                      <div className="text-4xl font-black text-slate-900 tracking-tighter italic">
                          <span className="text-lg text-slate-300 not-italic mr-2">Rp</span>
                          {formatMoney(globalStats.pagu)}
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm group hover:shadow-xl transition-all">
                      <div className="flex justify-between items-start mb-8">
                          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Activity size={24}/></div>
                          <div className="text-right leading-none"><span className="text-[10px] font-black text-slate-400 uppercase block">Penyerapan</span><span className="text-xs font-bold text-emerald-500 italic">Anggaran</span></div>
                      </div>
                      <div className="flex flex-col items-center mb-10">
                          <div className="text-6xl font-black text-slate-800 tracking-tighter italic mb-1">
                            {globalStats.pagu > 0 ? (globalStats.real / globalStats.pagu * 100).toFixed(1) : 0}%
                          </div>
                          <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Realisasi</div>
                      </div>
                      <div className="space-y-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                          {[{l:'51 (Pegawai)', p:globalStats.pagu51, r:globalStats.real51}, {l:'52 (Barang)', p:globalStats.pagu52, r:globalStats.real52}, {l:'53 (Modal)', p:globalStats.pagu53, r:globalStats.real53}].map((it, i) => (
                              <div key={i} className="flex justify-between items-center text-[14px] font-black uppercase">
                                  <span className="text-slate-500">{it.l}</span>
                                  <div className="text-right">
                                      <span className="text-slate-900 italic block">{it.p > 0 ? (it.r/it.p*100).toFixed(1) : 0}%</span>
                                      <span className="text-[9px] text-slate-400">Rp {formatMoney(it.r)}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* KARTU DEVIASI TERTIMBANG (LOGIKA KPPN) */}
                  <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm group hover:shadow-xl transition-all relative overflow-hidden">
                      <div className="flex justify-between items-start mb-8">
                          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Target size={24}/></div>
                          <div className="text-right leading-none">
                            <span className="text-[10px] font-black text-slate-400 uppercase block">Indikator KPPN 2026</span>
                            <span className="text-[11px] font-bold text-emerald-500 italic uppercase">Deviasi Kumulatif</span>
                          </div>
                      </div>
                      
                      <div className="flex flex-col items-center mb-8 text-center">
                          <div className={`text-6xl font-black tracking-tighter italic mb-1 ${deviasiKPPN > 5 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {deviasiKPPN.toFixed(2)}%
                          </div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Rata-Rata Deviasi Kumulatif</div>
                      </div>

                      <div className="space-y-3 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">Proporsi Pagu Satker:</div>
                          <div className="flex justify-between items-center text-[11px] font-black uppercase">
                             <span className="text-slate-500">Belanja 51</span>
                             <span className="text-slate-800">{(globalStats.pagu51/globalStats.pagu*100 || 0).toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-black uppercase">
                             <span className="text-slate-500">Belanja 52</span>
                             <span className="text-slate-800">{(globalStats.pagu52/globalStats.pagu*100 || 0).toFixed(2)}%</span>
                          </div>
                          {globalStats.pagu53 > 0 && (
                            <div className="flex justify-between items-center text-[11px] font-black uppercase pt-1 border-t border-slate-200/50">
                               <span className="text-slate-500">Belanja 53</span>
                               <span className="text-slate-800">{(globalStats.pagu53/globalStats.pagu*100 || 0).toFixed(2)}%</span>
                            </div>
                          )}
                      </div>
                  </div>
                  

                  <GapMonitoringCard isDashboard={true} />
              </div>

              <div className="bg-white p-12 rounded-[4rem] border border-slate-200 shadow-sm">
                  <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter mb-12 flex items-center gap-4">
                      <div className="w-2 h-10 bg-indigo-600 rounded-full"></div>
                      Realisasi Belanja & RPD Hal.III DIPA
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                      {[
  { id: '51', label: 'Belanja Pegawai (51)', code: '51' },
  { id: '52', label: 'Belanja Barang (52)', code: '52' },
  { id: '53', label: 'Belanja Modal (53)', code: '53' }
].map((item) => {
    // 1. Ambil Target KUMULATIF KPPN dari input manual
    const targetKPPNKumulatif = Number(kppnMetrics[`real${item.code}`]?.[`TW${twActive}`]) || 0;
    
    // 2. Identifikasi semua bulan dari awal tahun s.d. akhir TW aktif (Kumulatif)
    const targetMonthIdx = twActive * 3; 
    const cumulativeMonths = allMonths.slice(0, targetMonthIdx);

    // 3. Hitung Realisasi & RPD Kumulatif (Jan s.d. Akhir TW)
    const realKumulatif = cumulativeMonths.reduce((acc, m) => 
      acc + (Number(globalStats.months[m][`real${item.code}`]) || 0), 0);
    
    const rpdKumulatif = cumulativeMonths.reduce((acc, m) => 
      acc + (Number(globalStats.months[m][`rpd${item.code}`]) || 0), 0);

    // 4. Hitung Persentase terhadap Target Kumulatif KPPN
    const pctRealTerhadapKPPN = targetKPPNKumulatif > 0 ? (realKumulatif / targetKPPNKumulatif * 100) : 0;
    
    // 5. Akurasi RPD (Realisasi vs Rencana Internal)
    const deviasiRPD = rpdKumulatif > 0 ? Math.abs(((realKumulatif - rpdKumulatif) / rpdKumulatif) * 100) : 0;

    // Warna otomatis berdasarkan pencapaian
    let statusColor = '#6366f1'; 
    if (pctRealTerhadapKPPN >= 100) statusColor = '#10b981'; 
    else if (pctRealTerhadapKPPN < 70) statusColor = '#f59e0b'; 
    if (pctRealTerhadapKPPN < 40) statusColor = '#e11d48';

    return (
        <div key={item.id} className="flex flex-col items-center bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100 group transition-all hover:bg-white hover:shadow-xl">
            <div className="text-center mb-4">
              <span className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] block">{item.label}</span>
              <span className="text-[12px] font-bold text-indigo-500 uppercase italic">Target KPPN TW {twActive}: Rp {formatMoney(targetKPPNKumulatif)}</span>
            </div>
            
            <div className="h-[240px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        {/* Ring Luar: Rencana Kumulatif (RPD) */}
                        <Pie 
                          data={[
                            { name: 'Rencana Kumulatif', value: Math.min(rpdKumulatif, targetKPPNKumulatif) }, 
                            { name: 'Sisa Target', value: Math.max(0, targetKPPNKumulatif - rpdKumulatif) }
                          ]} 
                          innerRadius={85} outerRadius={95} dataKey="value" 
                          startAngle={90} endAngle={-270} stroke="none"
                        >
                            <Cell fill="#cbd5e1" opacity={0.6} />
                            <Cell fill="transparent" />
                        </Pie>

                        {/* Ring Dalam: Realisasi Kumulatif */}
                        <Pie 
                          data={[
                            { name: 'Realisasi Kumulatif', value: Math.min(realKumulatif, targetKPPNKumulatif) }, 
                            { name: 'Belum Tercapai', value: Math.max(0, targetKPPNKumulatif - realKumulatif) }
                          ]} 
                          innerRadius={65} outerRadius={82} dataKey="value" 
                          startAngle={90} endAngle={-270} stroke="none"
                        >
                            <Cell fill={statusColor} />
                            <Cell fill="#f1f5f9" />
                        </Pie>
                        <Tooltip 
                          formatter={(value: any, name?: string) => [`Rp ${formatMoney(value)}`, name || ""]} 
                        />
                    </PieChart>
                </ResponsiveContainer>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black italic leading-none" style={{ color: statusColor }}>
                      {pctRealTerhadapKPPN.toFixed(1)}%
                    </span>
                    <span className="text-[8px] font-black text-slate-400 uppercase mt-1">S.D TW {twActive}</span>
                </div>
            </div>
<div className="mt-4 w-full p-4 bg-white rounded-[2rem] border border-slate-100 shadow-sm space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">RPD</span>
                    <span className="text-[10px] font-black text-slate-700 italic">Rp {formatMoney(rpdKumulatif)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">Sisa Target RPD</span>
                    <span className="text-[10px] font-black text-slate-800 italic">
                        Rp {formatMoney(Math.max(0, rpdKumulatif - realKumulatif))}
                    </span>
                </div>
            </div>
            <div className="mt-6 w-full space-y-2">
              <div className="flex justify-between items-center px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                <span className="text-[9px] font-black text-slate-400 uppercase">Deviasi RPD</span>
                <span className={`text-[10px] font-black ${deviasiRPD > 5 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {deviasiRPD.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                <span className="text-[9px] font-black text-slate-400 uppercase">Sisa Target KPPN</span>
                <span className="text-[10px] font-black text-slate-700">
                  Rp {formatMoney(Math.max(0, targetKPPNKumulatif - realKumulatif))}
                </span>
              </div>
            </div>
        </div>
    );
})}
                  </div>
              </div>
            </div>
          )}

          {activeTab === 'rapat' && (
            <div className="space-y-8 animate-in fade-in duration-700 pb-20">
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <div className="bg-white p-10 rounded-[4rem] border border-slate-200 shadow-xl relative overflow-hidden">
                    <div className="flex justify-between items-start mb-8">
                        <div className="p-5 bg-emerald-100 text-emerald-600 rounded-[2rem]"><Activity size={32}/></div>
                        <div className="text-right">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Realisasi Anggaran</span>
                            <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest flex items-center justify-end gap-1"><CheckCircle2 size={14}/> Monitoring Triwulan</span>
                        </div>
                    </div>
                    <div className="p-8 bg-emerald-50/40 rounded-[3rem] border border-emerald-100 space-y-6">
                        <div className="flex justify-between items-center border-b border-emerald-200/50 pb-4">
                            <span className="text-sm font-black text-slate-800 uppercase tracking-widest bg-emerald-100 px-5 py-2 rounded-2xl shadow-sm">TW {twActive}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-5">
                           {['51', '52', '53'].map(code => {
                              const sCat = `real${code}`;
                              const realSub = globalStats.tw[twActive - 1][`real${code}` as keyof typeof globalStats.tw[number]];
                              const paguSub = globalStats[`pagu${code}` as keyof typeof globalStats] as number;
                              const targetNominal = Number(kppnMetrics[sCat]?.[`TW${twActive}`]) || 0;
                              const pctReal = paguSub > 0 ? (realSub / paguSub) * 100 : 0;
                              const pctTarget = paguSub > 0 ? (targetNominal / paguSub) * 100 : 0;
                              return (
                                <div key={code} className="grid grid-cols-12 items-center gap-6 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                                    <div className="col-span-4">
                                        <span className="text-xs font-black text-slate-400 uppercase block mb-1">Belanja {code}</span>
                                        <span className={`text-2xl font-black block tracking-tighter ${getDevColorClass(pctReal - pctTarget)}`}>{pctReal.toFixed(1)}% <span className="text-xs text-slate-300">/ {pctTarget.toFixed(1)}%</span></span>
                                    </div>
                                    <div className="col-span-4 text-center border-x border-slate-100 px-2">
                                        <span className="text-[10px] font-black text-slate-300 block mb-1 uppercase">Realisasi Satker</span>
                                        <span className="text-sm font-black text-slate-800 italic">Rp {formatMoney(realSub)}</span>
                                    </div>
                                    <div className="col-span-4">
                                        <span className="text-[10px] font-black text-slate-300 block mb-1 text-right uppercase">Target KPPN (Rp)</span>
                                        <input type="text" value={formatInputMasking(kppnMetrics[sCat]?.[`TW${twActive}`])} readOnly={currentUser.role !== 'admin'} onChange={(e) => handleUpdateKPPN(sCat, `TW${twActive}`, e.target.value)} onBlur={saveKppnGlobal} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-sm font-black text-right outline-none focus:ring-4 focus:ring-emerald-200/50 transition-all" placeholder="0" />
                                    </div>
                                </div>
                              );
                           })}
                        </div>
                    </div>
                  </div>

                  <div className="bg-white p-10 rounded-[4rem] border border-slate-200 shadow-xl overflow-hidden relative group">
                    <div className="flex justify-between items-start mb-8">
                        <div className="p-4 bg-orange-100 text-orange-600 rounded-[2rem]"><Target size={32}/></div>
                        <div className="text-right">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Deviasi Hal III DIPA</span>
                            <span className="text-[11px] font-black text-blue-500 uppercase tracking-widest flex items-center justify-end gap-1"><CheckCircle2 size={14}/> Monitoring Bulanan</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mb-8">
                       <h4 className="text-xl font-black italic text-slate-800 uppercase tracking-tighter">Kesesuaian RPD</h4>
                       <button onClick={() => setExpandedMonthlyRPD(prev => ({ ...prev, [twActive]: !prev[twActive] }))} className="flex items-center gap-3 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-all hover:bg-slate-200 font-black text-xs uppercase">
                          <CalendarDays size={18} /> {expandedMonthlyRPD[twActive] ? 'Tutup Rincian' : 'Buka Rincian'}
                       </button>
                    </div>

                    <div className="space-y-5">
                       {twMonths[twActive].map(m => {
                         const mData = globalStats.months[m];
                         return (
                             <div key={m} className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-200 space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                   <span className="text-sm font-black text-slate-800 uppercase tracking-widest">{m}</span>
                                   <div className="flex gap-3">
                                      {['51', '52', '53'].map(code => {
                                         const t = mData[`rpd${code}` as keyof typeof mData];
                                         const r = mData[`real${code}` as keyof typeof mData];
                                         const dev = t > 0 ? ((r - t) / t) * 100 : 0;
                                         return <span key={code} className={`text-xs font-black px-3 py-1 rounded-xl border shadow-sm ${getDevColorClass(dev)}`}>{code}: {dev.toFixed(1)}%</span>
                                      })}
                                   </div>
                                </div>
                                {expandedMonthlyRPD[twActive] && (
                                   <div className="space-y-3 animate-in slide-in-from-top text-xs font-bold text-slate-500 italic px-2">
                                      {['51', '52', '53'].map(code => (
                                         <div key={code} className="grid grid-cols-12 border-b border-slate-100/50 pb-2">
                                            <div className="col-span-3 uppercase">Akun {code}</div>
                                            <div className="col-span-4">RPD: Rp {formatMoney(mData[`rpd${code}` as keyof typeof mData])}</div>
                                            <div className="col-span-5 text-right">Real: Rp {formatMoney(mData[`real${code}` as keyof typeof mData])}</div>
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

               {/* BAR FILTER LENGKAP: LEVEL, AUDIT, & CETAK */}
               <div className="bg-white p-8 rounded-[4rem] shadow-xl border border-slate-200 flex flex-col xl:flex-row items-center gap-8">
                  <div className="p-5 bg-blue-100 text-blue-600 rounded-2xl shrink-0"><Filter size={28}/></div>
                  
                  {/* PILIHAN LEVEL */}
                  <div className="flex-1 w-full">
                    <label className="text-xs font-black text-slate-500 uppercase mb-2 block tracking-widest">Kedalaman Data</label>
                    <select 
                      value={rapatDepth} 
                      onChange={(e) => setRapatDepth(Number(e.target.value))} 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-6 text-[13px] font-black text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                        <option value={1}>Level 1: DIPA Induk</option>
                        <option value={2}>Level 2: Output RO</option>
                        <option value={8}>Level 8: Detail Pagu (Item)</option>
                    </select>
                  </div>

                  {/* FILTER KONDISI AUDIT */}
                  <div className="flex-[1.5] w-full">
                    <label className="text-xs font-black text-slate-500 uppercase mb-2 block tracking-widest">Filter Kondisi (IKPA)</label>
                    <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
                      {[
                        {id: 'all', label: 'Semua', color: 'bg-slate-800'},
                        {id: 'aman', label: 'Aman', color: 'bg-emerald-600'},
                        {id: 'meleset', label: 'Meleset', color: 'bg-rose-600'},
                        {id: 'anomali', label: 'Tanpa RPD', color: 'bg-amber-600'}
                      ].map((btn) => (
                        <button
                          key={btn.id}
                          onClick={() => setAuditFilter(btn.id as any)}
                          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                            auditFilter === btn.id 
                            ? `${btn.color} text-white shadow-lg scale-105` 
                            : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* TOMBOL CETAK REKAP BACKUP */}
                  <div className="w-full xl:w-auto shrink-0">
                    <button 
                      onClick={() => handleExportRekapFull()}
                      className="w-full flex items-center justify-center gap-4 px-10 py-4 bg-emerald-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all"
                    >
                      <FileUp size={20} /> Cetak Rekap Backup
                    </button>
                  </div>
               </div>
               <div className="bg-white rounded-[4rem] shadow-2xl border border-slate-200 overflow-hidden">
                 {/* PANEL PILIHAN BULAN/TRIWULAN */}
  <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2 items-center">
    <span className="text-[10px] font-black uppercase text-slate-400 mr-2 tracking-widest italic">Tampilkan Data:</span>
    <div className="flex flex-wrap gap-1">
      {allMonths.map(m => (
        <button key={m} onClick={() => setRekapPeriod(m)} className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${rekapPeriod === m ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-400 hover:bg-slate-100'}`}>
          {m}
        </button>
      ))}
      <div className="w-px h-6 bg-slate-200 mx-2"></div>
      {['TW1', 'TW2', 'TW3', 'TW4'].map(tw => (
        <button key={tw} onClick={() => setRekapPeriod(tw)} className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all ${rekapPeriod === tw ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-400 hover:bg-slate-100'}`}>
          {tw}
        </button>
      ))}
    </div>
  </div>
                  <div className="overflow-x-auto custom-scrollbar max-h-[72vh]">
  <table className="w-full border-collapse text-[11px]">
    <thead className="sticky top-0 z-20 bg-slate-950 text-white font-bold uppercase text-center shadow-lg">
      <tr>
        <th className="px-4 py-5 text-left w-24">Kode</th>
        <th className="px-5 py-5 text-left min-w-[380px]">Uraian</th>
        <th className="px-4 py-5 text-right w-32">Pagu DIPA</th>
        <th className="px-6 py-5 text-center bg-indigo-900 w-40">RPD {rekapPeriod}</th>
        <th className="px-6 py-5 text-center bg-blue-900 w-40">REAL {rekapPeriod}</th>
        <th className="px-3 py-5 text-center bg-rose-900 w-24 tracking-tighter italic">% DEV</th>
        <th className="px-4 py-5 text-right bg-slate-900 w-32 tracking-tighter">SISA PAGU</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      {finalDisplay.map((item: any) => {
        const isNonFinancial = item.uraian?.toLowerCase().includes('kppn') || item.uraian?.toLowerCase().includes('lokasi');
        
        // Logika Hitung Nilai Berdasarkan Periode (Bulan atau Triwulan)
        let valRPD = 0; 
        let valReal = 0;

        if (rekapPeriod.startsWith('TW')) {
          const twNum = parseInt(rekapPeriod.replace('TW', ''));
          twMonths[twNum].forEach(m => {
            valRPD += (Number(item.monthRPD?.[m]) || 0);
            valReal += (Number(item.monthReal?.[m]) || 0);
          });
        } else {
          valRPD = Number(item.monthRPD?.[rekapPeriod]) || 0;
          valReal = Number(item.monthReal?.[rekapPeriod]) || 0;
        }

        const devPct = valRPD > 0 ? ((valReal - valRPD) / valRPD) * 100 : 0;
        const sisaPagu = (Number(item.pagu) || 0) - (item.totalReal || 0);

        let rowBg = "hover:bg-blue-50/40 transition-all";
        if (item.level === 1) rowBg = "bg-amber-100/60 font-black";
        if (item.level === 2) rowBg = "bg-blue-100/40 font-black";
        
        return (
          <tr key={item.id} className={rowBg}>
            <td className="px-4 py-2 border-r border-slate-100 text-slate-400 font-mono italic">{item.kode}</td>
            <td className="px-5 py-2 border-r border-slate-100 font-bold text-slate-800" style={{ paddingLeft: `${(item.level * 10)}px` }}>{item.uraian}</td>
            <td className="px-4 py-2 text-right font-black border-r border-slate-100">{!isNonFinancial ? formatMoney(item.pagu) : ""}</td>
            <td className="px-6 py-2 text-right font-black text-indigo-700 bg-indigo-50/30 border-r border-slate-100">{!isNonFinancial ? formatMoney(valRPD) : ""}</td>
            <td className="px-6 py-2 text-right font-black text-blue-700 bg-blue-50/30 border-r border-slate-100">{!isNonFinancial ? formatMoney(valReal) : ""}</td>
            <td className={`px-3 py-2 text-center font-black border-r border-slate-100 ${getDevColorClass(devPct)}`}>{!isNonFinancial && valRPD > 0 ? `${devPct.toFixed(1)}%` : "0%"}</td>
            <td className={`px-4 py-2 text-right font-black ${sisaPagu < 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-800'}`}>{!isNonFinancial ? formatMoney(sisaPagu) : ""}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'capaian' && (
            <div className="space-y-8 animate-in fade-in duration-700 pb-20">
               <GapMonitoringCard showDetails={true} />
               <div className="bg-white p-10 rounded-[4rem] shadow-2xl border border-slate-200 overflow-hidden">
                 <div className="flex items-center gap-5 mb-10">
                    <div className="p-4 bg-violet-100 text-violet-600 rounded-2xl"><TrendingUp size={28}/></div>
                    <div>
                      <h3 className="text-xl font-black italic uppercase tracking-tighter">Entri Progres Rincian Output (RO)</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Perbaikan data pada bulan {globalStats.activeMonth} terpilih</p>
                    </div>
                 </div>
                 <div className="overflow-x-auto overflow-y-auto custom-scrollbar rounded-[2rem] border border-slate-100 max-h-[70vh] relative">
                    <table className="w-full text-[10px] border-separate border-spacing-0">
                       <thead className="sticky top-0 z-30 bg-slate-900 text-white text-center font-black uppercase tracking-widest">
                         <tr>
                             <th rowSpan={2} className="sticky left-0 z-40 bg-slate-900 px-4 py-4 text-left border-r border-white/5 min-w-[300px]">Kode & Output</th>
                             <th rowSpan={2} className="sticky left-[300px] z-40 bg-slate-900 px-4 py-4 border-r border-white/5 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">Kumulatif Anggaran</th>
                             {allMonths.map(m => (
                               <th key={m} className={`px-2 py-2 border-r border-white/5 min-w-[120px] ${selectedMonthGap === m ? 'bg-indigo-600 text-white' : ''}`}>{m}</th>
                             ))}
                         </tr>
                         <tr className="bg-slate-800">
                             {allMonths.map(m => (<th key={m} className="px-2 py-1 text-[8px] border-r border-white/5 tracking-tighter text-slate-400">T % | R %</th>))}
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {capaianOutputData.map((out) => {
                             // Menghitung kumulatif realisasi dari seluruh bulan yang sudah berjalan
// Menghitung Total Akumulasi Setahun (T dan R)
const totalTargetSetahun = allMonths.reduce((acc, m) => {
  // Ambil nilai manual jika ada, jika tidak ada ambil nilai sugesti
  const nilaiTarget = out.targetCapaian?.[m] || out.suggestedTarget?.[m] || 0;
  return acc + (Number(nilaiTarget) || 0);
}, 0);

const totalRealSetahun = allMonths.reduce((acc, m) => {
  const nilaiReal = out.realCapaian?.[m] || out.suggestedReal?.[m] || 0;
  return acc + (Number(nilaiReal) || 0);
}, 0);
                             return (
                                <tr key={out.id} className="bg-white hover:bg-violet-50/30 transition-all">
                                      <td className="sticky left-0 z-10 bg-white px-5 py-4 border-r border-slate-50 relative">
                                          <div className="font-black text-slate-800 text-[11px] mb-1">{out.kode}</div>
                                          <div className="text-[9px] font-bold text-slate-400 uppercase leading-tight">{out.uraian}</div>
                                      </td>
                                      <td className="sticky left-[300px] z-10 bg-white px-4 py-4 border-r border-slate-50 text-right shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                          <div className="text-slate-400 font-bold mb-1 italic">Pagu: {formatMoney(out.paguOutput)}</div>
                                          <div className="text-indigo-600 font-black tracking-tighter italic">T: {totalTargetSetahun.toFixed(1)}%</div>
<div className="text-emerald-600 font-black tracking-tighter italic">R: {totalRealSetahun.toFixed(1)}%</div>
                                      </td>
                                      {allMonths.map(m => (
                                          <td key={m} className={`px-3 py-4 border-r border-slate-50 ${selectedMonthGap === m ? 'bg-indigo-50/30' : ''}`}>
                                            <div className="flex flex-col gap-2">
                                               <input 
  type="text" 
  placeholder="T"
  readOnly={currentUser.role !== 'admin'}
  // Jika database kosong, tampilkan angka sugesti 0.5 atau hasil bagi RPD
  value={out.targetCapaian?.[m] || out.suggestedTarget[m]} 
  onChange={async (e) => {
    if(currentUser.role === 'admin') {
      const val = e.target.value.replace(/[^0-9.]/g, '');
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', DATA_COLLECTION, out.id), { 
        targetCapaian: { ...out.targetCapaian, [m]: val } 
      });
    }
  }}
  // Warna Kuning Gading jika otomatis, Putih jika sudah diisi manual
  className={`w-full border rounded-lg py-1 px-2 text-center text-[10px] font-black outline-none transition-all ${out.targetCapaian?.[m] ? 'bg-white border-slate-200 text-slate-800' : 'bg-amber-50 border-amber-200 text-amber-600 italic'}`}
/>
                                               <input 
  type="text" 
  placeholder="R"
  readOnly={currentUser.role !== 'admin'}
  // Jika database kosong, tampilkan hasil bagi Realisasi Keuangan
  value={out.realCapaian?.[m] || out.suggestedReal[m]} 
  onChange={async (e) => {
    if(currentUser.role === 'admin') {
      const val = e.target.value.replace(/[^0-9.]/g, '');
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', DATA_COLLECTION, out.id), { 
        realCapaian: { ...out.realCapaian, [m]: val } 
      });
    }
  }}
  // Warna Hijau jika sudah diisi manual, Abu-abu jika otomatis
  className={`w-full border rounded-lg py-1 px-2 text-center text-[10px] font-black outline-none transition-all ${out.realCapaian?.[m] ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400 italic'}`}
/>
                                            </div>
                                          </td>
                                      ))}
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
               <div className="bg-slate-900 rounded-[4rem] p-16 text-white shadow-2xl relative overflow-hidden">
                  <h3 className="text-2xl font-black uppercase italic mb-12 flex items-center gap-5">
                     <UserPlus className="text-blue-500" /> Registrasi User Baru
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                     <div className="flex flex-col gap-3">
                       <label className="text-xs font-black uppercase text-slate-500 ml-4">Username</label>
                       <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-white text-sm outline-none focus:bg-white/10 transition-all" placeholder="Username" />
                     </div>
                     <div className="flex flex-col gap-3">
                       <label className="text-xs font-black uppercase text-slate-500 ml-4">Password</label>
                       <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-white text-sm outline-none focus:bg-white/10 transition-all" placeholder="Password" />
                     </div>
                     <div className="flex flex-col gap-3">
                       <label className="text-xs font-black uppercase text-slate-500 ml-4">Nama Lengkap</label>
                       <input type="text" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-white text-sm outline-none focus:bg-white/10 transition-all" placeholder="Nama Lengkap" />
                     </div>
                     <div className="flex flex-col gap-3">
                       <label className="text-xs font-black uppercase text-slate-500 ml-4">Role</label>
                       <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as any)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-white text-sm outline-none appearance-none">
                          <option value="admin" className="text-black">Admin</option>
                          <option value="pimpinan" className="text-black">Pimpinan</option>
                          <option value="ketua_tim" className="text-black">Ketua Tim</option>
                       </select>
                     </div>
                     <div className="lg:col-span-2 flex flex-col gap-2">
                       <label className="text-xs font-black uppercase text-slate-500 ml-4">Tim</label>
                       <div className="flex flex-wrap gap-2">
                          {ALL_TEAMS.map(tim => (
                             <button key={tim} onClick={() => setNewUserTeam(tim)} className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${newUserTeam === tim ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                                {tim}
                             </button>
                          ))}
                       </div>
                     </div>
                  </div>
                  <button onClick={handleAddUser} className="mt-16 px-20 py-6 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">Simpan Database User</button>
               </div>
               <div className="bg-white rounded-[4rem] border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                     <thead className="bg-slate-50 border-b border-slate-100 uppercase text-[9px] font-black text-slate-400">
                       <tr>
                           <th className="px-8 py-4">Nama</th>
                           <th className="px-4 py-4">Username</th>
                           <th className="px-4 py-4">Password</th>
                           <th className="px-4 py-4 text-center">Aksi</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {allUsers.map((u) => (
                           <tr key={u.id}>
                              <td className="px-8 py-5 font-bold text-slate-800">
                                  <div>{u.name}</div>
                                  <div className="text-[9px] text-blue-500 uppercase tracking-widest">{u.role} • {u.team}</div>
                              </td>
                              <td className="px-4 py-5 font-mono text-slate-500 italic">@{u.username}</td>
                              <td className="px-4 py-5 font-mono">
                                 <div className="flex items-center gap-2">
                                    <input 
                                       type={showPasswordMap[u.id] ? "text" : "password"} 
                                       defaultValue={u.password}
                                       onBlur={(e) => handleChangeUserPassword(u.id, e.target.value)}
                                       className="bg-slate-100 border-none rounded-lg px-2 py-1 w-24 text-[11px]" 
                                    />
                                    <button onClick={() => setShowPasswordMap(prev => ({ ...prev, [u.id]: !prev[u.id] }))} className="text-slate-400 hover:text-blue-500">
                                       {showPasswordMap[u.id] ? <EyeOff size={14}/> : <Eye size={14}/>}
                                    </button>
                                 </div>
                              </td>
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

          {activeTab === 'migrasi' && currentUser?.role === 'admin' && (
            <div className="max-w-4xl mx-auto py-6 animate-in slide-in-from-bottom duration-700">
               <div className="bg-white rounded-[4rem] shadow-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-900 p-10 text-white relative">
                    <h3 className="text-2xl font-black uppercase tracking-widest italic text-white">Migrasi POK</h3>
                  </div>
                  <div className="p-16 space-y-12 text-center">
                    <div className="border-4 border-dashed border-slate-100 rounded-[3rem] p-24 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer transition-all" onClick={() => fileInputRef.current?.click()}>
                      <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileAnalyze} disabled={isProcessing} className="hidden" />
                      <FileUp size={64} className="mx-auto mb-8 text-slate-200" />
                      <span className="text-sm font-black uppercase text-slate-400 italic block">Upload File Excel SAKTI (.xlsx)</span>
                    </div>
                    {previewData.length > 0 && (
                      <div className="grid grid-cols-3 gap-6 animate-in zoom-in">
                        <div className="p-6 bg-slate-50 rounded-3xl shadow-sm text-slate-600"><span className="text-[10px] uppercase font-black text-slate-400 block mb-1">Total Baris</span><span className="text-3xl font-black">{previewData.length}</span></div>
                        <div className="p-6 bg-emerald-50 rounded-3xl shadow-sm text-emerald-600"><span className="text-[10px] uppercase font-black text-emerald-400 block mb-1">Data Match</span><span className="text-3xl font-black">{migrationStats.match}</span></div>
                        <div className="p-6 bg-rose-50 rounded-3xl shadow-sm text-rose-600"><span className="text-[10px] uppercase font-black text-rose-400 block mb-1">Data Orphan</span><span className="text-3xl font-black">{migrationStats.orphaned}</span></div>
                        <button onClick={executeMigration} disabled={isProcessing} className="col-span-3 py-6 bg-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-blue-700 active:scale-[0.98] transition-all">Sinkronisasi & Update Database</button>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          )}

          {(activeTab === 'rpd' || activeTab === 'realisasi') && (
            <div className="space-y-6 animate-in fade-in duration-700">
              <div className="flex items-center justify-between mb-4">
  <div className="flex flex-wrap gap-4">
    {/* HANYA UNTUK ADMIN: Kondisi DIPA, Lock, dan Reset */}
    {currentUser?.role === 'admin' && (
      <>
        <div className="flex items-center gap-3 bg-white px-5 py-2 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 italic">Kondisi DIPA:</span>
          <input 
            type="text" 
            value={kppnMetrics.revisiKe || ""} 
            onChange={(e) => setKppnMetrics((prev: any) => ({ ...prev, revisiKe: e.target.value }))}
            onBlur={saveKppnGlobal}
            className="w-48 font-black text-xs text-blue-600 outline-none bg-transparent" 
          />
        </div>
        <button onClick={handleToggleLock} className={`flex items-center gap-3 px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-xl transition-all ${isLocked ? 'bg-rose-100 text-rose-700' : 'bg-slate-900 text-white'}`}>
          {isLocked ? <Lock size={16} /> : <Unlock size={16} />} {isLocked ? 'Buka Kunci' : 'Kunci Pengisian'}
        </button>
        <button onClick={() => setShowClearDataModal(true)} className="flex items-center gap-3 px-8 py-3 rounded-2xl font-black text-xs uppercase bg-white text-slate-600 border border-slate-200 shadow-sm"><Eraser size={16} /> Reset Nilai</button>
      </>
    )}

    {/* UNTUK SEMUA ROLE: Export dan Import */}
    <button onClick={handleExportExcel} className="flex items-center gap-3 px-8 py-3 rounded-2xl font-black text-xs uppercase bg-emerald-600 text-white shadow-xl hover:bg-emerald-700 transition-all">
      <FileUp size={16} /> Export Excel
    </button>
    <button onClick={() => fileInputRPDRef.current?.click()} className="flex items-center gap-3 px-8 py-3 rounded-2xl font-black text-xs uppercase bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 transition-all">
      <FileUp size={16} /> Import Excel
      <input type="file" ref={fileInputRPDRef} onChange={handleImportExcel} className="hidden" accept=".xlsx, .xls" />
    </button>
  </div>

  {/* STATUS UNTUK NON-ADMIN */}
  {currentUser?.role !== 'admin' && (
    <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border italic text-sm font-black ${isLocked ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100 shadow-sm'}`}>
      {isLocked ? <Lock size={18} /> : <ShieldHalf size={18} />} {isLocked ? 'Mode Terkunci' : `Aktif: Tim ${currentUser?.team}`}
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
                    <span className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Tim Pelaksana</span>
                    <div className="flex flex-wrap gap-1 p-1 bg-slate-50 rounded-lg">
                      {ALL_TEAMS.filter(t => activeWilayah === "GG" ? t !== "Umum" : t === "Umum").map(tim => (
                        <button key={tim} disabled={currentUser?.role !== 'admin'} onClick={() => setActiveTim(tim)} className={`px-4 py-1.5 text-[10px] font-black rounded-md transition-all ${activeTim === tim ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 opacity-50'}`}>{tim}</button>
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

              <div className="bg-white shadow-2xl border border-slate-200 overflow-hidden rounded-[4rem]">
                <div className="overflow-x-auto custom-scrollbar max-h-[72vh]">
                  <table className="w-full border-collapse text-[11px]">
                    <thead className="sticky top-0 z-20 bg-slate-950 text-white font-bold uppercase text-center shadow-lg">
                      <tr>
                        <th className="px-4 py-5 text-left w-24">Kode</th>
                        <th className="px-5 py-5 text-left min-w-[380px]">Uraian</th>
                        <th className="px-4 py-5 text-right w-32">Pagu DIPA</th>
                        {twMonths[twActive].map(m => (<th key={m} className={`px-2 py-5 text-right w-28 ${activeTab === 'rpd' ? 'bg-orange-900' : 'bg-blue-900'}`}>{m}</th>))}
                        <th className="px-4 py-5 text-right bg-slate-800 w-32">Total</th>
                        <th className="px-4 py-5 text-right bg-rose-900 w-32">Sisa</th>
                        <th className="px-2 py-5 text-center w-16">Opsi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {finalDisplay.map((item: any) => {
                        const isInduk = item.uraian?.toLowerCase().includes('kppn') || item.uraian?.toLowerCase().includes('lokasi');
                        const canEdit = (activeTab === 'rpd' && (currentUser?.role === 'admin' || (currentUser?.role === 'ketua_tim' && !isLocked))) || (activeTab === 'realisasi' && currentUser?.role === 'admin');

// Perhitungan sisa otomatis
const currentTotal = activeTab === 'rpd' ? item.totalRPD : item.totalReal;
const sisaPagu = (Number(item.pagu) || 0) - currentTotal;
                        return (
                          <tr key={item.id} className={`transition-all ${item.isOrphan ? 'bg-rose-50/50 italic' : 'hover:bg-blue-50/40'}`}>
                            <td className="px-4 py-2 border-r border-slate-100 text-slate-400 font-mono italic">{item.kode}</td>
                            <td className="px-5 py-2 border-r border-slate-100 font-bold text-slate-800" style={{ paddingLeft: `${(item.level * 10)}px` }}>{item.uraian}</td>
                            <td className="px-4 py-2 text-right font-black border-r border-slate-100">{!isInduk ? formatMoney(item.pagu) : ""}</td>
                            {twMonths[twActive].map((m: string) => (
                                <td key={m} className="px-0 py-0 h-full border-r border-slate-100">
                                  {!isInduk && item.isDetail ? (
                                    <input 
                                      type="text" 
                                      value={formatInputMasking(activeTab === 'rpd' ? item.rpd?.[m] : item.realisasi?.[m])} 
                                      readOnly={!canEdit} 
                                      onChange={async (e) => { 
                                        if(fbUser && canEdit) { 
                                          const f = activeTab === 'rpd' ? 'rpd' : 'realisasi'; 
                                          const ex = activeTab === 'rpd' ? (item.rpd || {}) : (item.realisasi || {});
                                          const rawNumber = e.target.value.replace(/\D/g, "");
                                          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', DATA_COLLECTION, item.id), { [f]: { ...ex, [m]: rawNumber } }); 
                                        }
                                      }} 
                                      className={`w-full h-full text-right px-3 py-2.5 outline-none font-black text-xs ${!canEdit ? 'bg-slate-100 text-slate-400' : 'bg-teal-400/10 text-slate-900 focus:bg-white transition-all'}`} 
                                      placeholder="0" 
                                    />
                                  ) : !isInduk ? (<div className="text-right px-3 py-3 font-black italic">{formatMoney(activeTab === 'rpd' ? item.monthRPD?.[m] : item.monthReal?.[m])}</div>) : null}
                                </td>
                            ))}
                            <td className="px-4 py-2 text-right font-black bg-slate-100/50">{!isInduk ? formatMoney(activeTab === 'rpd' ? item.totalRPD : item.totalReal) : ""}</td>
                            <td className={`px-4 py-2 text-right font-black ${sisaPagu < 0 ? 'text-rose-600 bg-rose-50 animate-pulse' : 'text-slate-800'}`}>
    {!isInduk ? formatMoney(sisaPagu) : ""}
</td>
                            <td className="px-2 py-2 text-center">
                               {item.isOrphan && currentUser?.role === 'admin' && (
                                 <button onClick={async () => {
                                    if(window.confirm("Hapus data orphan ini permanen?")) {
                                        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', DATA_COLLECTION, item.id));
                                    }
                                 }} className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl transition-all"><Trash2 size={18}/></button>
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
        </div>

        <footer className="bg-white border-t border-slate-200 py-3 px-8 text-center flex items-center justify-center gap-3 shrink-0 shadow-inner">
            <ShieldHalf size={14} className="text-slate-300" />
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">© 2026 BPS Kab. Seram Bagian Barat - Internal Secure Server Access</p>
        </footer>
      </main>

      {showClearDataModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-sm p-10 text-center border border-slate-200 animate-in zoom-in duration-200">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6"><AlertTriangle size={32} /></div>
              <h3 className="text-xl font-black text-slate-800 mb-2 italic uppercase">Konfirmasi Reset</h3>
              <p className="text-[11px] text-slate-500 mb-10 leading-relaxed italic">Hapus seluruh input data <b>{activeTab.toUpperCase()}</b> pada tim <b>{activeTim}</b> secara permanen?</p>
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
                 }} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-rose-700 active:scale-95 transition-all">Ya, Kosongkan Data</button>
                 <button onClick={() => setShowClearDataModal(false)} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase hover:bg-slate-200 transition-all">Batalkan</button>
              </div>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 12px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .no-spinner::-webkit-outer-spin-button, .no-spinner::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .no-spinner { -moz-appearance: textfield; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fade-in 0.5s ease-out forwards; }
      `}} />
    </div>
  );
}
// === SELESAI: SELURUH KODE UTUH TERKIRIM ===
