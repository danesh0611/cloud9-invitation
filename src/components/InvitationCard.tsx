import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Download, Share2, Check, Printer, ShieldCheck, Sparkles, ExternalLink, Mail, Calendar, MapPin, Clock, DoorOpen, User, Plane } from 'lucide-react';
import type { Participant } from '../types';
import { ChipsetLogo } from './ChipsetLogo';
import { renderInvitationCardToCanvas } from '../utils/bulkExport';

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
    try {
      setDownloading(true);
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const blob = await renderInvitationCardToCanvas(participant, baseUrl);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `Cloud9-Pass-${participant.name.replace(/\s+/g, '_')}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error('Failed to download card PNG:', err);
      alert('Download failed. Please take a screenshot of your pass and show it at the entry.');
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
        className="relative w-full aspect-[1100/500] rounded-3xl overflow-hidden shadow-2xl shadow-black/80 bg-gradient-to-b from-[#121118] via-[#0a090d] to-[#040406] text-white border-2 border-amber-500/40 p-0.5 @container"
        style={{ containerType: 'inline-size' }}
      >
        <div className="flex w-full h-full">
          
          {/* LEFT PANEL: MAIN TICKET (uses background image template) */}
          <div 
            className="h-full relative"
            style={{
              width: '70.9%',
              backgroundImage: 'url("/assets/ticket_bg.png")',
              backgroundSize: '141% 100%', // Scales template width to cover left panel exactly
              backgroundPosition: 'left center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* QR Code on Main Card (Left Section) — large enough to scan */}
            <div 
              className="absolute bg-white p-[0.8%] rounded-[6%] shadow-lg shadow-black/60 flex items-center justify-center pointer-events-auto"
              style={{
                left: '77.5%',
                top: '62.0%',
                width: '20.0%',
                height: '31.2%',
              }}
            >
              <QRCodeSVG
                value={verifyUrl}
                size={512}
                level="H"
                includeMargin={false}
                fgColor="#08080C"
                bgColor="#FFFFFF"
                className="w-full h-full"
              />
            </div>
          </div>

          {/* RIGHT PANEL: STUB TICKET — matches mockup exactly */}
          <div 
            className="h-full bg-[#08080C] flex flex-col overflow-hidden border-l border-dashed border-white/60"
            style={{ width: '29.1%' }}
          >
            {/* Blue Header Banner */}
            <div className="bg-[#1a56db] flex items-center gap-[4%] px-[5%] shrink-0" style={{ padding: '3.5% 5%' }}>
              <Plane className="text-white shrink-0" style={{ width: '1.5cqw', height: '1.5cqw' }} />
              <span className="font-black text-white uppercase tracking-widest" style={{ fontSize: '1.05cqw', letterSpacing: '0.1em' }}>BOARDING PASS</span>
            </div>

            {/* Main content: rows on left, vertical barcode on right */}
            <div className="flex flex-1 min-h-0">
              {/* Detail rows — each takes equal share of available height */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

                {/* PASSENGER */}
                <div className="flex-1 px-[6%] border-b border-dashed border-white/10 flex flex-col justify-center overflow-hidden min-h-0">
                  <span className="font-bold text-[#4d9fff] uppercase tracking-widest leading-none" style={{ fontSize: '0.7cqw' }}>PASSENGER</span>
                  <div className="flex items-center gap-[3%] mt-[1%]">
                    <User className="text-white shrink-0" style={{ width: '1.6cqw', height: '1.6cqw' }} />
                    <span className="font-black text-white uppercase truncate" style={{ fontSize: '1.75cqw' }}>{participant.name}</span>
                  </div>
                </div>

                {/* FLIGHT */}
                <div className="flex-1 px-[6%] border-b border-dashed border-white/10 flex flex-col justify-center overflow-hidden min-h-0">
                  <span className="font-bold text-[#4d9fff] uppercase tracking-widest leading-none" style={{ fontSize: '0.7cqw' }}>FLIGHT</span>
                  <div className="flex items-center gap-[3%] mt-[1%]">
                    <Plane className="text-white shrink-0" style={{ width: '1.6cqw', height: '1.6cqw' }} />
                    <span className="font-black text-white" style={{ fontSize: '1.75cqw' }}>CLOUD9 ☁️</span>
                  </div>
                </div>

                {/* DATE */}
                <div className="flex-1 px-[6%] border-b border-dashed border-white/10 flex flex-col justify-center overflow-hidden min-h-0">
                  <span className="font-bold text-[#4d9fff] uppercase tracking-widest leading-none" style={{ fontSize: '0.7cqw' }}>DATE</span>
                  <div className="flex items-center gap-[3%] mt-[1%]">
                    <Calendar className="text-white shrink-0" style={{ width: '1.6cqw', height: '1.6cqw' }} />
                    <span className="font-black text-white" style={{ fontSize: '1.75cqw' }}>29 AUG 2026</span>
                  </div>
                </div>

                {/* DESTINATION */}
                <div className="flex-1 px-[6%] border-b border-dashed border-white/10 flex flex-col justify-center overflow-hidden min-h-0">
                  <span className="font-bold text-[#4d9fff] uppercase tracking-widest leading-none" style={{ fontSize: '0.7cqw' }}>DESTINATION</span>
                  <div className="flex items-center gap-[3%] mt-[1%]">
                    <MapPin className="text-white shrink-0" style={{ width: '1.6cqw', height: '1.6cqw' }} />
                    <span className="font-black text-white uppercase truncate" style={{ fontSize: '1.75cqw' }}>GALLERY HALL 1</span>
                  </div>
                </div>

                {/* BOARDING TIME */}
                <div className="flex-1 px-[6%] border-b border-dashed border-white/10 flex flex-col justify-center overflow-hidden min-h-0">
                  <span className="font-bold text-[#4d9fff] uppercase tracking-widest leading-none" style={{ fontSize: '0.7cqw' }}>BOARDING TIME</span>
                  <div className="flex items-center gap-[3%] mt-[1%]">
                    <Clock className="text-white shrink-0" style={{ width: '1.6cqw', height: '1.6cqw' }} />
                    <span className="font-black text-white" style={{ fontSize: '1.75cqw' }}>9 AM ONWARDS</span>
                  </div>
                </div>

                {/* GATE */}
                <div className="flex-1 px-[6%] border-b border-dashed border-white/10 flex flex-col justify-center overflow-hidden min-h-0">
                  <span className="font-bold text-[#4d9fff] uppercase tracking-widest leading-none" style={{ fontSize: '0.7cqw' }}>GATE</span>
                  <div className="flex items-start gap-[3%] mt-[1%]">
                    <DoorOpen className="text-white shrink-0 mt-[0.1cqw]" style={{ width: '1.6cqw', height: '1.6cqw' }} />
                    <span className="font-black text-white uppercase leading-tight" style={{ fontSize: '1.1cqw' }}>BLOCK 5, 1ST FLOOR NEAR CENTRAL LIBRARY</span>
                  </div>
                </div>

              </div>

              {/* Vertical Barcode — right edge */}
              <div className="bg-white flex flex-col items-center justify-between py-[2%] shrink-0" style={{ width: '2.6cqw', padding: '3% 0' }}>
                {[2,1,3,1,2,3,1,2,1,3,2,1,3,1,2,1,3,2,1,2,3,1,2,1,3,1,2,3,1,2,1,3,2,1,2,3,1,2].map((h, idx) => (
                  <div key={idx} className="bg-black" style={{ width: '55%', height: `${h * 1.4}px` }} />
                ))}
              </div>
            </div>

            {/* Footer black bar */}
            <div className="bg-[#0a0a0a] border-t border-white/10 flex items-center justify-center shrink-0 px-[3%]" style={{ minHeight: '8%' }}>
              <p className="font-bold text-white uppercase tracking-widest text-center leading-snug" style={{ fontSize: '0.68cqw' }}>
                THIS PASS IS YOUR ENTRY TO{' '}
                <span className="font-black text-[#1a56db] whitespace-nowrap">CLOUD&nbsp;9</span>
              </p>
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
            <div className="space-y-2 text-left">
              <p className="text-[11px] text-slate-300 leading-relaxed">
                🎉 <strong className="text-emerald-400">Your seat is confirmed!</strong> Please join the official WhatsApp group below to receive event schedules and updates.
              </p>
              <p className="text-[10px] text-slate-500">
                If your availability changes, you can still <button onClick={() => handleRsvp('DECLINED')} className="text-rose-400 underline hover:text-rose-300 bg-transparent border-none cursor-pointer p-0 text-[10px] font-bold">Decline Seat</button> to free it for others on the waitlist.
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 leading-relaxed text-left">
              You marked that you will not be attending. Your seat is now released for other candidates. If you changed your mind, you can still <button onClick={() => handleRsvp('CONFIRMED')} className="text-emerald-400 underline hover:text-emerald-300 bg-transparent border-none cursor-pointer p-0 text-[11px] font-bold">Confirm Seat</button>.
            </p>
          )}
        </div>
      )}

      {/* 💬 Official WhatsApp Group Invite (Shown after Confirmation) */}
      {participant.selection_status === 'SELECTED' && rsvpStatus === 'CONFIRMED' && (
        <div className="w-full max-w-[850px] mt-3 rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-r from-emerald-950/60 via-[#0a1e12]/80 to-emerald-950/60 backdrop-blur-md p-4 no-print shadow-xl shadow-emerald-950/50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
            <div className="flex items-start gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 flex items-center justify-center shrink-0 text-[#25D366] shadow-md shadow-emerald-500/10">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-black text-emerald-300 tracking-wide uppercase">Join Official WhatsApp Group</h4>
                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 rounded-md">Next Step</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Join the Cloud9 participants group for event schedule, team coordination, and live announcements.
                </p>
              </div>
            </div>
            <a
              id={`btn-whatsapp-${participant.unique_id}`}
              href="https://chat.whatsapp.com/DcV5YL43n8JDO8OFeAxixt?s=cl&p=a&ilr=4"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Join WhatsApp Group</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* 📲 Download & Show Instruction Banner */}
      {participant.selection_status === 'SELECTED' && (
        <div className="w-full max-w-[850px] mt-3 rounded-2xl border border-amber-500/50 bg-amber-500/10 backdrop-blur-md px-4 py-3 no-print">
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">📲</span>
            <div className="text-left">
              <p className="text-amber-300 font-black text-sm uppercase tracking-wide">Download &amp; Show at Entry</p>
              <p className="text-amber-200/80 text-xs leading-relaxed mt-0.5">
                Save your boarding pass as a PNG by tapping <strong className="text-white">Download PNG</strong> below.
                You <strong className="text-white">must show this pass</strong> (on screen or printed) at the event entry gate —
                Block 5, 1st Floor near Central Library — on <strong className="text-white">29 Aug 2026</strong>.
              </p>
            </div>
          </div>
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
