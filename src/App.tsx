"use client";
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, onSnapshot, doc, setDoc, updateDoc, writeBatch, getDocs, deleteDoc, where, limit } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { LayoutDashboard, FileUp, Trash2, Menu, User, Activity, Lock, Unlock, PieChart as PieIcon, Target, Edit3, LogOut, ClipboardCheck, TrendingUp, Filter, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const firebaseConfig = { apiKey: "AIzaSyDYqadyvJ-9RYxBNOeDxsYAY6wwE5t_y8w", authDomain: "mese-ikpa.firebaseapp.com", projectId: "mese-ikpa", storageBucket: "mese-ikpa.firebasestorage.app", messagingSenderId: "968020082155", appId: "1:968020082155:web:f86188e6de15dcd8cc2dae" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = 'meseikpa-primary-store';

const ALL_TEAMS = ["Nerwilis", "IPDS", "Distribusi", "Produksi", "Sosial", "Umum"];
const TIM_MAPPING: Record<string, string[]> = { "Nerwilis": ["2896", "2898", "2899"], "IPDS": ["2897", "2900", "2901"], "Distribusi": ["2902", "2903", "2908"], "Produksi": ["2904", "2909", "2910"], "Sosial": ["2905", "2906", "2907"], "Umum": ["2886"] };

const formatMoney = (v: any) => Number(v) ? Number(v).toLocaleString('id-ID') : '0';
const cleanString = (s: any) => String(s || "").replace(/\s+/g, "").trim().toUpperCase();
const getLevel = (k: string): number => {
  const c = cleanString(k); if (!c || c.includes("HILANG")) return 8; if (c.includes("054.01")) return 1; if (/^[0-9]{4}$/.test(c)) return 2;
  const d = (c.match(/\./g) || []).length; if (d === 1) return 3; if (d === 2) return 4; if (/^[0-9]{3}$/.test(c)) return 5; if (/^[A-Z]$/.test(c)) return 6; if (/^[0-9]{6}$/.test(c)) return 7; return 8;
};
const sumMap = (m: any) => m ? Object.values(m).reduce((a: any, b: any) => a + (Number(b) || 0), 0) : 0;

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [dataTampil, setDataTampil] = useState<any[]>([]);
  const [kppnMetrics, setKppnMetrics] = useState<any>({ isLocked: false, revisiKe: "DIPA AWAL" });
  const [activeTab, setActiveTab] = useState<any>('dashboard');
  const [activeWilayah, setActiveWilayah] = useState("GG");
  const [activeTim, setActiveTim] = useState("Nerwilis");
  const [twActive, setTwActive] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  const twMonths: any = { 1: ['Jan', 'Feb', 'Mar'], 2: ['Apr', 'Mei', 'Jun'], 3: ['Jul', 'Ags', 'Sep'], 4: ['Okt', 'Nov', 'Des'] };

  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, (u) => { if (u) { const s = localStorage.getItem('meseikpa_session'); if (s) setCurrentUser(JSON.parse(s)); } });
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'kppn_metrics', 'kppn_global'), (s) => s.exists() && setKppnMetrics(s.data()));
    onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'pagu_anggaran')), (s) => {
      let items = s.docs.map(d => ({ ...d.data(), id: d.id } as any)).sort((a, b) => (a.noUrut || 0) - (b.noUrut || 0));
      let curW = "GG"; setDataTampil(items.map(i => { if (i.kode?.includes(".WA")) curW = "WA"; if (i.kode?.includes(".GG")) curW = "GG"; return { ...i, wilayah: curW }; }));
    });
  }, []);

  const stats = useMemo(() => {
    const s = { pagu: 0, real: 0, rpd: 0, p51: 0, r51: 0, p52: 0, r52: 0, p53: 0, r53: 0, rp51: 0, rp52: 0, rp53: 0 };
    dataTampil.filter(d => getLevel(d.kode) === 8).forEach(d => {
      const p = Number(d.pagu) || 0, r = sumMap(d.realisasi), rp = sumMap(d.rpd);
      s.pagu += p; s.real += r; s.rpd += rp;
      if (d.kode?.startsWith('51')) { s.p51 += p; s.r51 += r; s.rp51 += rp; }
      else if (d.kode?.startsWith('52')) { s.p52 += p; s.r52 += r; s.rp52 += rp; }
      else if (d.kode?.startsWith('53')) { s.p53 += p; s.r53 += r; s.rp53 += rp; }
    });
    return s;
  }, [dataTampil]);

  if (!currentUser) return (
    <div className="h-screen flex items-center justify-center bg-slate-100 font-sans">
      <form onSubmit={(e: any) => { e.preventDefault(); const u = { name: e.target[0].value, role: 'admin', team: 'Umum' }; setCurrentUser(u); localStorage.setItem('meseikpa_session', JSON.stringify(u)); }} className="bg-white p-10 rounded-[2rem] shadow-xl w-80 text-center">
        <h1 className="text-2xl font-black mb-6 italic">MESEIKPA LOGIN</h1>
        <input type="text" placeholder="Username" className="w-full p-3 mb-3 bg-slate-50 rounded-xl border" required />
        <input type="password" placeholder="Password" className="w-full p-3 mb-6 bg-slate-50 rounded-xl border" required />
        <button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black">LOGIN</button>
      </form>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <aside className={`bg-slate-900 text-slate-400 transition-all ${sidebarOpen ? 'w-64' : 'w-20'} flex flex-col`}>
        <div className="h-16 flex items-center px-6 bg-slate-950 text-white font-black italic shadow-lg">M</div>
        <nav className="flex-1 p-4 space-y-2">
          {['dashboard', 'realisasi', 'capaian', 'rapat', 'migrasi'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`w-full flex items-center p-3 rounded-xl uppercase text-[10px] font-black tracking-widest ${activeTab === t ? 'bg-indigo-600 text-white' : 'hover:bg-white/5'}`}>
              <LayoutDashboard className="mr-3" size={18} /> {sidebarOpen && t}
            </button>
          ))}
        </nav>
        <button onClick={() => { setCurrentUser(null); localStorage.removeItem('meseikpa_session'); }} className="p-6 text-rose-400 flex items-center border-t border-white/5"><LogOut className="mr-3" /> {sidebarOpen && "LOGOUT"}</button>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shadow-sm">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}><Menu /></button>
          <div className="text-[10px] font-black text-slate-400 italic">BPS KABUPATEN SERAM BAGIAN BARAT</div>
          <div className="text-xs font-bold uppercase">{currentUser.name}</div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex justify-between items-end">
                <div><span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase">{kppnMetrics.revisiKe}</span><h1 className="text-3xl font-black italic mt-2 text-slate-800">Executive Dashboard</h1></div>
                <div className="text-right"><span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Total Pagu</span><div className="text-3xl font-black italic">Rp {formatMoney(stats.pagu)}</div></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Penyerapan</span>
                  <div className="text-5xl font-black italic my-4">{stats.pagu > 0 ? (stats.real / stats.pagu * 100).toFixed(1) : 0}%</div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Deviasi</span>
                  <div className="text-5xl font-black italic my-4 text-amber-500">{stats.rpd > 0 ? Math.abs((stats.real - stats.rpd) / stats.rpd * 100).toFixed(1) : 0}%</div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border text-center flex flex-col justify-center">
                   <span className="text-[10px] font-black text-slate-400 uppercase mb-2">Monitoring GAP</span>
                   <div className="text-4xl font-black text-emerald-600 italic flex items-center justify-center gap-2"><CheckCircle2 size={32}/> AMAN</div>
                </div>
              </div>
              <div className="bg-white p-10 rounded-[3rem] border shadow-sm">
                 <h3 className="font-black uppercase italic mb-8 text-slate-700">Proporsi Per Akun Belanja</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {[{l:'51', p:stats.p51, r:stats.r51, c:'#6366f1'}, {l:'52', p:stats.p52, r:stats.r52, c:'#10b981'}, {l:'53', p:stats.p53, r:stats.r53, c:'#f59e0b'}].map(i => (
                      <div key={i.l} className="flex flex-col items-center p-6 bg-slate-50 rounded-[2rem]">
                        <span className="text-[10px] font-black text-slate-400 uppercase mb-4">Belanja {i.l}</span>
                        <div className="h-40 w-full relative">
                          <ResponsiveContainer><PieChart><Pie data={[{v:i.r},{v:Math.max(0, i.p-i.r)}]} innerRadius={45} outerRadius={60} dataKey="v" startAngle={90} endAngle={-270}><Cell fill={i.c}/><Cell fill="#e2e8f0"/></Pie></PieChart></ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center font-black text-xl">{i.p > 0 ? (i.r/i.p*100).toFixed(1) : 0}%</div>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}

          {(activeTab === 'realisasi') && (
            <div className="bg-white rounded-[2rem] shadow-xl border overflow-hidden">
               <div className="p-4 bg-slate-900 flex justify-between items-center text-white">
                 <span className="text-xs font-black uppercase italic">Input Realisasi Anggaran</span>
                 <div className="flex gap-2">
                   {[1,2,3,4].map(tw => <button key={tw} onClick={()=>setTwActive(tw)} className={`px-4 py-1 rounded-lg text-[10px] font-black ${twActive===tw?'bg-white text-slate-900':'bg-slate-800'}`}>TW {tw}</button>)}
                 </div>
               </div>
               <div className="overflow-x-auto"><table className="w-full text-[11px]">
                 <thead className="bg-slate-100 uppercase text-slate-400"><tr><th className="p-4 text-left">Kode</th><th className="p-4 text-left">Uraian</th><th className="p-4 text-right">Pagu</th>{twMonths[twActive].map((m:any) => <th key={m} className="p-4 text-right">{m}</th>)}</tr></thead>
                 <tbody>{dataTampil.filter(d => d.wilayah === activeWilayah).map(item => {
                   const level = getLevel(item.kode);
                   return (
                   <tr key={item.id} className="border-b hover:bg-slate-50 transition-all">
                     <td className="p-3 text-slate-400 font-mono italic">{item.kode}</td>
                     <td className="p-3 font-bold" style={{paddingLeft:`${level*10}px`}}>{item.uraian}</td>
                     <td className="p-3 text-right font-black">{formatMoney(item.pagu)}</td>
                     {twMonths[twActive].map((m:any) => <td key={m} className="p-0 border-l"><input type="text" value={item.realisasi?.[m] || ""} onChange={async (e) => { const r = e.target.value.replace(/\D/g,""); await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pagu_anggaran', item.id), {[`realisasi.${m}`]: r}); }} className="w-full p-3 text-right outline-none bg-transparent font-black text-blue-600 focus:bg-white" placeholder="0" /></td>)}
                   </tr>
                 )})}</tbody>
               </table></div>
            </div>
          )}

          {activeTab === 'rapat' && (
             <div className="bg-white rounded-[2rem] shadow-xl border overflow-hidden">
               <div className="p-6 bg-slate-900 text-white font-black italic uppercase text-xs">Rekapitulasi Penyerapan Seluruh Akun</div>
               <table className="w-full text-[10px] font-bold">
                 <thead className="bg-slate-100 text-slate-400"><tr><th className="p-4 text-left">Uraian</th><th className="p-4 text-right">Pagu</th><th className="p-4 text-right">Realisasi</th><th className="p-4 text-right">Sisa</th></tr></thead>
                 <tbody>{dataTampil.filter(d => getLevel(d.kode) <= 2).map(i => (
                   <tr key={i.id} className="border-b">
                     <td className="p-4">{i.uraian}</td>
                     <td className="p-4 text-right">{formatMoney(i.pagu)}</td>
                     <td className="p-4 text-right text-blue-600">{formatMoney(sumMap(i.realisasi))}</td>
                     <td className="p-4 text-right">{formatMoney(Number(i.pagu||0)-sumMap(i.realisasi))}</td>
                   </tr>
                 ))}</tbody>
               </table>
             </div>
          )}
        </div>
        <footer className="h-8 bg-white border-t flex items-center justify-center text-[8px] font-black text-slate-300 tracking-[0.4em] italic">© 2026 BPS KAB. SERAM BAGIAN BARAT</footer>
      </main>
    </div>
  );
}
