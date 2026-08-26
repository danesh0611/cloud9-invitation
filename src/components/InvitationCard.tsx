import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Download, Share2, Check, Printer, ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';
import type { Participant } from '../types';
import { ChipsetLogo } from './ChipsetLogo';

interface InvitationCardProps {
  participant: Participant;
  theme?: 'cyber' | 'dark' | 'light';
  onVerifyClick?: (id: string) => void;
  compact?: boolean;
}

export const InvitationCard: React.FC<InvitationCardProps> = ({
  participant,
  theme = 'cyber',
  onVerifyClick,
  compact = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<'PENDING' | 'CONFIRMED' | 'DECLINED'>(participant.rsvp_status || 'PENDING');
  const [rsvpLoading, setRsvpLoading] = useState(false);

  const handleRsvp = async (status: 'CONFIRMED' | 'DECLINED') => {
    try {
      setRsvpLoading(true);
      const res = await fetch(`/api/rsvp/${participant.unique_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setRsvpStatus(status);
      } else {
        const data = await res.json();
        alert(data.message || 'RSVP update failed.');
      }
    } catch (err) {
      console.error('RSVP submission error:', err);
      alert('Network error submitting RSVP.');
    } finally {
      setRsvpLoading(false);
    }
  };

  // Verification URL - contains only the unique ID (no sensitive PII inside QR)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://chipset.community';
  const verifyUrl = `${baseUrl}/verify?id=${participant.unique_id}`;

  const handleDownloadPng = async () => {
    if (!cardRef.current) return;
    try {
      setDownloading(true);
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Chipset-Invitation-${participant.name.replace(/\s+/g, '_')}-${participant.unique_id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download card PNG:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Yellow-themed color variants
  const themeStyles = {
    cyber: {
      card: 'bg-gradient-to-b from-[#16130b] via-[#100e08] to-[#08080c] text-white border-2 border-amber-500/40 shadow-2xl shadow-amber-950/60',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/50 backdrop-blur-md',
      accentText: 'text-amber-400',
      subText: 'text-amber-200/80',
      qrBg: 'bg-white p-3.5 rounded-2xl shadow-xl shadow-amber-950/40 border border-amber-400/30',
      idBadge: 'bg-amber-950/40 text-amber-300 border-amber-500/30 font-mono backdrop-blur-md',
      glow: 'from-amber-500/25 to-yellow-500/10'
    },
    dark: {
      card: 'bg-[#0e0d13] text-white border border-amber-500/30 shadow-2xl shadow-black/80',
      badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      accentText: 'text-amber-300',
      subText: 'text-slate-400',
      qrBg: 'bg-white p-3.5 rounded-2xl shadow-xl border border-amber-500/20',
      idBadge: 'bg-white/5 text-amber-300 border-amber-500/20 font-mono backdrop-blur-md',
      glow: 'from-amber-600/20 to-yellow-500/15'
    },
    light: {
      card: 'bg-gradient-to-b from-amber-50 to-white text-slate-900 border-2 border-amber-400/60 shadow-2xl',
      badge: 'bg-amber-100 text-amber-900 border-amber-300',
      accentText: 'text-amber-700',
      subText: 'text-slate-600',
      qrBg: 'bg-white p-3.5 rounded-2xl border-2 border-amber-300 shadow-md',
      idBadge: 'bg-amber-50 text-amber-900 border-amber-300 font-mono font-bold',
      glow: 'from-amber-200 to-yellow-100'
    }
  }[theme];

  return (
    <div className="flex flex-col items-center w-full max-w-[390px]">
      {/* Printable / Renderable Card Element with Chipset Logo in Every Image */}
      <div
        ref={cardRef}
        id={`invitation-card-${participant.unique_id}`}
        className={`relative w-full rounded-3xl overflow-hidden transition-all duration-300 ${themeStyles.card} ${
          compact ? 'p-6' : 'p-7'
        }`}
      >
        {/* Yellow ambient background glow */}
        <div className={`absolute -top-10 -right-10 w-48 h-48 bg-gradient-to-br ${themeStyles.glow} blur-3xl -z-0 pointer-events-none rounded-full`} />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-500/15 blur-3xl -z-0 pointer-events-none rounded-full" />

        {/* Card Header with CHIPSET LOGO (Icon + CHIPSET + A TECHNICAL COMMUNITY) */}
        <div className="relative z-10 flex items-center justify-between border-b border-amber-500/25 pb-4 mb-5">
          <ChipsetLogo
            size="sm"
            theme={theme === 'light' ? 'light' : 'dark'}
            variant="full"
          />

          <div className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider border flex items-center gap-1 uppercase ${themeStyles.badge}`}>
            <Sparkles className="w-3 h-3 text-amber-400" />
            SELECTED
          </div>
        </div>

        {/* Congratulations & Participant Name */}
        <div className="relative z-10 text-center mb-5">
          <p className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-amber-400 mb-1">
            Personal Invitation Pass
          </p>
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1 text-white">
            Congratulations, {participant.name}!
          </h3>
          <p className="text-xs text-amber-100/80 font-medium max-w-[280px] mx-auto leading-relaxed">
            You are selected for Cloud 9 event.
          </p>
        </div>

        {/* Unique QR Code Container with High-Res Contrast */}
        <div className="relative z-10 flex flex-col items-center justify-center my-4">
          <div className={`${themeStyles.qrBg} flex flex-col items-center justify-center`}>
            <QRCodeSVG
              value={verifyUrl}
              size={compact ? 130 : 155}
              level="H"
              includeMargin={false}
              fgColor="#08080C"
              bgColor="#FFFFFF"
            />
          </div>
          <p className="text-[10px] text-amber-300/80 mt-2.5 font-mono font-medium tracking-tight text-center">
            Scan to verify against official database
          </p>
        </div>

        {/* Selection ID & Metadata */}
        <div className="relative z-10 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border ${themeStyles.idBadge}`}>
              <span className="text-[9px] uppercase font-bold tracking-widest text-amber-400/80 mb-0.5">
                Selection ID
              </span>
              <span className="text-sm font-mono font-black tracking-widest text-amber-400">
                {participant.unique_id}
              </span>
            </div>
            <div className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border ${themeStyles.idBadge}`}>
              <span className="text-[9px] uppercase font-bold tracking-widest text-amber-400/80 mb-0.5">
                Year of Study
              </span>
              <span className="text-xs font-black text-amber-400 truncate max-w-full text-center">
                {participant.year_of_study || 'N/A'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-300 pt-2 border-t border-amber-500/20">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Anti-Tamper Verified</span>
            </div>
            <div className="font-mono text-[10px]">
              {participant.checked_in ? (
                <span className="text-amber-400 font-bold">✓ Checked In</span>
              ) : (
                <span className="text-emerald-400 font-semibold">Valid Pass</span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* RSVP Response Panel */}
      {participant.selection_status === 'SELECTED' && (
        <div className="w-full max-w-[390px] mt-4 p-4 rounded-2xl bg-[#0e0d14]/85 border border-amber-500/30 backdrop-blur-md text-center space-y-3 no-print">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">RSVP Confirmation</span>
            {rsvpStatus === 'CONFIRMED' ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Seat Confirmed
              </span>
            ) : rsvpStatus === 'DECLINED' ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                Not Attending
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                Pending Response
              </span>
            )}
          </div>

          {rsvpStatus === 'PENDING' ? (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleRsvp('CONFIRMED')}
                disabled={rsvpLoading}
                className="flex-1 py-2 text-xs font-black rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all cursor-pointer disabled:opacity-50"
              >
                Confirm Attendance
              </button>
              <button
                onClick={() => handleRsvp('DECLINED')}
                disabled={rsvpLoading}
                className="py-2 px-4 text-xs font-bold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-all cursor-pointer disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          ) : rsvpStatus === 'CONFIRMED' ? (
            <p className="text-[11px] text-slate-400 leading-relaxed text-left">
              🎉 Your seat is confirmed! Please present this pass with the QR code at the registration desk. If your availability changes, you can still <button onClick={() => handleRsvp('DECLINED')} className="text-rose-400 underline hover:text-rose-300 bg-transparent border-none cursor-pointer p-0 text-[11px] font-bold">Decline Seat</button> to free it.
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 leading-relaxed text-left">
              You marked that you will not be attending. Your seat is now released for other candidates. If you changed your mind, you can still <button onClick={() => handleRsvp('CONFIRMED')} className="text-emerald-400 underline hover:text-emerald-300 bg-transparent border-none cursor-pointer p-0 text-[11px] font-bold">Confirm Seat</button>.
            </p>
          )}
        </div>
      )}

      {/* Action Toolbar underneath Card */}
      {!compact && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 max-w-[390px] w-full no-print">
          <button
            id={`btn-download-${participant.unique_id}`}
            onClick={handleDownloadPng}
            disabled={downloading}
            className="flex-1 min-w-[110px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-black rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg shadow-amber-500/25 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            {downloading ? 'Exporting...' : 'Download PNG'}
          </button>

          <button
            id={`btn-copy-link-${participant.unique_id}`}
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-300 transition-all active:scale-95 cursor-pointer"
            title="Copy verification link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Link'}
          </button>

          <button
            id={`btn-print-${participant.unique_id}`}
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-300 transition-all active:scale-95 cursor-pointer"
            title="Print invitation"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          {onVerifyClick && (
            <button
              id={`btn-verify-${participant.unique_id}`}
              onClick={() => onVerifyClick(participant.unique_id)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-300 transition-all active:scale-95 cursor-pointer"
              title="Test verify in portal"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Verify
            </button>
          )}
        </div>
      )}
    </div>
  );
};
