import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Download, Share2, Check, Printer, ShieldCheck, Sparkles, ExternalLink, Mail, Calendar, MapPin, Clock, DoorOpen } from 'lucide-react';
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

  const handleShareEmail = () => {
    const toEmails = [
      participant.college_email,
      participant.personal_email,
      participant.email
    ].filter(Boolean)
     .filter((val, idx, self) => self.indexOf(val) === idx);

    const toField = toEmails.join(',');
    const subject = encodeURIComponent("You are selected for the Cloud9 Event!");
    const body = encodeURIComponent(
      `Hi ${participant.name},\n\n` +
      `Congratulations! You have been selected for the Cloud9 event.\n\n` +
      `Please RSVP to confirm your seat and download your invitation pass here:\n` +
      `${verifyUrl}\n\n` +
      `Looking forward to seeing you at the event!\n\n` +
      `Best regards,\n` +
      `Cloud9 Organizing Team`
    );
    window.location.href = `mailto:${toField}?subject=${subject}&body=${body}`;
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
    <div className="flex flex-col items-center w-full max-w-[850px] mx-auto select-none">
      {/* Printable / Renderable Boarding Pass Element */}
      <div
        ref={cardRef}
        id={`invitation-card-${participant.unique_id}`}
        className="relative w-full rounded-3xl overflow-hidden transition-all duration-300 bg-gradient-to-b from-[#121118] via-[#0a090d] to-[#040406] text-white border-2 border-amber-500/40 shadow-2xl shadow-amber-950/40 p-1"
      >
        <div className="flex flex-col md:flex-row w-full min-h-[380px]">
          
          {/* LEFT PANEL: MAIN TICKET */}
          <div className="relative flex-1 p-6 sm:p-7 flex flex-col justify-between border-b md:border-b-0 md:border-r border-dashed border-amber-500/35 bg-black/40">
            {/* Ambient glows and map graphics */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-rose-500/10 rounded-full blur-[80px] pointer-events-none" />
            
            {/* Header logos */}
            <div className="relative z-10 flex items-center justify-between">
              <ChipsetLogo size="sm" theme="dark" variant="full" />
              <div className="flex items-center gap-1.5 font-mono text-[9px] font-black tracking-widest text-slate-300 bg-slate-900/60 border border-slate-700/50 px-3 py-1 rounded-md">
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#EA4335]">o</span>
                <span className="text-[#FBBC05]">o</span>
                <span className="text-[#4285F4]">g</span>
                <span className="text-[#34A853]">l</span>
                <span className="text-[#EA4335]">e</span>
                <span className="text-slate-400 font-normal">×</span>
                <span className="text-amber-400">CHIPSET</span>
              </div>
            </div>

            {/* Neon centerpiece */}
            <div className="relative z-10 text-center my-6 space-y-1.5">
              <h2 className="text-[#5ae0ff] font-black text-2xl tracking-widest uppercase drop-shadow-[0_0_10px_rgba(90,224,255,0.75)] animate-pulse flex items-center justify-center gap-2">
                CONGRATULATIONS! <span className="text-sky-400">✈️</span>
              </h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                You've been cleared for
              </p>
              <h1 className="text-4xl sm:text-5xl font-black tracking-[0.2em] text-white uppercase bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
                CLOUD9
              </h1>
            </div>

            {/* Bottom metadata panel */}
            <div className="relative z-10 flex items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <div className="grid grid-cols-4 gap-2 flex-1 text-left">
                {/* Date */}
                <div className="space-y-1">
                  <span className="text-[7px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5 text-[#4285F4]" /> Date
                  </span>
                  <span className="text-xl font-black text-[#4285F4] block font-mono leading-none">29</span>
                  <span className="text-[7.5px] uppercase font-bold text-sky-400 block leading-none">August 2026</span>
                </div>
                
                {/* Destination */}
                <div className="space-y-1">
                  <span className="text-[7px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-[#EA4335]" /> Destination
                  </span>
                  <span className="text-[9px] font-black text-white block uppercase leading-none mt-1">Gallery</span>
                  <span className="text-[9px] font-black text-[#EA4335] block uppercase leading-none">Hall 1</span>
                </div>

                {/* Boarding Time */}
                <div className="space-y-1">
                  <span className="text-[7px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-white" /> Boarding
                  </span>
                  <span className="text-[9px] font-black text-white block uppercase leading-none mt-1">9 AM</span>
                  <span className="text-[8px] font-black text-sky-400 block uppercase leading-none">Onwards</span>
                </div>

                {/* Gate */}
                <div className="space-y-1">
                  <span className="text-[7px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-1">
                    <DoorOpen className="w-2.5 h-2.5 text-[#FBBC05]" /> Gate
                  </span>
                  <span className="text-[9px] font-black text-white block uppercase leading-none mt-1">Block</span>
                  <span className="text-[9px] font-black text-[#FBBC05] block uppercase leading-none">5</span>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center shrink-0">
                <div className="bg-white p-1 rounded-lg border border-amber-500/20">
                  <QRCodeSVG
                    value={verifyUrl}
                    size={65}
                    level="H"
                    includeMargin={false}
                    fgColor="#08080C"
                    bgColor="#FFFFFF"
                  />
                </div>
              </div>
            </div>
            
            {/* Custom footer bar */}
            <div className="w-full border-t border-dashed border-slate-800/80 mt-3 pt-2 flex items-center justify-between text-[8px] text-slate-500 uppercase tracking-widest font-mono">
              <span className="text-blue-500/80">Google</span>
              <span className="text-slate-400">CHIPSET</span>
              <span className="text-red-500/80">Google</span>
            </div>
          </div>

          {/* RIGHT PANEL: STUB TICKET */}
          <div className="w-full md:w-[250px] bg-black/60 p-5 flex flex-col justify-between relative overflow-hidden">
            {/* Plane watermark */}
            <div className="absolute -bottom-6 -right-6 text-slate-900/10 text-9xl font-black pointer-events-none select-none">
              ✈️
            </div>

            {/* Blue Banner */}
            <div className="bg-[#0f4c9c] text-white flex items-center justify-between px-3.5 py-1.5 rounded-lg border border-blue-500/25">
              <span className="text-[9px] font-bold uppercase tracking-wider">Boarding Pass</span>
              <span className="text-xs">✈️</span>
            </div>

            {/* Details list */}
            <div className="my-4 space-y-2.5 text-left relative z-10">
              <div>
                <span className="text-[8px] uppercase font-bold text-slate-500 block">Passenger</span>
                <span className="text-xs font-black text-white uppercase truncate block max-w-full">
                  {participant.name}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[8px] uppercase font-bold text-slate-500 block">Flight</span>
                  <span className="text-xs font-black text-amber-400 block font-mono">CLOUD9 ☁️</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase font-bold text-slate-500 block">Date</span>
                  <span className="text-xs font-black text-white block font-mono">29 AUG 2026</span>
                </div>
              </div>
              <div>
                <span className="text-[8px] uppercase font-bold text-slate-500 block">Destination</span>
                <span className="text-xs font-black text-white uppercase truncate block max-w-full">
                  Gallery Hall 1
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[8px] uppercase font-bold text-slate-500 block">Boarding Time</span>
                  <span className="text-xs font-black text-white block font-mono">9 AM ONWARDS</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase font-bold text-slate-500 block">Gate</span>
                  <span className="text-[9px] font-black text-yellow-400 leading-tight block uppercase break-words font-sans">
                    Block V 1st floor near Central Library
                  </span>
                </div>
              </div>
            </div>

            {/* Stub Footer */}
            <div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-3 relative z-10">
              <div className="text-left shrink-0">
                <span className="text-[7px] text-slate-500 uppercase tracking-widest block font-bold">Chipset Pass</span>
                <span className="text-[9px] font-black text-[#5ae0ff] block font-mono tracking-widest">{participant.unique_id}</span>
              </div>
              
              {/* Flex-based barcode representation */}
              <div className="flex h-7 items-stretch gap-[1.5px] bg-white px-2 py-1 rounded-sm shrink-0 shadow-sm border border-slate-200">
                {[1, 2, 1, 3, 1, 2, 3, 1, 2, 1, 2, 1, 3].map((w, idx) => (
                  <div key={idx} className="bg-black" style={{ width: `${w}px` }} />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* RSVP Response Panel */}
      {participant.selection_status === 'SELECTED' && (
        <div className="w-full max-w-[850px] mt-4 p-4 rounded-2xl bg-[#0e0d14]/85 border border-amber-500/30 backdrop-blur-md text-center space-y-3 no-print">
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
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 max-w-[850px] w-full no-print">
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
            id={`btn-email-${participant.unique_id}`}
            onClick={handleShareEmail}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-300 transition-all active:scale-95 cursor-pointer"
            title="Open default email client (Gmail) to send pass"
          >
            <Mail className="w-3.5 h-3.5 text-amber-400" />
            <span>Email</span>
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
