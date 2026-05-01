"use client";

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, TableProperties, ArrowLeftRight, 
  ClipboardCheck, Wallet, Menu, User, TrendingUp 
} from 'lucide-react';

export default function MeseIkpaV3() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dataKppn, setDataKppn] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTW, setSelectedTW] = useState(1);

  const fetchSheetData = async () => {
    setLoading(true);
    // Link CSV Sheet "T-KPPN VS R-BPSSBB"
    const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSUbViIHpH0RcdJJQ3PuiEqY187u6Mg16jFnYFpG6CEIucA0b7PIOA6HYcMuhIXR3ItTAC-izjeoQXr/pub?gid=2098386606&single=true&output=csv";
    
    try {
      const response = await fetch(sheetUrl);
      const csvText = await response.text();
      const rows = csvText.split('\n').map(row => row.split(','));
      
      // PEMETAAN KOLOM BERDASARKAN SCREENSHOT SHEET 4
      // TW I: Kolom D (3)=%Tgt, Kolom G (6)=RealRp, Kolom H (7)=Gap, Kolom I (8)=%Real
      // TW II: Kolom K (10)=%Tgt, Kolom N (13)=RealRp, Kolom O (14)=Gap, Kolom P (15)=%Real
      // TW III: Kolom R (17)=%Tgt, Kolom U (20)=RealRp... (Dst setiap loncat 7 kolom)
      
      const startIdx = (selectedTW - 1) * 7; 
      const colTgtPct = 3 + startIdx;
      const colRealNom = 6 + startIdx;
      const colGapNom = 7 + startIdx;
      const colRealPct = 8 + startIdx;

      const cleanData = [2, 3, 4].map(rowIdx => {
        const rPct = parseFloat(rows[rowIdx]?.[colRealPct]) || 0;
        const tPct = parseFloat(rows[rowIdx]?.[colTgtPct]) || 0;
        const rNom = rows[rowIdx]?.[colRealNom] || "0";
        
        // Cek apakah periode sudah berjalan (jika realisasi 0 dan belum ada data, anggap belum berjalan)
        const isStarted = rPct > 0 || rNom !== "0";

        return {
          jenis: rows[rowIdx]?.[1] || "",
          persenTarget: tPct,
          nominalReal: rNom,
          nominalGap: rows[rowIdx]?.[colGapNom] || "0",
          persenReal: rPct,
          isStarted: isStarted
        };
      });
      
      setDataKppn(cleanData.filter(item => item.jenis));
    } catch (error) {
      console.error("Gagal sinkronisasi data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheetData();
  }, [selectedTW]);

  const menuList = [
    { id: 'dashboard', label: 'Dashboard Utama', icon: <LayoutDashboard size={20}/> },
    { id: 'kertas-kerja', label: 'Kertas Kerja (Detail)', icon: <TableProperties size={20}/> },
    { id: 'monitor-kppn', label: 'KPPN vs BPS SBB', icon: <ArrowLeftRight size={20}/> },
    { id: 'capaian-output', label: 'Capaian Output', icon: <ClipboardCheck size={20}/> },
    { id: 'ls-gu', label: 'Monitoring LS & GU', icon: <Wallet size={20}/> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-[#0F172A] text-slate-300 transition-all duration-300 flex flex-col shadow-2xl`}>
        <div className="h-16 flex items-center px-6 bg-slate-900 border-b border-white/5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black shadow-lg">M</div>
          {sidebarOpen && <span className="ml-3 font-black text-white italic tracking-tighter">MESEIKPA 3.0</span>}
        </div>
        <nav className="flex-1 py-6 px-3 space-y-2">
          {menuList.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center p-3 rounded-2xl transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl' : 'hover:bg-white/5 text-slate-400'}`}>
              {item.icon}
              {sidebarOpen && <span className="ml-3 text-[11px] font-black uppercase tracking-widest">{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shadow-sm">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500"><Menu size={20} /></button>
          <div className="flex items-center gap-4">
             <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
               {[1, 2, 3, 4].map(tw => (
                 <button key={tw} onClick={() => setSelectedTW(tw)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${selectedTW === tw ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>TW {tw}</button>
               ))}
             </div>
             <button onClick={fetchSheetData} className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                {loading ? "Sync..." : "Refresh"}
             </button>
             <div className="flex items-center gap-3 ml-2 border-l pl-4 border-slate-200 text-right leading-none">
                <div>
                  <span className="text-[10px] font-black block text-slate-800 uppercase italic italic">Administrator</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase">BPS Kab. SBB</span>
                </div>
                <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500"><User size={18}/></div>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' ? (
              <div className="space-y-8 animate-in">
                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                   <div className="relative z-10">
                      <h1 className="text-3xl font-black italic tracking-tighter leading-none">Dashboard Monitoring</h1>
                      <p className="text-blue-400 text-xs font-bold uppercase tracking-[0.3em] mt-2">Otomasi Kertas Kerja SAKTI • Triwulan {selectedTW}</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {dataKppn.map((item, idx) => {
                    const isSuccess = item.persenReal >= item.persenTarget;
                    if (!item.isStarted && selectedTW > 1) {
                        return (
                          <div key={idx} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center justify-center text-slate-300 italic text-[10px] font-black uppercase tracking-widest">
                            Periode Belum Berjalan
                          </div>
                        );
                    }

                    return (
                      <div key={idx} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm group hover:shadow-xl transition-all">
                        <div className="flex justify-between items-start mb-6">
                          <div className={`p-3 rounded-2xl ${!isSuccess ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            <TrendingUp size={20}/>
                          </div>
                          <div className="text-right leading-none">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 italic">Target KPPN: {item.persenTarget}%</span>
                            <span className="text-[11px] font-bold text-blue-600 italic uppercase tracking-tighter">{item.jenis}</span>
                          </div>
                        </div>

                        <div className="mb-6">
                          <div className="flex justify-between items-end mb-1">
                            <span className="text-4xl font-black text-slate-800 tracking-tighter italic">{item.persenReal}%</span>
                            <span className={`text-[9px] font-black uppercase ${!isSuccess ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {isSuccess ? 'Melampaui Target' : 'Dibawah Target'}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-1000 ${!isSuccess ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(item.persenReal, 100)}%` }}></div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase italic">
                            <span className="text-slate-400 tracking-tighter">Realisasi (Rp)</span>
                            <span className="text-slate-800">Rp {item.nominalReal}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-black uppercase italic text-rose-600">
                            <span className="text-slate-400 tracking-tighter">Gap Anggaran</span>
                            <span className={item.nominalGap.includes('-') ? 'text-rose-600' : 'text-emerald-600'}>Rp {item.nominalGap}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 border-2 border-dashed border-slate-200 rounded-[3rem]">
                <p className="font-black uppercase tracking-[0.3em] text-[10px] italic">Modul {activeTab} dalam pengembangan...</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fade-in 0.6s ease-out forwards; }
      `}} />
    </div>
  );
}
