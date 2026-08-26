import React, { useState, useEffect, useCallback } from 'react';
import type { Participant, SystemStats, ScanAttemptLog } from './types';
import { Navbar, type NavTab } from './components/Navbar';
import { InvitationsView } from './components/InvitationsView';
import { VerifierView } from './components/VerifierView';
import { ScannerView } from './components/ScannerView';
import { AdminDashboard } from './components/AdminDashboard';
import { AntiFakeExplainer } from './components/AntiFakeExplainer';
import { InvitationCard } from './components/InvitationCard';
import { ChipsetLogo } from './components/ChipsetLogo';
import { Sparkles, ShieldCheck, X } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('invitations');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    total_imported: 0,
    total_selected: 0,
    total_checked_in: 0,
    total_not_checked_in: 0,
    invalid_attempts: 0,
    checked_in_rate: 0,
  });
  const [logs, setLogs] = useState<ScanAttemptLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Target ID passed to verifier portal
  const [verifyTargetId, setVerifyTargetId] = useState<string>('');

  // Selected participant for modal view
  const [modalParticipant, setModalParticipant] = useState<Participant | null>(null);

  // Authentication states for Staff Console
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  // Check if current URL was loaded as a direct participant invitation pass view
  const isParticipantView = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('id');

  // Load auth state from session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = sessionStorage.getItem('chipset_auth');
      if (session === 'true') {
        setIsAuthenticated(true);
      }
    }
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === 'googlexchipset') {
      setIsAuthenticated(true);
      setAuthError('');
      sessionStorage.setItem('chipset_auth', 'true');
    } else {
      setAuthError('❌ Invalid password. Access Denied.');
    }
  };

  // Fetch all system data
  const refreshData = useCallback(async () => {
    try {
      const [partsRes, statsRes, logsRes] = await Promise.all([
        fetch('/api/participants'),
        fetch('/api/stats'),
        fetch('/api/logs'),
      ]);

      if (partsRes.ok) {
        const partsData = await partsRes.json();
        setParticipants(partsData);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle URL params routing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    const tabParam = params.get('tab') as NavTab;
    const pathname = window.location.pathname;

    if (idParam) {
      setVerifyTargetId(idParam);
      setCurrentTab('verify');
    } else if (pathname.includes('/verify')) {
      setCurrentTab('verify');
    } else if (tabParam && ['invitations', 'verify', 'scanner', 'admin', 'antifake'].includes(tabParam)) {
      setCurrentTab(tabParam);
    }

    refreshData();
  }, [refreshData]);

  // Tab change handler with URL sync
  const handleSelectTab = (tab: NavTab) => {
    setCurrentTab(tab);
    const url = new URL(window.location.href);
    if (tab === 'verify') {
      if (verifyTargetId) {
        url.searchParams.set('id', verifyTargetId);
      } else {
        url.searchParams.delete('id');
      }
      url.searchParams.set('tab', 'verify');
    } else {
      url.searchParams.delete('id');
      url.searchParams.set('tab', tab);
    }
    window.history.replaceState({}, '', url.toString());
  };

  const handleVerifyClick = (id: string) => {
    setVerifyTargetId(id);
    handleSelectTab('verify');
  };

  const handleViewInvitation = (id: string) => {
    const p = participants.find((item) => item.unique_id === id);
    if (p) {
      setModalParticipant(p);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080C] text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
      {/* Yellow/Amber Ambient Background Illumination Orbs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[650px] h-[650px] bg-amber-500/18 rounded-full blur-[160px]" />
        <div className="absolute top-[35%] -right-[15%] w-[600px] h-[600px] bg-yellow-500/12 rounded-full blur-[180px]" />
        <div className="absolute -bottom-[10%] left-[25%] w-[550px] h-[550px] bg-amber-600/15 rounded-full blur-[160px]" />
      </div>

      {/* Sticky Frosted Navbar */}
      {!isParticipantView && (
        <Navbar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          stats={stats}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 backdrop-blur-xl border border-amber-500/30 flex items-center justify-center animate-pulse text-amber-400 shadow-2xl shadow-amber-500/20">
              <Sparkles className="w-8 h-8 animate-spin" />
            </div>
            <p className="text-sm font-mono font-bold text-amber-300">
              Loading Chipset Passport Verification Database...
            </p>
          </div>
        ) : !isParticipantView && !isAuthenticated ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-[#0d0c12]/90 border-2 border-amber-500/30 p-8 sm:p-10 rounded-3xl backdrop-blur-2xl shadow-2xl shadow-amber-950/20">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ShieldCheck className="w-8 h-8 animate-pulse" />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-black text-white tracking-tight">Staff Authentication Required</h2>
                  <p className="mt-1.5 text-xs text-slate-400">Please enter the security password to unlock the admin console.</p>
                </div>
              </div>
              <form className="mt-8 space-y-6" onSubmit={handleLoginSubmit}>
                <div className="rounded-md shadow-sm -space-y-px">
                  <div>
                    <label className="sr-only">Password</label>
                    <input
                      type="password"
                      required
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="appearance-none rounded-xl relative block w-full px-4 py-3 bg-black/60 border border-slate-700 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm font-medium text-center tracking-widest"
                      placeholder="••••••••••••••"
                    />
                  </div>
                </div>
                {authError && (
                  <p className="text-xs text-rose-400 font-semibold text-center font-mono">
                    {authError}
                  </p>
                )}
                <div>
                  <button
                    type="submit"
                    className="group relative w-full flex justify-center py-3 px-4 border border-amber-500/30 text-sm font-black rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg shadow-amber-500/25 active:scale-95 cursor-pointer"
                  >
                    Unlock Console
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <>
            {currentTab === 'invitations' && (
              <InvitationsView
                participants={participants}
                onVerifyClick={handleVerifyClick}
                onRefresh={refreshData}
              />
            )}

            {currentTab === 'verify' && (
              <VerifierView
                initialId={verifyTargetId}
                onNavigateToScanner={isParticipantView ? undefined : () => handleSelectTab('scanner')}
              />
            )}

            {currentTab === 'scanner' && (
              <ScannerView
                participants={participants}
                onCheckInCompleted={refreshData}
              />
            )}

            {currentTab === 'admin' && (
              <AdminDashboard
                stats={stats}
                participants={participants}
                logs={logs}
                onRefresh={refreshData}
                onViewInvitation={handleViewInvitation}
              />
            )}

            {currentTab === 'antifake' && (
              <AntiFakeExplainer participants={participants} />
            )}
          </>
        )}
      </main>

      {/* Modal for Single Invitation Inspection with Yellow Frosted Backdrop */}
      {modalParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative bg-[#0d0c12]/95 backdrop-blur-2xl border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl shadow-amber-950/80">
            <button
              onClick={() => setModalParticipant(null)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <InvitationCard
              participant={modalParticipant}
              onVerifyClick={(id) => {
                setModalParticipant(null);
                handleVerifyClick(id);
              }}
            />
          </div>
        </div>
      )}

      {/* Yellow Themed Frosted Footer */}
      <footer className="border-t border-amber-500/20 bg-[#08080C]/90 backdrop-blur-xl py-6 mt-12 text-xs text-slate-400 no-print relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ChipsetLogo size="sm" theme="dark" variant="full" />
            <span className="text-slate-500 hidden md:inline">|</span>
            <span className="hidden md:inline text-slate-400">Personalized Invitation & QR Verification System</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> Database-Authoritative Truth
            </span>
            <span className="text-amber-400 font-mono font-bold">CHIPSET 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
