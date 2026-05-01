"use client";

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, TableProperties, 
  ArrowLeftRight, ClipboardCheck, Wallet, Menu, User, TrendingUp
} from 'lucide-react';

export default function MeseIkpaV3() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // STATE UNTUK MENYIMPAN DATA DARI GOOGLE SHEETS
  const [dataKppn, setDataKppn] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- FUNGSI AMBIL DATA (FETCHER) ---
  const fetchSheetData = async () => {
    setLoading(true);
    const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSUbViIHpH0RcdJJQ3PuiEqY187u6Mg16jFnYFpG6CEIucA0b7PIOA6HYcMuhIXR3ItTAC-izjeoQXr/pub?gid=2098386606&single=true&output=csv";
    
    try {
      const response = await fetch(sheetUrl);
      const csvText = await response.text();
      const rows = csvText.split('\n').map(row => row.split(','));
      
      // PERBAIKAN DI SINI:
      // rows[2] = Baris 3 di Excel (Pegawai 51)
      // rows[3] = Baris 4 di Excel (Barang 52)
      // rows[4] = Baris 5 di Excel (Modal 53)
      const cleanData = [
        { jenis: rows[2][1], pagu: rows[2][2], target: rows[2][4], real: rows[2][6], persen: rows[2][8] },
        { jenis: rows[3][1], pagu: rows[3][2], target: rows[3][4], real: rows[3][6], persen: rows[3][8] },
        { jenis: rows[4][1], pagu: rows[4][2], target: rows[4][4], real: rows[4][6], persen: rows[4][8] }
      ];
      
      // Filter agar data yang kosong (seperti belanja modal jika Rp 0) tidak merusak tampilan
      setDataKppn(cleanData.filter(item => item.jenis)); 
      
    } catch (error) {
      console.error("Gagal mengambil data:", error);
    } finally {
      setLoading(false);
    }
  };
  // Jalankan pengambilan data saat aplikasi dibuka
  useEffect(() => {
    fetchSheetData();
  }, []);

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
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">M</div>
          {sidebarOpen && <span className="ml-3 font-black text-white italic tracking-tighter">MESEIKPA 3.0</span>}
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2">
          {menuList.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center p-3 rounded-2xl transition-all ${
                activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'hover:bg-white/5 text-slate-400'
              }`}
            >
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
            
            {activeTab === 'dashboard' && (
              <div className="space-y-8 animate-in">
                {/* Banner Utama */}
                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                   <div className="relative z-10">
                      <h1 className="text-3xl font-black italic tracking-tighter leading-none">Dashboard Monitoring</h1>
                      <p className="text-blue-400 text-xs font-bold uppercase tracking-[0.3em] mt-2">Otomasi Kertas Kerja SAKTI</p>
                   </div>
                </div>

                {/* Ringkasan dari Spreadsheet */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {dataKppn.map((item, idx) => (
                     <div key={idx} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
                        <div className="flex justify-between items-start mb-6">
                           <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                              <TrendingUp size={24}/>
                           </div>
                           <div className="text-right leading-none">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Realisasi s.d TW I</span>
                              <span className="text-xs font-bold text-blue-600 italic uppercase tracking-tighter">{item.jenis}</span>
                           </div>
                        </div>
                        <div className="flex items-end justify-between">
                           <div>
                              <span className="text-5xl font-black text-slate-800 tracking-tighter italic">{item.persen}%</span>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Terhadap Target KPPN</div>
                           </div>
                           <div className="text-right">
                              <span className="text-[11px] font-black text-slate-400 block uppercase">Nominal Realisasi</span>
                              <span className="text-sm font-bold text-slate-700 italic">Rp {item.real}</span>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}

            {activeTab !== 'dashboard' && (
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
