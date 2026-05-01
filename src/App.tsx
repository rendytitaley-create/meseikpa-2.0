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

  // Fungsi pembersihan angka yang lebih ketat
  const cleanFormat = (val: string) => {
    if (!val) return 0;
    // Hilangkan titik ribuan, ubah koma desimal menjadi titik
    let clean = val.replace(/\./g, "").replace(",", ".");
    return parseFloat(clean) || 0;
  };

  const fetchSheetData = async () => {
    setLoading(true);
    const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSUbViIHpH0RcdJJQ3PuiEqY187u6Mg16jFnYFpG6CEIucA0b7PIOA6HYcMuhIXR3ItTAC-izjeoQXr/pub?gid=2098386606&single=true&output=csv";
    
    try {
      const response = await fetch(sheetUrl);
      const csvText = await response.text();
      const rows = csvText.split('\n').map(row => row.split(','));
      
      // MAPPING KOLOM BERDASARKAN ABJAD SPREADSHEET ANDA:
      // TW I : C(2)=Pagu, D(3)=%Tgt, E(4)=TgtRp, F(5)=RPD, G(6)=RealRp, H(7)=Gap, I(8)=%Real
      // TW II: J(9)=Pagu, K(10)=%Tgt, L(11)=TgtRp, M(12)=RPD, N(13)=RealRp, O(14)=Gap, P(15)=%Real
      
      // Lonjakan antar TW adalah tepat 7 kolom
      const offset = (selectedTW - 1) * 7;
      
      const colPersenTgt = 3 + offset;
      const colNominalReal = 6 + offset;
      const colNominalGap = 7 + offset;
      const colPersenReal = 8 + offset;

      const cleanData = [2, 3, 4].map(rowIdx => {
        const row = rows[rowIdx];
        if (!row) return null;

        const pTarget = cleanFormat(row[colPersenTgt]);
        const pReal = cleanFormat(row[colPersenReal]);
        const nReal = row[colNominalReal] || "0";
        const nGap = row[colNominalGap] || "0";

        // Syarat data dianggap ada: Jika Pagu (base kolom) tidak kosong/0
        const isStarted = cleanFormat(row[2 + offset]) > 0;

        return {
          jenis: row[1] || "",
          persenTarget: pTarget,
          nominalReal: nReal,
          nominalGap: nGap,
          persenReal: pReal,
          isSuccess: pReal >= pTarget,
          isStarted: isStarted
        };
      });
      
      setDataKppn(cleanData.filter(item => item !== null));
    } catch (error) {
      console.error("Gagal sinkronisasi:", error);
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
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black">M</div>
          {sidebarOpen && <span className="ml-3 font-black text-white italic tracking-tighter uppercase">Meseikpa 3.0</span>}
        </div>
        <nav className="flex-1 py-6 px-3 space-y-2">
          {menuList.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center p-3 rounded-2xl transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'hover:bg-white/5 text-slate-400'}`}>
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
             <div className="flex gap-1 p-1 bg-slate-100 rounded-xl shadow-inner">
               {[1, 2, 3, 4].map(tw => (
                 <button key={tw} onClick={() => setSelectedTW(tw)} className={`px-5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${selectedTW === tw ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>TW {tw}</button>
               ))}
             </div>
             <button onClick={fetchSheetData} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
                {loading ? "SYNCING..." : "REFRESH"}
             </button>
             <div className="h-8 w-px bg-slate-200 mx-2"></div>
             <div className="text-right leading-none">
                <span className="text-[10px] font-black block text-slate-800 uppercase italic">Administrator</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter tracking-widest">BPS Kab. Seram Bagian Barat</span>
             </div>
             <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200"><User size={18}/></div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' ? (
              <div className="space-y-8 animate-in">
                <div className="bg-[#0F172A] rounded-[2.5rem] p-12 text-white relative overflow-hidden shadow-2xl border border-white/5">
                   <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full -mr-48 -mt-48 blur-[100px]"></div>
                   <div className="relative z-10">
                      <h1 className="text-4xl font-black italic tracking-tighter leading-none uppercase">Dashboard Monitoring</h1>
                      <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em] mt-3 opacity-80">Otomasi Kertas Kerja SAKTI • Triwulan {selectedTW}</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {dataKppn.map((item, idx) => {
                    // Jika TW belum berjalan (Pagu = 0)
                    if (!item.isStarted) {
                      return (
                        <div key={idx} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                           <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300"><TableProperties size={20}/></div>
                           <p className="font-black uppercase tracking-[0.2em] text-[9px] text-slate-400 italic">Data Periode Belum Tersedia</p>
                        </div>
                      );
                    }

                    return (
                      <div key={idx} className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all duration-500 group">
                        <div className="flex justify-between items-start mb-8">
                          <div className={`p-4 rounded-[1.2rem] shadow-sm transition-all duration-500 ${!item.isSuccess ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                            <TrendingUp size={22}/>
                          </div>
                          <div className="text-right leading-none">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] block mb-2 italic">Target KPPN: {item.persenTarget}%</span>
                            <span className="text-[12px] font-black text-blue-600 italic uppercase tracking-tighter">{item.jenis}</span>
                          </div>
                        </div>

                        <div className="mb-8">
                          <div className="flex justify-between items-end mb-3">
                            <span className="text-5xl font-black text-slate-900 tracking-tighter italic">{item.persenReal}%</span>
                            <span className={`text-[9px] font-black uppercase tracking-wider py-1 px-3 rounded-full ${!item.isSuccess ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {item.isSuccess ? 'Melampaui Target' : 'Dibawah Target'}
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                            <div className={`h-full rounded-full transition-all duration-1000 ${!item.isSuccess ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'}`} style={{ width: `${Math.min(item.persenReal, 100)}%` }}></div>
                          </div>
                        </div>

                        <div className="pt-6 border-t border-slate-50 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Realisasi (Rp)</span>
                            <span className="text-[13px] font-black text-slate-800 italic">Rp {item.nominalReal}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Gap Anggaran</span>
                            <span className={`text-[13px] font-black italic ${item.nominalGap.includes('-') ? 'text-rose-600' : 'text-emerald-600'}`}>Rp {item.nominalGap}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[50vh] text-slate-300 border-2 border-dashed border-slate-100 rounded-[4rem] space-y-4">
                <div className="animate-pulse bg-slate-50 p-4 rounded-full"><TableProperties size={32}/></div>
                <p className="font-black uppercase tracking-[0.4em] text-[10px] italic">Modul {activeTab} Sedang Sinkronisasi...</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fade-in 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
      `}} />
    </div>
  );
}
