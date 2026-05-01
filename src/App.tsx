"use client";

import { useState } from 'react';
import { 
  LayoutDashboard, TableProperties, BarChart3, 
  ArrowLeftRight, ClipboardCheck, Wallet, Menu, User, LogOut
} from 'lucide-react';

export default function MeseIkpaV3() {
  // 1. STATE UNTUK MENU
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 2. DAFTAR MENU (Sesuai 6 Sheet Anda)
  const menuList = [
    { id: 'dashboard', label: 'Dashboard Utama', icon: <LayoutDashboard size={20}/> },
    { id: 'kertas-kerja', label: 'Kertas Kerja (Detail)', icon: <TableProperties size={20}/> },
    { id: 'rekap-ro', label: 'Rekapitulasi RO', icon: <BarChart3 size={20}/> },
    { id: 'rekap-tw', label: 'Rekapitulasi TW', icon: <BarChart3 size={20}/> },
    { id: 'monitor-kppn', label: 'KPPN vs BPS SBB', icon: <ArrowLeftRight size={20}/> },
    { id: 'capaian-output', label: 'Capaian Output', icon: <ClipboardCheck size={20}/> },
    { id: 'ls-gu', label: 'Monitoring LS & GU', icon: <Wallet size={20}/> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* --- SIDEBAR (NAVIGASI KIRI) --- */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-[#0F172A] text-slate-300 transition-all duration-300 flex flex-col`}>
        <div className="h-16 flex items-center px-6 bg-slate-900 border-b border-white/5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black">M</div>
          {sidebarOpen && <span className="ml-3 font-black text-white italic">MESEIKPA 3.0</span>}
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {menuList.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center p-3 rounded-xl transition-all ${
                activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5 text-slate-400'
              }`}
            >
              {item.icon}
              {sidebarOpen && <span className="ml-3 text-xs font-bold uppercase tracking-wider">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button className="w-full flex items-center p-3 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all text-xs font-bold uppercase">
            <LogOut size={20} className="mr-3"/> {sidebarOpen && "Logout"}
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT (BAGIAN KANAN) --- */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right leading-none">
              <span className="text-[11px] font-black block text-slate-800 uppercase tracking-widest">Admin BPS SBB</span>
              <span className="text-[9px] font-bold text-slate-400">Mode Otomatis Spreadsheet</span>
            </div>
            <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-slate-500"><User size={20}/></div>
          </div>
        </header>

        {/* ISI MENU (Akan Kita Isi Satu Per Satu) */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">
            
            {activeTab === 'dashboard' && (
              <div className="animate-in fade-in slide-in-from-bottom duration-500">
                <h1 className="text-2xl font-black text-slate-800 italic">Selamat Datang di MESEIKPA 3.0</h1>
                <p className="text-slate-500 text-sm mt-1">Data sedang dihubungkan ke Google Sheets Anda...</p>
                {/* Bagian ini nanti akan berisi grafik ringkasan */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                   <div className="h-32 bg-white rounded-3xl border border-slate-200 shadow-sm border-b-4 border-b-blue-600"></div>
                   <div className="h-32 bg-white rounded-3xl border border-slate-200 shadow-sm border-b-4 border-b-emerald-600"></div>
                   <div className="h-32 bg-white rounded-3xl border border-slate-200 shadow-sm border-b-4 border-b-orange-600"></div>
                </div>
              </div>
            )}

            {/* Placeholder untuk menu lainnya */}
            {activeTab !== 'dashboard' && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
                <p className="font-black uppercase tracking-widest text-xs italic">Modul {activeTab} sedang disiapkan...</p>
              </div>
            )}

          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fade-in 0.5s ease-out forwards; }
      `}} />
    </div>
  );
}
