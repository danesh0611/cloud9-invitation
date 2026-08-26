import React from 'react';
import {
  Ticket,
  ShieldCheck,
  QrCode,
  LayoutDashboard,
  ShieldAlert,
  Download,
} from 'lucide-react';
import type { SystemStats } from '../types';
import { ChipsetLogo } from './ChipsetLogo';

export type NavTab = 'invitations' | 'verify' | 'scanner' | 'admin' | 'antifake';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  stats: SystemStats;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, stats }) => {
  return (
    <header className="sticky top-0 z-50 bg-[#08080C]/85 backdrop-blur-xl border-b border-amber-500/20 no-print transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Brand Logo with Official Chipset Technical Community Artwork */}
          <div
            onClick={() => onSelectTab('invitations')}
            className="cursor-pointer group shrink-0 transition-transform hover:scale-[1.02]"
          >
            <ChipsetLogo size="md" theme="dark" variant="full" />
          </div>

          {/* Yellow Themed Frosted Nav Tabs */}
          <nav className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-amber-500/5 backdrop-blur-md border border-amber-500/20 overflow-x-auto scrollbar-none">
            <button
              id="nav-btn-invitations"
              onClick={() => onSelectTab('invitations')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'invitations'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                  : 'text-slate-300 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>Invitations (120)</span>
            </button>

            <button
              id="nav-btn-verify"
              onClick={() => onSelectTab('verify')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'verify'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                  : 'text-slate-300 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>/verify Portal</span>
            </button>

            <button
              id="nav-btn-scanner"
              onClick={() => onSelectTab('scanner')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'scanner'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-400/30'
                  : 'text-slate-300 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>Live Scanner</span>
            </button>

            <button
              id="nav-btn-admin"
              onClick={() => onSelectTab('admin')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'admin'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                  : 'text-slate-300 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Admin Panel</span>
            </button>

            <button
              id="nav-btn-antifake"
              onClick={() => onSelectTab('antifake')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'antifake'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                  : 'text-slate-300 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Anti-Fake Lab</span>
            </button>
          </nav>

          {/* Right Action: Download Project ZIP & Realtime Attendance */}
          <div className="flex items-center gap-2.5">
            <a
              id="btn-download-project-zip"
              href="/api/export-project-zip"
              download="chipset-invitation-system.zip"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 hover:border-amber-400 transition-all shadow-sm active:scale-95"
              title="Download full project code as .ZIP to push to GitHub"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Download Code (.ZIP)</span>
            </a>

            {/* Realtime Attendance Pill */}
            <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-2xl bg-amber-500/5 backdrop-blur-md border border-amber-500/25 shadow-lg shadow-amber-950/20">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-widest text-amber-400 font-bold">Checked In</span>
                <span className="text-base font-mono font-black text-white leading-tight">
                  {stats.total_checked_in} <span className="text-slate-500 text-xs font-normal">/ {stats.total_selected}</span>
                </span>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_10px_#F59E0B]" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
