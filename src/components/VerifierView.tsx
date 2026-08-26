import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle, AlertTriangle, XCircle, Search, Clock, Users, ArrowRight, ShieldAlert } from 'lucide-react';
import type { VerificationResponse } from '../types';
import { formatTimestamp } from '../utils/idGenerator';
import { ChipsetLogo } from './ChipsetLogo';
import { InvitationCard } from './InvitationCard';

interface VerifierViewProps {
  initialId?: string;
  onNavigateToScanner?: () => void;
}

export const VerifierView: React.FC<VerifierViewProps> = ({
  initialId = '',
  onNavigateToScanner,
}) => {
  const [lookupId, setLookupId] = useState(initialId);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (initialId) {
      setLookupId(initialId);
      performVerification(initialId);
    }
  }, [initialId]);

  const performVerification = async (idToVerify: string) => {
    const cleanId = idToVerify.trim().toUpperCase();
    if (!cleanId) return;

    setLoading(true);
    setHasSearched(true);
    setResult(null);

    try {
      const response = await fetch(`/api/verify/${encodeURIComponent(cleanId)}`);
      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setResult({
          valid: false,
          status: response.status === 403 ? 'NOT_SELECTED' : 'INVALID',
          message: data.message || 'This invitation could not be verified.',
          participant: data.participant,
        });
      }
    } catch (err) {
      console.error('Verification query failed:', err);
      setResult({
        valid: false,
        status: 'INVALID',
        message: 'Network error or backend verification service offline.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performVerification(lookupId);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Verification Header with Chipset Logo */}
      <div className="text-center space-y-3">
        <div className="inline-flex justify-center mb-1">
          <ChipsetLogo size="lg" theme="dark" variant="full" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-white">
          Public <span className="font-black text-amber-400">Pass Verification Portal</span>
        </h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
          Direct cryptographic query against the official Chipset technical community registration records.
        </p>
      </div>

      {/* Lookup Form */}
      <form onSubmit={handleSubmit} className="bg-[#0e0d14]/90 backdrop-blur-xl border-2 border-amber-500/30 rounded-3xl p-6 shadow-2xl shadow-amber-950/40">
        <label className="block text-xs font-black text-amber-400 uppercase tracking-widest mb-3">
          Enter Selection ID or Scan Result
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-amber-400/70 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              id="input-verify-id"
              type="text"
              placeholder="e.g. C9-X7K29P"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value.toUpperCase())}
              className="w-full pl-11 pr-4 py-3.5 bg-black/50 border border-amber-500/30 rounded-2xl text-white font-mono text-base font-bold placeholder-slate-600 focus:outline-none focus:border-amber-400 transition uppercase"
            />
          </div>
          <button
            id="btn-submit-verify"
            type="submit"
            disabled={loading || !lookupId.trim()}
            className="px-7 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/25 active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {loading ? 'Verifying...' : 'Verify Pass'}
          </button>
        </div>

        {/* Quick ID hints */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="text-amber-400/80 font-semibold">Test examples:</span>
          <button
            type="button"
            onClick={() => {
              setLookupId('C9-X7K29P');
              performVerification('C9-X7K29P');
            }}
            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 font-mono text-amber-300 border border-amber-500/30 cursor-pointer transition-all font-bold"
          >
            C9-X7K29P
          </button>
          <button
            type="button"
            onClick={() => {
              setLookupId('C9-INVALID-999');
              performVerification('C9-INVALID-999');
            }}
            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 font-mono text-rose-300 border border-rose-500/30 cursor-pointer transition-all font-bold"
          >
            Invalid Test ID
          </button>
        </div>
      </form>

      {/* Verification Result Display */}
      {hasSearched && !loading && result && (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
          {/* 1. VALID INVITATION */}
          {/* 1. VALID INVITATION & ALREADY CHECKED IN */}
          {result.valid && (result.status === 'VALID' || result.status === 'ALREADY_CHECKED_IN') && result.participant && (
            <div className="flex flex-col items-center justify-center space-y-4 animate-in zoom-in duration-300">
              <InvitationCard
                participant={result.participant as any}
                onVerifyClick={undefined}
              />
            </div>
          )}

          {/* 3. INVALID INVITATION */}
          {!result.valid && result.status === 'INVALID' && (
            <div className="bg-[#0e0d14] border-2 border-rose-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-rose-500/20">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/10">
                  <XCircle className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold tracking-widest text-rose-400 uppercase">
                    Security Rejection
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-rose-400 tracking-tight flex items-center gap-2">
                    ❌ INVALID INVITATION
                  </h2>
                </div>
              </div>

              <div className="bg-black/40 p-4 rounded-2xl border border-rose-500/20">
                <p className="text-base font-bold text-rose-300">
                  "This invitation could not be verified."
                </p>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  The provided Selection ID <code className="font-mono text-rose-400 font-bold">{lookupId}</code> does not exist in the Chipset participant registry.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200 flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Security Audit Log recorded this unauthorized scan attempt.</span>
              </div>
            </div>
          )}

          {/* 4. NOT SELECTED */}
          {!result.valid && result.status === 'NOT_SELECTED' && result.participant && (
            <div className="bg-[#0e0d14] border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-amber-500/20">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                    Status Check
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    ⚠️ NOT SELECTED FOR PASS
                  </h2>
                </div>
              </div>

              <div className="bg-black/40 p-4 rounded-2xl border border-amber-500/20 space-y-2">
                <p className="text-sm text-slate-300">
                  Participant <strong className="text-white">{result.participant.name}</strong> is registered with status:{' '}
                  <span className="font-bold text-amber-400">{result.participant.selection_status}</span>.
                </p>
                <p className="text-xs text-slate-400">
                  Only participants with <code className="text-amber-400 font-mono font-bold">SELECTED</code> status receive official Chipset admission passes.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Staff shortcut card */}
      {onNavigateToScanner && (
        <div className="bg-[#0e0d14] border border-amber-500/25 rounded-3xl p-5 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Event Staff Check-In Terminal</h4>
              <p className="text-xs text-slate-400">Launch live camera QR scanner with 1-click check-in button.</p>
            </div>
          </div>
          <button
            onClick={onNavigateToScanner}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-300 transition-all cursor-pointer"
          >
            Open Scanner <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
