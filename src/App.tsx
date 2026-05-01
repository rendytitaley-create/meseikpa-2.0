"use client";

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, TableProperties, 
  ArrowLeftRight, ClipboardCheck, Wallet, Menu, User, TrendingUp
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
      
      // TW I mulai dari indeks 2 (Kolom C)
      // TW II mulai dari indeks 9 (Kolom J)
      const baseCol = selectedTW === 1 ? 2 : 9;

      // Ambil Baris 3, 4, dan 5
      const cleanData = [
        { 
          jenis: rows[2]?.[1] || "Pegawai", 
          pagu: rows[2]?.[baseCol], 
          persenTarget: rows[2]?.[baseCol + 1], 
          nominalTarget: rows[2]?.[baseCol + 2], 
          nominalReal: rows[2]?.[baseCol + 4], 
          nominalGap: rows[2]?.[baseCol + 5], 
          persenReal: rows[2]?.[baseCol + 6] 
        },
        { 
          jenis: rows[3]?.[1] || "Barang", 
          pagu: rows[3]?.[baseCol], 
          persenTarget: rows[3]?.[baseCol + 1],
          nominalTarget: rows[3]?.[baseCol + 2],
          nominalReal: rows[3]?.[baseCol + 4],
          nominalGap: rows[3]?.[baseCol + 5],
          persenReal: rows[3]?.[baseCol + 6]
        },
        { 
          jenis: rows[4]?.[1] || "Modal", 
          pagu: rows[4]?.[baseCol], 
          persenTarget: rows[4]?.[baseCol + 1],
          nominalTarget: rows[4]?.[baseCol + 2],
          nominalReal: rows[4]?.[baseCol + 4],
          nominalGap: rows[4]?.[baseCol + 5],
          persenReal: rows[4]?.[baseCol + 6]
        }
      ];
      
      setDataKppn(cleanData.filter(item => item.pagu !== undefined));
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
      
      {/* SIDEBAR */}
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

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shadow-sm">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-4">
             <button onClick={fetchSheetData} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all">
                {loading ? "Sinkronisasi..." : "Refresh Data"}
             </button>
             <div className="h-8 w-px bg-slate-200"></div>
             <div className="flex items-center gap-3">
                <div className="text-right leading-none">
                  <span className="text-[11px] font-black block text-slate-800 uppercase italic">Administrator</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">BPS Seram Bagian Barat</span>
                </div>
                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20"><User size={20}/></div>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 custom-scrollbar bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto">
            
            {activeTab === 'dashboard' ? (
              <div className="space-y-8 animate-in">
                {/* Tombol Pilih TW */}
                <div className="flex gap-2 p-1 bg-slate-200 w-fit rounded-2xl shadow-inner">
                   {[1, 2, 3, 4].map(tw => (
                     <button key={tw} onClick={() => setSelectedTW(tw)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedTW === tw ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                       TW {tw}
                     </button>
                   ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {dataKppn.map((item, idx) => {
                    const pTarget = parseFloat(item.persenTarget) || 0;
                    const pReal = parseFloat(item.persenReal) || 0;
                    const isWarning = pReal < pTarget;

                    return (
                      <div key={idx} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                          <div className={`p-3 rounded-2xl ${isWarning ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            <TrendingUp size={20}/>
                          </div>
                          <div className="text-right leading-none">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 italic">Target: {item.persenTarget}%</span>
                            <span className="text-[11px] font-bold text-blue-600 italic uppercase tracking-tighter">{item.jenis}</span>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between items-end mb-1">
                            <span className="text-4xl font-black text-slate-800 tracking-tighter italic">{item.persenReal || 0}%</span>
                            <span className={`text-[9px] font-black uppercase ${isWarning ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {isWarning ? 'Di Bawah Target' : 'Melampaui Target'}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-1000 ${isWarning ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pReal, 100)}%` }}></div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase italic">
                            <span className="text-slate-400 tracking-tighter">Realisasi (Rp)</span>
                            <span className="text-slate-800">Rp {item.nominalReal || 0}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-black uppercase italic">
                            <span className="text-slate-400 tracking-tighter">Gap Anggaran (H/O)</span>
                            <span className={(item.nominalGap || "").includes('-') ? 'text-rose-600' : 'text-emerald-600'}>
                              Rp {item.nominalGap || 0}
                            </span>
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
