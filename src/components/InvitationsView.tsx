import React, { useState } from 'react';
import { Download, Search, Sparkles, Filter, CheckCircle2, Layers, RefreshCw, Eye, Mail } from 'lucide-react';
import type { Participant } from '../types';
import { InvitationCard } from './InvitationCard';
import { ChipsetLogo } from './ChipsetLogo';
import { generateBulkInvitationsZip } from '../utils/bulkExport';
import { BulkEmailModal } from './BulkEmailModal';

interface InvitationsViewProps {
  participants: Participant[];
  onVerifyClick: (id: string) => void;
  onRefresh: () => void;
}

export const InvitationsView: React.FC<InvitationsViewProps> = ({
  participants,
  onVerifyClick,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [theme, setTheme] = useState<'cyber' | 'dark' | 'light'>('cyber');
  const [viewMode, setViewMode] = useState<'grid' | 'spotlight'>('grid');
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // Bulk ZIP progress state
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, name: '' });

  // Only SELECTED participants receive invitations
  const selectedParticipants = participants.filter((p) => p.selection_status === 'SELECTED');

  // Extract unique teams
  const teams = Array.from(
    new Set(selectedParticipants.map((p) => p.team_name).filter(Boolean))
  ) as string[];

  // Filtered list
  const filtered = selectedParticipants.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.unique_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.team_name && p.team_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTeam = selectedTeam === 'ALL' || p.team_name === selectedTeam;

    return matchesSearch && matchesTeam;
  });

  const handleBulkZipDownload = async () => {
    if (selectedParticipants.length === 0) return;
    try {
      setIsExportingZip(true);
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const zipBlob = await generateBulkInvitationsZip(
        selectedParticipants,
        baseUrl,
        (current, total, name) => {
          setExportProgress({ current, total, name });
        }
      );

      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Chipset_Invitations_${selectedParticipants.length}_Selected.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating zip:', err);
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Yellow Theme & Chipset Community Identity */}
      <div className="bg-gradient-to-r from-amber-500/10 via-[#141108] to-[#08080C] border-2 border-amber-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl shadow-amber-950/40">
        <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Sparkles className="w-3.5 h-3.5" />
                Chipset Invitation Engine
              </span>
              <span className="text-xs text-amber-200/80 font-mono">
                Only <code className="text-amber-400 font-bold">selection_status = SELECTED</code>
              </span>
            </div>

            <div className="mb-2">
              <ChipsetLogo size="lg" theme="dark" variant="full" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white mt-3">
              Personalized <span className="font-extrabold text-amber-400">Pass Generator & Registry</span>
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Every pass is generated with the official <strong className="text-amber-400">CHIPSET</strong> logo, participant name, cryptographically unique ID (<code className="text-amber-300 font-mono">C9-XXXXXX</code>), and a tamper-proof verification QR code.
            </p>
          </div>

          {/* Bulk Download & Email Actions in Electric Yellow */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-bulk-email-all"
              onClick={() => setIsEmailModalOpen(true)}
              disabled={selectedParticipants.length === 0}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-amber-500/30 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>Email All ({selectedParticipants.length} Selected)</span>
            </button>

            <button
              id="btn-bulk-download-zip"
              onClick={handleBulkZipDownload}
              disabled={isExportingZip || selectedParticipants.length === 0}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {isExportingZip ? 'Generating ZIP...' : `Download ZIP (${selectedParticipants.length})`}
            </button>

            <button
              id="btn-refresh-invitations"
              onClick={onRefresh}
              className="p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all cursor-pointer shadow-md"
              title="Refresh participant list"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar during ZIP Generation */}
        {isExportingZip && (
          <div className="mt-5 pt-5 border-t border-amber-500/20">
            <div className="flex items-center justify-between text-xs text-amber-300 mb-2 font-bold">
              <span>Generating Chipset invitations archive with embedded logos... ({exportProgress.current} / {exportProgress.total})</span>
              <span className="font-mono">{Math.round((exportProgress.current / exportProgress.total) * 100)}%</span>
            </div>
            <div className="w-full bg-black/50 rounded-full h-2.5 overflow-hidden border border-amber-500/30">
              <div
                className="bg-amber-400 h-full transition-all duration-200 shadow-[0_0_12px_#F59E0B]"
                style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-amber-200/90 mt-2 truncate">
              Embedding Chipset logo for: <strong className="text-white">{exportProgress.name}</strong>
            </p>
          </div>
        )}
      </div>

      {/* Control Bar: Search, Filters & Card Style */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#0e0d14]/90 backdrop-blur-xl border border-amber-500/25 rounded-2xl p-4 shadow-xl">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-amber-400/80 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-invitations"
            type="text"
            placeholder="Search by name, email, selection ID, or team..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-black/40 border border-amber-500/30 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
          />
        </div>

        {/* Team Filter */}
        {teams.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-400" />
            <select
              id="select-team-filter"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-black/50 border border-amber-500/30 text-amber-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400"
            >
              <option value="ALL" className="bg-slate-900">All Teams ({teams.length})</option>
              {teams.map((t) => (
                <option key={t} value={t} className="bg-slate-900">
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Card Theme Picker */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-300/80 font-bold hidden sm:inline">Card Theme:</span>
          <div className="inline-flex rounded-xl bg-black/50 border border-amber-500/30 p-1">
            <button
              onClick={() => setTheme('cyber')}
              className={`px-3 py-1.5 text-xs rounded-lg font-black transition-all cursor-pointer ${
                theme === 'cyber' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              Gold Cyber
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`px-3 py-1.5 text-xs rounded-lg font-black transition-all cursor-pointer ${
                theme === 'dark' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              Obsidian
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`px-3 py-1.5 text-xs rounded-lg font-black transition-all cursor-pointer ${
                theme === 'light' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              Amber Light
            </button>
          </div>
        </div>

        {/* View Switcher: Grid vs Spotlight */}
        <div className="flex items-center gap-1 border-l border-amber-500/20 pl-3">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2.5 rounded-xl transition-all cursor-pointer ${
              viewMode === 'grid' ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50' : 'text-slate-400 hover:text-amber-300'
            }`}
            title="Grid view"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('spotlight')}
            className={`p-2.5 rounded-xl transition-all cursor-pointer ${
              viewMode === 'spotlight' ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50' : 'text-slate-400 hover:text-amber-300'
            }`}
            title="Single card spotlight"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Count / Status pill */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Showing <strong className="text-white">{filtered.length}</strong> of{' '}
          <strong className="text-amber-400">{selectedParticipants.length}</strong> selected Chipset participant passes
        </span>
        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" /> All Chipset QR codes verified active
        </span>
      </div>

      {/* Spotlight View */}
      {viewMode === 'spotlight' && filtered.length > 0 && (
        <div className="flex flex-col items-center py-8 bg-[#0d0c14] rounded-3xl border-2 border-amber-500/30 shadow-2xl">
          {/* Card Carousel Navigator */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setSpotlightIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1))}
              className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-black text-amber-300 cursor-pointer transition-all"
            >
              ← Previous
            </button>
            <span className="text-xs font-mono text-amber-400 font-bold">
              {spotlightIndex + 1} / {filtered.length}
            </span>
            <button
              onClick={() => setSpotlightIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0))}
              className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-black text-amber-300 cursor-pointer transition-all"
            >
              Next →
            </button>
          </div>

          <InvitationCard
            participant={filtered[Math.min(spotlightIndex, filtered.length - 1)]}
            theme={theme}
            onVerifyClick={onVerifyClick}
          />
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((participant) => (
            <div
              key={participant.unique_id}
              className="flex justify-center p-4 rounded-3xl bg-[#0c0b12] border border-amber-500/20 hover:border-amber-400/60 transition-all duration-300 shadow-xl hover:shadow-amber-500/15"
            >
              <InvitationCard
                participant={participant}
                theme={theme}
                onVerifyClick={onVerifyClick}
                compact={false}
              />
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-[#0c0b12] rounded-3xl border border-amber-500/20">
          <p className="text-slate-400 text-sm">No selected participants match your search criteria.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedTeam('ALL');
            }}
            className="mt-3 text-xs text-amber-400 underline font-semibold cursor-pointer"
          >
            Clear search filters
          </button>
        </div>
      )}

      {/* Bulk Email Dispatcher Modal */}
      <BulkEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        participants={participants}
      />
    </div>
  );
};
