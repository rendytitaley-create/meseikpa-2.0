"use client";

import { useState, useEffect } from 'react';
import { LayoutDashboard, TableProperties, Menu, TrendingUp } from 'lucide-react';

export default function MeseIkpaV3() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dataKppn, setDataKppn] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTW, setSelectedTW] = useState(1);

  // Fungsi konversi teks "28,90" atau "1.922.953" menjadi angka murni
  const toNum = (val: string) => {
    if (!val) return 0;
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
      
      // OFFSET: TW 1 (Col 2), TW 2 (Col 9), TW 3 (Col 16), TW 4 (Col 23)
      const base = 2 + ((selectedTW - 1) * 7);

      const mapped = [2, 3, 4].map(idx => {
        const row = rows[idx];
        if (!row) return null;

        const paguTW = toNum(row[base]); // Kolom C / J / Q / X
        const pTgt = toNum(row[base + 1]); // Kolom D / K / R / Y
        const nReal = row[base + 4]; // Kolom G / N / U / AB
        const nGap = row[base + 5]; // Kolom H / O / V / AC
        const pReal = toNum(row[base + 6]); // Kolom I / P / W / AD

        return {
          jenis: row[1],
          pTarget: pTgt,
          pReal: pReal,
          nReal: nReal,
          nGap: nGap,
          isStarted: paguTW > 0,
          isSuccess: pReal >= pTgt
        };
      });
      
      setDataKppn(mapped.filter(i => i !== null));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchSheetData(); }, [selectedTW]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-[#0F172A] transition-all duration-300 flex flex-col`}>
        <div className="h-16 flex items-center px-6 bg-slate-900 border-b border-white/5 font-black text-white italic tracking-tighter uppercase">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center mr-3 not-italic">M</div>
          {sidebarOpen && "Meseikpa 3.0"}
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[{id:'dashboard', label:'Dashboard Utama', icon:<LayoutDashboard size={20}/>}].map(item => (
            <button key={item.id} className="w-full flex items-center p-3 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
              {item.icon} {sidebarOpen && <span className="ml-3 text-[11px] font-bold uppercase tracking-widest">{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500"><Menu size={20} /></button>
          <div className="flex items-center gap-4">
             <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
               {[1, 2, 3, 4].map(tw => (
                 <button key={tw} onClick={() => setSelectedTW(tw)} className={`px-5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${selectedTW === tw ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>TW {tw}</button>
               ))}
             </div>
             <button onClick={fetchSheetData} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">{loading ? "SYNCING..." : "REFRESH"}</button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto space-y-8 animate-in">
            <div className="bg-[#0F172A] rounded-[2.5rem] p-12 text-white relative overflow-hidden shadow-2xl">
               <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full -mr-48 -mt-48 blur-[100px]"></div>
               <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Dashboard Monitoring</h1>
               <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em] mt-3">Otomasi Kertas Kerja SAKTI • Triwulan {selectedTW}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {dataKppn.map((item, idx) => (
                !item.isStarted ? (
                  <div key={idx} className="bg-white p-10 rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center opacity-50">
                    <TableProperties className="text-slate-300 mb-2" size={24}/>
                    <p className="font-black uppercase tracking-widest text-[9px] text-slate-400">Belum Ada Alokasi Anggaran</p>
                  </div>
                ) : (
                  <div key={idx} className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all duration-500">
                    <div className="flex justify-between items-start mb-8">
                      <div className={`p-4 rounded-2xl shadow-sm ${item.isSuccess ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}><TrendingUp size={22}/></div>
                      <div className="text-right leading-none">
                        <span className="text-[9px] font-black text-slate-400 uppercase block mb-1 italic">Target KPPN: {item.pTarget}%</span>
                        <span className="text-[12px] font-black text-blue-600 italic uppercase">{item.jenis}</span>
                      </div>
                    </div>
                    <div className="mb-8">
                      <div className="flex justify-between items-end mb-3 font-black italic">
                        <span className="text-5xl text-slate-900 tracking-tighter">{item.pReal}%</span>
                        <span className={`text-[9px] uppercase px-3 py-1 rounded-full ${item.isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{item.isSuccess ? 'Melampaui Target' : 'Dibawah Target'}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div className={`h-full transition-all duration-1000 ${item.isSuccess ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]'}`} style={{ width: `${Math.min(item.pReal, 100)}%` }}></div>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-slate-50 space-y-3 font-black italic text-[12px] uppercase">
                      <div className="flex justify-between">
                        <span className="text-[9px] text-slate-400 tracking-widest">Realisasi</span>
                        <span className="text-slate-800">Rp {item.nReal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[9px] text-slate-400 tracking-widest">Gap Anggaran</span>
                        <span className={item.nGap.includes('-') ? 'text-rose-600' : 'text-emerald-600'}>Rp {item.nGap}</span>
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      </main>
      <style dangerouslySetInnerHTML={{ __html: `.animate-in { animation: fade-in 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards; } @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }` }} />
    </div>
  );
}
