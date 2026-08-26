import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle, XCircle, Sparkles, RefreshCw } from 'lucide-react';
import type { Participant } from '../types';
import { ChipsetLogo } from './ChipsetLogo';

interface AntiFakeExplainerProps {
  participants: Participant[];
}

export const AntiFakeExplainer: React.FC<AntiFakeExplainerProps> = ({ participants }) => {
  const selected = participants.filter((p) => p.selection_status === 'SELECTED');

  // Real participant representing the legitimate QR owner
  const legitOwner = selected[2] || selected[0] || {
    unique_id: 'C9-X7K29P',
    name: 'Chakradhar Danesh',
    email: 'messidhanesh2006@gmail.com',
    team_name: 'Chipset Alpha',
    selection_status: 'SELECTED' as const,
    checked_in: false,
    check_in_time: null,
    created_at: new Date().toISOString(),
    verification_count: 0,
    last_verified_at: null,
  };

  // Fake name edited on image screenshot
  const [spoofedName, setSpoofedName] = useState('Rahul Kumar (Tampered)');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState<'idle' | 'scanning' | 'verified'>('idle');

  const runSimulation = () => {
    setIsSimulating(true);
    setSimulationStep('scanning');
    setTimeout(() => {
      setSimulationStep('verified');
      setIsSimulating(false);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Yellow Theme & Chipset Logo */}
      <div className="bg-gradient-to-r from-amber-500/15 via-[#14120c] to-[#08080C] border-2 border-amber-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <ShieldCheck className="w-3.5 h-3.5" />
            Anti-Tamper Specification
          </span>
          <span className="text-xs text-amber-200/80 font-mono">Cryptographic Verification Architecture</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Anti-Fake Protection & Database Authority
        </h1>
        <p className="text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
          The name printed or photoshopped on a physical pass or screenshot is <strong>never trusted</strong>. The Chipset database record associated with the cryptographically secure ID is the <strong>sole source of truth</strong>.
        </p>
      </div>

      {/* Interactive Simulation Sandbox */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: What the Bad Actor shows on phone screenshot */}
        <div className="md:col-span-6 bg-[#0e0d14] border-2 border-amber-500/25 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> Spoofed / Photoshopped Screenshot
            </span>
            <span className="text-[10px] font-mono text-slate-500">Client Image</span>
          </div>

          <div className="p-4 rounded-2xl bg-black/50 border border-amber-500/20 space-y-3">
            <div>
              <label className="text-[11px] font-black text-amber-400 uppercase tracking-wider block mb-1">
                Edit Mocked Screenshot Name:
              </label>
              <input
                type="text"
                value={spoofedName}
                onChange={(e) => setSpoofedName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-black/60 border border-amber-500/30 rounded-xl text-white font-bold focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="pt-2 border-t border-amber-500/15 space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Pass Visual Headline:</span>
                <span className="text-rose-300 font-bold">"Congratulations, {spoofedName}!"</span>
              </div>
              <div className="flex justify-between">
                <span>Embedded QR Code ID:</span>
                <span className="font-mono text-amber-400 font-black">{legitOwner.unique_id}</span>
              </div>
              <div className="flex justify-between">
                <span>Actual Original Owner:</span>
                <span className="text-white font-semibold">{legitOwner.name}</span>
              </div>
            </div>
          </div>

          <button
            onClick={runSimulation}
            disabled={isSimulating}
            className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25"
          >
            <Sparkles className="w-4 h-4" />
            {isSimulating ? 'Simulating Scanner Read...' : 'Simulate Staff QR Scan Test'}
          </button>
        </div>

        {/* Right: What the Chipset Entrance Scanner & Database reveal */}
        <div className="md:col-span-6 bg-[#0e0d14] border-2 border-amber-500/25 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Staff Terminal (Database Source of Truth)
            </span>
            <span className="text-[10px] font-mono text-emerald-400">Live Server</span>
          </div>

          {simulationStep === 'idle' && (
            <div className="p-8 rounded-2xl bg-black/50 border border-amber-500/20 text-center space-y-2">
              <p className="text-xs text-slate-400">
                Click <strong className="text-amber-400">"Simulate Staff QR Scan Test"</strong> to see how the system detects the discrepancy immediately.
              </p>
            </div>
          )}

          {simulationStep === 'scanning' && (
            <div className="p-8 rounded-2xl bg-black/50 border border-amber-400/40 text-center space-y-2 animate-pulse">
              <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
              <p className="text-xs text-amber-300 font-mono">
                Querying database key <strong className="text-white">{legitOwner.unique_id}</strong>...
              </p>
            </div>
          )}

          {simulationStep === 'verified' && (
            <div className="p-5 rounded-2xl bg-black/50 border-2 border-emerald-500/60 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-400">
                  Entrance Staff Screen Display
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300">
                  {legitOwner.selection_status}
                </span>
              </div>

              <div className="bg-black/60 p-3.5 rounded-xl border border-amber-500/20 space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-400/80 block">
                  Registered Name in Database:
                </span>
                <span className="text-xl font-black text-white block">
                  {legitOwner.name}
                </span>
              </div>

              {/* Comparison Callout */}
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-300">
                  <XCircle className="w-4 h-4" /> Tamper Detected:
                </div>
                <p className="text-[11px] leading-relaxed">
                  Attendee's screenshot claimed: <strong className="text-white line-through">{spoofedName}</strong>
                  <br />
                  Server verified real identity: <strong className="text-emerald-300 font-bold">{legitOwner.name}</strong>
                </p>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Staff asks for participant photo ID and instantly catches the modified pass.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
