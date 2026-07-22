import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { BarChart3, Bell, Eye, LogOut, Search, Settings } from "lucide-react";
import { base44 } from "@/api/base44Client";

const links = [
  ["/dashboard", "السوق", BarChart3], ["/search", "البحث", Search],
  ["/watchlists", "المتابعة", Eye], ["/alerts", "التنبيهات", Bell],
  ["/profile", "الحساب", Settings]
];
export default function KmyLayout() {
  return <div dir="rtl" className="min-h-screen bg-[#0b1220] text-slate-100">
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b1220]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <NavLink to="/dashboard" className="text-xl font-black text-emerald-400">كيمي</NavLink>
        <nav className="flex flex-1 gap-1 overflow-x-auto">{links.map(([to,label,Icon])=><NavLink key={to} to={to} className={({isActive})=>`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm ${isActive?'bg-white/10 text-white':'text-slate-400 hover:text-white'}`}><Icon className="h-4 w-4"/>{label}</NavLink>)}</nav>
        <button aria-label="تسجيل الخروج" onClick={()=>{localStorage.removeItem('kmy_session_id');base44.auth.logout('/')}} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4"/></button>
      </div>
    </header><main className="mx-auto max-w-7xl px-4 py-8"><Outlet/></main>
  </div>;
}