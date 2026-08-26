import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import {
  Users,
  UserCheck,
  UserX,
  ShieldAlert,
  Search,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  Activity,
  Eye,
  Sparkles,
  Shuffle,
  X,
} from 'lucide-react';
import type { Participant, SystemStats, ScanAttemptLog } from '../types';
import { formatTimestamp } from '../utils/idGenerator';

interface AdminDashboardProps {
  stats: SystemStats;
  participants: Participant[];
  logs: ScanAttemptLog[];
  onRefresh: () => void;
  onViewInvitation: (id: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  participants,
  logs,
  onRefresh,
  onViewInvitation,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [checkInFilter, setCheckInFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'participants' | 'logs' | 'import' | 'lottery'>('participants');
  const [importing, setImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // Selection lottery draw state
  const [selectedCollegeFilter, setSelectedCollegeFilter] = useState('ALL');
  const [selectedYearFilter, setSelectedYearFilter] = useState('ALL');
  const [drawCount, setDrawCount] = useState(120);
  const [lotteryFeedback, setLotteryFeedback] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);

  // Swap candidates state
  const [swapOriginal, setSwapOriginal] = useState<Participant | null>(null);
  const [swapSearch, setSwapSearch] = useState('');
  const [swapping, setSwapping] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter participants
  const filteredParticipants = participants.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.unique_id.toLowerCase().includes(q) ||
      (p.team_name && p.team_name.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'ALL' || p.selection_status === statusFilter;
    const matchesCheckIn =
      checkInFilter === 'ALL' ||
      (checkInFilter === 'CHECKED_IN' && p.checked_in) ||
      (checkInFilter === 'NOT_CHECKED_IN' && !p.checked_in);

    return matchesSearch && matchesStatus && matchesCheckIn;
  });

  // Toggle check-in status directly from admin table
  const handleToggleCheckIn = async (participant: Participant) => {
    try {
      if (participant.checked_in) {
        await fetch(`/api/checkin/undo/${encodeURIComponent(participant.unique_id)}`, {
          method: 'POST',
        });
      } else {
        await fetch(`/api/checkin/${encodeURIComponent(participant.unique_id)}`, {
          method: 'POST',
        });
      }
      onRefresh();
    } catch (err) {
      console.error('Error toggling checkin:', err);
    }
  };

  // Export table as CSV
  const handleExportCsvReport = () => {
    const headers = [
      'Selection ID',
      'Name',
      'Email',
      'Team Name',
      'Selection Status',
      'Checked In',
      'Check-in Timestamp',
      'Verification Count',
      'Created At',
    ];

    const rows = participants.map((p) => [
      p.unique_id,
      `"${p.name.replace(/"/g, '""')}"`,
      p.email,
      `"${(p.team_name || '').replace(/"/g, '""')}"`,
      p.selection_status,
      p.checked_in ? 'YES' : 'NO',
      p.check_in_time ? `"${p.check_in_time}"` : 'N/A',
      p.verification_count || 0,
      p.created_at,
    ]);

    const csvString = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Chipset_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handle CSV file upload
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportFeedback(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rawData = results.data as any[];
          const validRows = rawData.map((row) => {
            const getVal = (possibleKeys: string[]) => {
              for (const k of possibleKeys) {
                if (row[k] !== undefined) return row[k];
                const foundKey = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.trim().toLowerCase());
                if (foundKey && row[foundKey] !== undefined) return row[foundKey];
              }
              return undefined;
            };

            const name = getVal(['Full Name', 'name', 'Name', 'participant_name']) || '';
            const email = getVal(['College Email ID', 'Personal Email ID', 'email', 'Email']) || '';
            const collegeEmail = getVal(['College Email ID', 'college_email', 'srm_email']);
            const personalEmail = getVal(['Personal Email ID', 'personal_email']);
            const regNum = getVal(['University Registration Number', 'registration_number', 'Registration Number']);
            const team = getVal(['team_name', 'team', 'Team']);
            const yearOfStudy = getVal(['Which year of study are you currently in?', 'year_of_study', 'Year of study', 'Year']);
            const phone = getVal(['Enter your registered phone number.', 'phone', 'Phone']);

            let college = getVal(['College Name', 'College', 'University', 'Institution']);
            if (!college && email) {
              const parts = String(email).split('@');
              if (parts.length === 2) {
                const domain = parts[1].split('.')[0].toUpperCase();
                if (domain !== 'GMAIL' && domain !== 'YAHOO' && domain !== 'OUTLOOK' && domain !== 'HOTMAIL') {
                  college = domain;
                } else {
                  college = 'PERSONAL';
                }
              }
            }

            return {
              name: String(name).trim(),
              email: String(email).trim().toLowerCase(),
              regNum: regNum ? String(regNum).trim() : undefined,
              team: team ? String(team).trim() : undefined,
              college: college ? String(college).trim() : 'UNKNOWN',
              year_of_study: yearOfStudy ? String(yearOfStudy).trim() : 'UNKNOWN',
              phone: phone ? String(phone).trim() : undefined,
              college_email: collegeEmail ? String(collegeEmail).trim().toLowerCase() : undefined,
              personal_email: personalEmail ? String(personalEmail).trim().toLowerCase() : undefined,
            };
          }).filter((r) => r.name && r.email);

          // Helper function to check if a college is SRM
          const isSrm = (collegeStr: string, emailStr: string) => {
            const col = collegeStr.toLowerCase().trim();
            const em = emailStr.toLowerCase().trim();
            return col.includes('srm') || em.includes('srm') || em.includes('@srmist.edu.in');
          };

          // Helper function to check if year is 1st Year
          const isFirstYear = (yearStr: string) => {
            const y = yearStr.toLowerCase().trim();
            return y.includes('1') || y.includes('first') || y.includes('1st') || y === 'i' || y.includes('i year');
          };

          // Filter SRM candidates
          const srmCandidates = validRows.filter(r => isSrm(r.college, r.email));
          
          // Separate into First Years and Other Years
          const firstYears = srmCandidates.filter(r => isFirstYear(r.year_of_study));
          const otherYears = srmCandidates.filter(r => !isFirstYear(r.year_of_study));

          // Shuffle helper
          const shuffle = <T,>(arr: T[]): T[] => {
            const copy = [...arr];
            for (let i = copy.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [copy[i], copy[j]] = [copy[j], copy[i]];
            }
            return copy;
          };

          const shuffledFirst = shuffle(firstYears);
          const shuffledOther = shuffle(otherYears);

          // Calculate draws: 70% of 120 is 84 (1st years), 30% of 120 is 36 (other years)
          let firstYearDraw = 84;
          let otherYearDraw = 36;

          // Perform draws with fallback if one group is short
          let selectedFirst = shuffledFirst.slice(0, firstYearDraw);
          let selectedOther = shuffledOther.slice(0, otherYearDraw);

          if (selectedFirst.length < firstYearDraw) {
            const deficit = firstYearDraw - selectedFirst.length;
            selectedOther = shuffledOther.slice(0, otherYearDraw + deficit);
          } else if (selectedOther.length < otherYearDraw) {
            const deficit = otherYearDraw - selectedOther.length;
            selectedFirst = shuffledFirst.slice(0, firstYearDraw + deficit);
          }

          // Combine selected emails
          const selectedEmails = new Set([
            ...selectedFirst.map(p => p.email),
            ...selectedOther.map(p => p.email)
          ]);

          const formatted = validRows.map((row) => ({
            name: row.name,
            email: row.email,
            team_name: row.regNum || row.team || undefined,
            selection_status: selectedEmails.has(row.email) ? 'SELECTED' as const : 'NOT_SELECTED' as const,
            college: row.college,
            year_of_study: row.year_of_study,
            phone: row.phone,
            college_email: row.college_email,
            personal_email: row.personal_email,
          }));

          if (formatted.length === 0) {
            setImportFeedback('❌ No valid participant rows with name and email found.');
            setImporting(false);
            return;
          }

          const res = await fetch('/api/participants/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participants: formatted, overwrite: true }),
          });
          const data = await res.json();

          if (res.ok) {
            setImportFeedback(`✅ Successfully imported ${formatted.length} participants! Unique cryptographic IDs generated.`);
            onRefresh();
            setActiveTab('participants');
          } else {
            setImportFeedback(`❌ Import failed: ${data.message}`);
          }
        } catch (err) {
          console.error('Import error:', err);
          setImportFeedback('❌ Failed to process upload.');
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (err) => {
        console.error('CSV parse error:', err);
        setImportFeedback(`❌ CSV parsing error: ${err.message}`);
        setImporting(false);
      },
    });
  };

  // Reset to default 120 selected participants
  const handleResetTo120 = async () => {
    if (!window.confirm('Reset database to the standard 120 Chipset selected participants?')) return;
    try {
      const res = await fetch('/api/reset-120', { method: 'POST' });
      if (res.ok) {
        onRefresh();
        alert('Database restored with 120 personalized Chipset selected participants!');
      }
    } catch (e) {
      console.error('Reset error:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* 5 Real-Time KPI Stats Cards with Yellow/Gold Theme */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Selected */}
        <div className="bg-[#0e0d14] border-2 border-amber-500/30 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Selected</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {stats.total_selected}
          </div>
          <p className="text-[11px] text-amber-300/80 mt-1">Eligible for pass</p>
        </div>

        {/* Checked In */}
        <div className="bg-[#0e0d14] border-2 border-emerald-500/30 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Checked In</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            {stats.total_checked_in}
          </div>
          <p className="text-[11px] text-emerald-300 mt-1">
            {stats.checked_in_rate}% attendance
          </p>
        </div>

        {/* Not Checked In */}
        <div className="bg-[#0e0d14] border-2 border-amber-500/30 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Not Checked In</span>
            <UserX className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
            {stats.total_not_checked_in}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Pending arrival</p>
        </div>

        {/* Invalid QR Attempts */}
        <div className="bg-[#0e0d14] border-2 border-rose-500/30 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Invalid Scans</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">
            {stats.invalid_attempts}
          </div>
          <p className="text-[11px] text-rose-300 mt-1">Security alerts logged</p>
        </div>

        {/* Overall Database Size */}
        <div className="col-span-2 lg:col-span-1 bg-[#0e0d14] border-2 border-amber-500/30 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Ingested</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {stats.total_imported}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">All database rows</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0e0d14] border border-amber-500/25 rounded-3xl p-3 shadow-xl">
        <div className="inline-flex rounded-2xl bg-black/50 p-1 border border-amber-500/20 overflow-x-auto">
          <button
            onClick={() => setActiveTab('participants')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
              activeTab === 'participants'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            Participant Registry ({participants.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            Audit Logs ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'import'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Ingest CSV / Bulk
          </button>
          <button
            onClick={() => setActiveTab('lottery')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'lottery'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Selection Draw (Lottery)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-csv-report"
            onClick={handleExportCsvReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV Report
          </button>

          <button
            id="btn-seed-120"
            onClick={handleResetTo120}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition cursor-pointer shadow-md shadow-amber-500/20"
            title="Reset & seed initial 120 participants"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-Seed 120
          </button>
        </div>
      </div>

      {/* TAB 1: Searchable Participant Table */}
      {activeTab === 'participants' && (
        <div className="bg-[#0e0d14] border border-amber-500/25 rounded-3xl overflow-hidden shadow-2xl space-y-4 p-5">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-amber-400/80 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-admin-search"
                type="text"
                placeholder="Search by Name, Email, Selection ID, or Team..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-black/50 border border-amber-500/30 rounded-2xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-black/50 border border-amber-500/30 text-amber-200 text-xs rounded-2xl px-3.5 py-2.5 focus:outline-none focus:border-amber-400"
              >
                <option value="ALL" className="bg-slate-900">All Statuses</option>
                <option value="SELECTED" className="bg-slate-900">SELECTED only</option>
                <option value="WAITLISTED" className="bg-slate-900">WAITLISTED</option>
                <option value="REJECTED" className="bg-slate-900">REJECTED</option>
              </select>

              <select
                value={checkInFilter}
                onChange={(e) => setCheckInFilter(e.target.value)}
                className="bg-black/50 border border-amber-500/30 text-amber-200 text-xs rounded-2xl px-3.5 py-2.5 focus:outline-none focus:border-amber-400"
              >
                <option value="ALL" className="bg-slate-900">All Check-Ins</option>
                <option value="CHECKED_IN" className="bg-slate-900">Checked In</option>
                <option value="NOT_CHECKED_IN" className="bg-slate-900">Not Checked In</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-amber-500/20">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/60 text-amber-400 font-mono uppercase tracking-wider border-b border-amber-500/20">
                <tr>
                  <th className="py-3.5 px-4">Selection ID</th>
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Team</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">RSVP</th>
                  <th className="py-3.5 px-4">Checked In</th>
                  <th className="py-3.5 px-4">Check-in Time</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-500/10 text-slate-300">
                {filteredParticipants.map((p) => (
                  <tr
                    key={p.unique_id}
                    className="hover:bg-amber-500/5 transition-colors"
                  >
                    {/* Selection ID */}
                    <td className="py-3 px-4 font-mono font-black text-amber-400">
                      {p.unique_id}
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4 font-bold text-white">
                      {p.name}
                    </td>

                    {/* Email */}
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {p.email}
                    </td>

                    {/* Team */}
                    <td className="py-3 px-4">
                      {p.team_name ? (
                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-semibold">
                          {p.team_name}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {p.selection_status === 'SELECTED' ? (
                        <span className="px-2.5 py-0.5 rounded-full font-black text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          SELECTED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-slate-800 text-slate-400">
                          {p.selection_status}
                        </span>
                      )}
                    </td>

                    {/* RSVP */}
                    <td className="py-3 px-4">
                      {p.selection_status === 'SELECTED' ? (
                        p.rsvp_status === 'CONFIRMED' ? (
                          <span className="px-2 py-0.5 rounded font-black text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            CONFIRMED
                          </span>
                        ) : p.rsvp_status === 'DECLINED' ? (
                          <span className="px-2 py-0.5 rounded font-black text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            DECLINED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded font-bold text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse">
                            PENDING
                          </span>
                        )
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Checked In */}
                    <td className="py-3 px-4">
                      {p.checked_in ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-400">
                          <CheckCircle className="w-3.5 h-3.5" /> YES
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                          <XCircle className="w-3.5 h-3.5" /> NO
                        </span>
                      )}
                    </td>

                    {/* Check-in Time */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {p.check_in_time ? formatTimestamp(p.check_in_time) : '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => onViewInvitation(p.unique_id)}
                          className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition cursor-pointer"
                          title="View Personalized Invitation Pass"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {p.selection_status === 'SELECTED' && (
                          <button
                            onClick={() => {
                              setSwapOriginal(p);
                              setSwapSearch('');
                            }}
                            className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition cursor-pointer"
                            title="Swap selected candidate with waiting candidate"
                          >
                            <Shuffle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleCheckIn(p)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition cursor-pointer ${
                            p.checked_in
                              ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                          }`}
                          title={p.checked_in ? 'Undo Check-in' : 'Manual Check-in'}
                        >
                          {p.checked_in ? 'Undo' : 'Check In'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            <span>
              Showing {filteredParticipants.length} of {participants.length} records
            </span>
            <span className="text-amber-400 font-medium">Chipset Cryptographic ID Registry</span>
          </div>
        </div>
      )}

      {/* TAB 2: Scan Attempt Audit Logs */}
      {activeTab === 'logs' && (
        <div className="bg-[#0e0d14] border border-amber-500/25 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              Live Security & Entrance Audit Trail
            </h3>
            <span className="text-xs text-slate-500">Last 100 scan events recorded</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No scan logs recorded yet. Scan a QR in the scanner or verification portal to begin recording audit events.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-3.5 rounded-2xl bg-black/40 border border-amber-500/20 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {log.status === 'VALID_NOT_CHECKED_IN' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                          VALID SCAN
                        </span>
                      )}
                      {log.status === 'ALREADY_CHECKED_IN' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                          DUPLICATE SCAN
                        </span>
                      )}
                      {log.status === 'INVALID_ID' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300">
                          INVALID ID ATTEMPT
                        </span>
                      )}
                      {log.status === 'NOT_SELECTED' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                          NOT SELECTED
                        </span>
                      )}
                      <span className="font-mono font-bold text-amber-300">{log.scanned_id}</span>
                      {log.participant_name && (
                        <span className="text-slate-300 font-semibold">• {log.participant_name}</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-[11px]">{log.notes}</p>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 shrink-0 ml-4">
                    {formatTimestamp(log.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CSV & Bulk Ingestion Wizard */}
      {activeTab === 'import' && (
        <div className="bg-[#0e0d14] border border-amber-500/25 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-w-2xl mx-auto">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">
              Bulk Participant Ingestion & Pass Generator
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload a CSV file containing <code className="text-amber-300 font-mono">name</code>, <code className="text-amber-300 font-mono">email</code>, <code className="text-amber-300 font-mono">team_name</code>, and <code className="text-amber-300 font-mono">selection_status</code>. Cryptographically secure random IDs (<code className="text-amber-300 font-mono">C9-XXXXXX</code>) and personalized Chipset invitation passes are generated automatically for all new selected participants.
            </p>
          </div>

          {/* Upload Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-amber-500/30 hover:border-amber-400 rounded-3xl p-8 text-center cursor-pointer transition bg-black/40 hover:bg-black/60 flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-black text-white">Click or drag CSV file here</p>
              <p className="text-xs text-slate-500 mt-0.5">Supports .csv with standard columns</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvFileUpload}
              className="hidden"
            />
          </div>

          {importing && (
            <p className="text-xs text-amber-400 font-semibold animate-pulse text-center">
              Processing participant dataset and generating cryptographic unique IDs...
            </p>
          )}

          {importFeedback && (
            <div className="p-3.5 rounded-2xl bg-black/60 border border-amber-500/30 text-xs text-slate-200">
              {importFeedback}
            </div>
          )}

          {/* CSV Schema Reference */}
          <div className="bg-black/50 p-4 rounded-2xl border border-amber-500/20 space-y-2">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Example CSV Header & Format
            </h4>
            <pre className="text-[11px] font-mono text-amber-300 bg-black/70 p-3 rounded-xl overflow-x-auto border border-amber-500/15">
{`name,email,team_name,selection_status
Rahul Kumar,rahul@gmail.com,Apex Innovators,SELECTED
Arun Kumar,arun@gmail.com,Apex Innovators,SELECTED
Chakradhar Danesh,messidhanesh2006@gmail.com,Chipset Alpha,SELECTED`}
            </pre>
          </div>
        </div>
      )}
      {/* TAB 4: Selection Draw (Lottery) */}
      {activeTab === 'lottery' && (() => {
        // Dynamic filters extraction
        const colleges = Array.from(new Set(participants.map(p => p.college).filter(Boolean))) as string[];
        const years = Array.from(new Set(participants.map(p => p.year_of_study).filter(Boolean))) as string[];

        // Count candidate pool matching current filters
        const pool = participants.filter((p) => {
          const matchesCollege = selectedCollegeFilter === 'ALL' || p.college === selectedCollegeFilter;
          const matchesYear = selectedYearFilter === 'ALL' || p.year_of_study === selectedYearFilter;
          return matchesCollege && matchesYear;
        });

        // Run selection draw logic
        const handleRunDraw = async () => {
          if (drawCount <= 0) {
            alert('Please enter a valid count of candidates to select.');
            return;
          }

          setDrawing(true);
          setLotteryFeedback(null);

          try {
            // Shuffle indices of matching pool
            const poolIndices = Array.from({ length: pool.length }, (_, i) => i);
            for (let i = poolIndices.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [poolIndices[i], poolIndices[j]] = [poolIndices[j], poolIndices[i]];
            }

            const selectedPoolIds = new Set(
              poolIndices.slice(0, drawCount).map(idx => pool[idx].unique_id)
            );

            // Update matched pool statuses, leave others unchanged
            const updatedParticipants = participants.map((p) => {
              const matchesCollege = selectedCollegeFilter === 'ALL' || p.college === selectedCollegeFilter;
              const matchesYear = selectedYearFilter === 'ALL' || p.year_of_study === selectedYearFilter;

              if (matchesCollege && matchesYear) {
                return {
                  ...p,
                  selection_status: selectedPoolIds.has(p.unique_id) ? 'SELECTED' : 'NOT_SELECTED' as any,
                };
              }
              return p;
            });

            const res = await fetch('/api/participants/bulk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ participants: updatedParticipants, overwrite: true }),
            });

            if (res.ok) {
              const countSelected = Math.min(drawCount, pool.length);
              setLotteryFeedback(`✅ Success! Selected ${countSelected} random participants out of ${pool.length} matching candidates.`);
              onRefresh();
            } else {
              const data = await res.json();
              setLotteryFeedback(`❌ Ingestion failed: ${data.message}`);
            }
          } catch (err) {
            console.error('Lottery draw error:', err);
            setLotteryFeedback('❌ Failed to process selection draw.');
          } finally {
            setDrawing(false);
          }
        };

        return (
          <div className="bg-[#0e0d14] border border-amber-500/25 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-w-2xl mx-auto">
            <div>
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Lottery Selection Draw Wizard
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Filter the registered participants by college domain or year of study, then enter the target number of passes to draw. The system will perform a secure random selection from that pool.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* College Filter */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-amber-400">Filter College Domain</label>
                <select
                  value={selectedCollegeFilter}
                  onChange={(e) => {
                    setSelectedCollegeFilter(e.target.value);
                    setLotteryFeedback(null);
                  }}
                  className="w-full bg-black/50 border border-amber-500/30 text-amber-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400"
                >
                  <option value="ALL">All Colleges ({colleges.length})</option>
                  {colleges.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Year Filter */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-amber-400">Filter Year of Study</label>
                <select
                  value={selectedYearFilter}
                  onChange={(e) => {
                    setSelectedYearFilter(e.target.value);
                    setLotteryFeedback(null);
                  }}
                  className="w-full bg-black/50 border border-amber-500/30 text-amber-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400"
                >
                  <option value="ALL">All Years ({years.length})</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Candidate Pool Indicator */}
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-300">Matching Candidates Pool Size</p>
                <p className="text-[10px] text-slate-500">Candidates matching the criteria above</p>
              </div>
              <div className="text-xl font-mono font-black text-amber-400">
                {pool.length}
              </div>
            </div>

            {/* Target Select Count Input */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-amber-400">Number of Participants to Select</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max={pool.length}
                  value={drawCount}
                  onChange={(e) => {
                    setDrawCount(Math.max(1, parseInt(e.target.value) || 0));
                    setLotteryFeedback(null);
                  }}
                  className="w-32 px-3 py-2 text-sm bg-black/40 border border-amber-500/30 rounded-xl text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  onClick={handleRunDraw}
                  disabled={drawing || pool.length === 0}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all shadow-md shadow-amber-500/25 active:scale-95 disabled:opacity-50 cursor-pointer animate-pulse"
                >
                  {drawing ? 'Drawing Lot...' : 'Run Selection Draw'}
                </button>
              </div>
            </div>

            {lotteryFeedback && (
              <div className="p-3.5 rounded-2xl bg-black/60 border border-amber-500/30 text-xs text-slate-200">
                {lotteryFeedback}
              </div>
            )}
          </div>
        );
      })()}

      {/* SWAP CANDIDATE MODAL */}
      {swapOriginal && (() => {
        // Filter out non-selected candidates that match swapSearch
        const replacements = participants.filter((p) => {
          if (p.selection_status === 'SELECTED') return false;
          
          const q = swapSearch.toLowerCase().trim();
          if (!q) return true;
          
          return (
            p.name.toLowerCase().includes(q) ||
            p.email.toLowerCase().includes(q) ||
            p.unique_id.toLowerCase().includes(q) ||
            (p.college && p.college.toLowerCase().includes(q))
          );
        });

        const handleConfirmSwap = async (replacement: Participant) => {
          if (!confirm(`Are you sure you want to swap selected seat from ${swapOriginal.name} to ${replacement.name}?`)) {
            return;
          }

          setSwapping(true);
          try {
            const res = await fetch('/api/participants/swap', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                original_id: swapOriginal.unique_id,
                new_id: replacement.unique_id
              })
            });

            if (res.ok) {
              setSwapOriginal(null);
              onRefresh();
            } else {
              const data = await res.json();
              alert(data.message || 'Swap operation failed.');
            }
          } catch (err) {
            console.error('Swap request error:', err);
            alert('Failed to process swap request.');
          } finally {
            setSwapping(false);
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0e0d14] border-2 border-amber-500/30 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6">
              
              {/* Close Button */}
              <button
                onClick={() => setSwapOriginal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-amber-500/20 text-slate-400 hover:text-amber-400 cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                  <Shuffle className="w-5 h-5 text-amber-400" />
                  Swap Candidate Seat
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Swap the selected seat of <strong className="text-amber-400">{swapOriginal.name}</strong> ({swapOriginal.unique_id}) with a participant from the waitlist/pool.
                </p>
              </div>

              {/* Original Participant Status Warning */}
              <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-slate-300 flex flex-col gap-1">
                <div>
                  <span className="font-semibold text-slate-400">Current Seat Holder:</span> {swapOriginal.name} ({swapOriginal.email})
                </div>
                <div>
                  <span className="font-semibold text-slate-400">RSVP Status:</span>{' '}
                  {swapOriginal.rsvp_status === 'CONFIRMED' ? (
                    <span className="text-emerald-400 font-bold">Confirmed</span>
                  ) : swapOriginal.rsvp_status === 'DECLINED' ? (
                    <span className="text-rose-400 font-bold">Declined</span>
                  ) : (
                    <span className="text-amber-400 font-bold">Pending RSVP</span>
                  )}
                </div>
              </div>

              {/* Search waiting list */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-amber-400">Search Replacements</label>
                <input
                  type="text"
                  placeholder="Filter by name, email, college..."
                  value={swapSearch}
                  onChange={(e) => setSwapSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-amber-500/30 text-xs rounded-xl text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Replacement Candidates List */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">Available Candidates ({replacements.length})</span>
                <div className="max-h-48 overflow-y-auto divide-y divide-amber-500/10 border border-amber-500/20 rounded-2xl bg-black/35">
                  {replacements.length === 0 ? (
                    <p className="p-4 text-xs text-center text-slate-500 font-mono">No matching waiting candidates found.</p>
                  ) : (
                    replacements.map((r) => (
                      <div key={r.unique_id} className="p-3 flex items-center justify-between hover:bg-amber-500/5 transition-colors">
                        <div className="min-w-0 pr-4">
                          <p className="text-xs font-bold text-white truncate">{r.name}</p>
                          <p className="text-[10px] font-mono text-slate-400 truncate">{r.email}</p>
                          <p className="text-[9px] text-amber-400/80 truncate">
                            {r.college || 'Unknown College'} • {r.year_of_study || 'N/A'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleConfirmSwap(r)}
                          disabled={swapping}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        >
                          Swap In
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};
