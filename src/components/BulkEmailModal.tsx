import React, { useState } from 'react';
import { Mail, Send, Copy, Check, ExternalLink, X, Sparkles, CheckCircle2, AlertCircle, ShieldCheck, Settings, Users, MessageSquare, KeyRound, Eye, EyeOff, TestTube } from 'lucide-react';
import type { Participant } from '../types';

interface BulkEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
}

export const BulkEmailModal: React.FC<BulkEmailModalProps> = ({
  isOpen,
  onClose,
  participants,
}) => {
  const selectedParticipants = participants.filter((p) => p.selection_status === 'SELECTED');
  
  const [activeTab, setActiveTab] = useState<'server' | 'client' | 'copy'>('server');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Automated Dispatch Credentials
  const [provider, setProvider] = useState<'resend' | 'gmail'>('resend');
  const [resendApiKey, setResendApiKey] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [customSubject, setCustomSubject] = useState('🎉 You are Selected for Cloud9 Event! [RSVP to Confirm Seat]');

  // Test Email state
  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Bulk Dispatch state
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [sendResult, setSendResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://chipset.community';

  const allEmails = Array.from(
    new Set(
      selectedParticipants
        .flatMap((p) => [p.college_email, p.personal_email, p.email])
        .filter(Boolean)
        .map((e) => String(e).trim().toLowerCase())
    )
  );

  const commaSeparatedEmails = allEmails.join(', ');
  const newlineSeparatedEmails = allEmails.join('\n');

  const defaultEmailBody = 
`Dear Selected Cloud9 Participant,

Congratulations! You have been selected to attend the exclusive Cloud9 event organized by the Chipset technical community.

🗓️ EVENT DETAILS:
• Date: 29 August 2026
• Time: 9:00 AM Onwards
• Destination: Gallery Hall 1
• Gate: Block 5, 1st Floor (Near Central Library)

⚠️ MANDATORY NEXT STEP:
Please open your official invitation pass to RSVP and confirm your attendance:
👉 Pass & RSVP Portal: ${baseUrl}/verify

Please ensure you have your Pass (digital or printed) ready with the QR code at the registration desk for verification.

Looking forward to seeing you at Cloud9!

Best regards,
Cloud9 Organizing Team
Chipset Community`;

  const whatsappAnnouncement = 
`🎉 *CONGRATULATIONS! You have been selected for Cloud9!* 🚀

We are thrilled to welcome you to Cloud9 on *29 August 2026* at *Gallery Hall 1 (Block 5, 1st Floor)* from *9:00 AM onwards*.

👉 *Action Required:* Access & RSVP your Official Boarding Pass:
${baseUrl}/verify

See you at the launchpad! ☁️✨`;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const isConfigReady = provider === 'resend' ? Boolean(resendApiKey.trim()) : (Boolean(smtpUser.trim()) && Boolean(smtpPass.trim()));

  const handleSendTestEmail = async () => {
    if (!isConfigReady) {
      alert(provider === 'resend' ? 'Please enter your Resend API Key.' : 'Please enter your Gmail and 16-character App Password.');
      return;
    }
    const target = testEmail.trim() || smtpUser.trim();
    if (!target) {
      alert('Please enter a test recipient email address in Step 1.');
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: provider === 'resend' ? resendApiKey.trim() : undefined,
          smtpUser: provider === 'gmail' ? smtpUser.trim() : undefined,
          smtpPass: provider === 'gmail' ? smtpPass.trim() : undefined,
          testEmail: target,
          originUrl: baseUrl
        })
      });
      const data = await res.json();
      setTestResult({
        success: res.ok,
        message: data.message || (res.ok ? 'Test email sent successfully!' : 'Failed to send test email.')
      });
    } catch (err: any) {
      setTestResult({ success: false, message: 'Network error sending test email.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleServerBulkDispatch = async () => {
    if (!isConfigReady) {
      alert(provider === 'resend' ? 'Please enter your Resend API Key.' : 'Please enter your Gmail and 16-character App Password.');
      return;
    }
    if (selectedParticipants.length === 0) return;

    const senderDesc = provider === 'resend' ? 'Resend Cloud API' : smtpUser;
    const confirmMsg = `Are you sure you want to automatically dispatch personalized passes to all ${selectedParticipants.length} selected candidates via ${senderDesc}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsSending(true);
      setSendResult(null);
      setSendProgress({ current: 0, total: selectedParticipants.length, message: 'Connecting to mail server & dispatching personalized passes...' });

      const res = await fetch('/api/email/bulk-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: provider === 'resend' ? resendApiKey.trim() : undefined,
          smtpUser: provider === 'gmail' ? smtpUser.trim() : undefined,
          smtpPass: provider === 'gmail' ? smtpPass.trim() : undefined,
          subject: customSubject.trim(),
          originUrl: baseUrl,
          participantIds: selectedParticipants.map((p) => p.unique_id)
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSendResult(data);
        setSendProgress({ current: data.successCount || selectedParticipants.length, total: selectedParticipants.length, message: data.message });
      } else {
        alert(data.message || 'Failed to dispatch bulk emails.');
      }
    } catch (err: any) {
      console.error('Error dispatching bulk email:', err);
      alert('Network error while dispatching emails.');
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenGmail = () => {
    const subject = encodeURIComponent(customSubject);
    const body = encodeURIComponent(defaultEmailBody);
    const bcc = encodeURIComponent(allEmails.join(','));
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&bcc=${bcc}&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank');
  };

  const handleOpenDefaultMailClient = () => {
    const subject = encodeURIComponent(customSubject);
    const body = encodeURIComponent(defaultEmailBody);
    const bcc = encodeURIComponent(allEmails.join(','));
    window.location.href = `mailto:?bcc=${bcc}&subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#0e0d14] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-950/60 my-8 max-h-[90vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Automated Candidate Dispatcher
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {selectedParticipants.length} Selected Candidates
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Personalized Email Dispatch Engine
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Automatically sends each candidate their <strong>individual name and personal pass link (<code className="text-amber-300 font-mono">/verify?id=...</code>)</strong>.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-amber-500/20 mb-6 gap-2">
          <button
            onClick={() => setActiveTab('server')}
            className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'server'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Automated 1-Click Dispatch (Personalized)
          </button>
          <button
            onClick={() => setActiveTab('client')}
            className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'client'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🚀 Webmail / Gmail BCC
          </button>
          <button
            onClick={() => setActiveTab('copy')}
            className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'copy'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📋 Copy Lists & Templates
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          
          {/* TAB 1: Automated Dispatcher */}
          {activeTab === 'server' && (
            <div className="space-y-4">
              
              {/* Feature highlight */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-black/40 to-emerald-950/50 border border-emerald-500/30 text-xs text-emerald-200 leading-relaxed">
                <div className="flex items-center gap-2 font-black text-emerald-400 uppercase tracking-wide text-xs mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>How Automated Dispatch Works</span>
                </div>
                The server loops through all <strong className="text-white">{selectedParticipants.length} candidates</strong>. Every participant receives their own email addressed to them with their <strong>specific name</strong>, <strong>unique Selection ID</strong>, and <strong>direct personal pass link to RSVP</strong>.
              </div>

              {/* Email Provider Selector */}
              <div className="p-5 rounded-2xl bg-black/60 border border-amber-500/30 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                      Choose Sending Method
                    </h3>
                  </div>
                  <div className="flex gap-1.5 p-0.5 bg-white/5 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => setProvider('resend')}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg transition ${
                        provider === 'resend' 
                          ? 'bg-amber-500 text-black shadow' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ⚡ Resend API (Render Cloud)
                    </button>
                    <button
                      type="button"
                      onClick={() => setProvider('gmail')}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg transition ${
                        provider === 'gmail' 
                          ? 'bg-amber-500 text-black shadow' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ✉️ Gmail SMTP
                    </button>
                  </div>
                </div>

                {provider === 'resend' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Resend API Key (<code className="text-amber-300 font-mono">re_...</code>)
                      </label>
                      <input
                        type="password"
                        placeholder="re_123456789_abcdef..."
                        value={resendApiKey}
                        onChange={(e) => setResendApiKey(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-black/80 border border-amber-500/30 rounded-xl text-white text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-200/90 leading-relaxed">
                      <strong>✨ Why Resend for Render Cloud Hosting?</strong>
                      <p className="mt-1 text-slate-300">
                        Render blocks SMTP ports (465/587) to prevent spam. Resend operates over standard <strong>HTTPS (Port 443)</strong>, which is 100% unblocked on Render!
                      </p>
                      <p className="mt-1 text-slate-300">
                        👉 Get a free API key in 30 seconds at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline font-bold">resend.com</a> (Free tier includes 3,000 emails/month).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          Gmail / Sender Email Address
                        </label>
                        <input
                          type="email"
                          placeholder="e.g. yourname@gmail.com"
                          value={smtpUser}
                          onChange={(e) => setSmtpUser(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-black/80 border border-amber-500/30 rounded-xl text-white text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          16-Character App Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="e.g. abcd efgh ijkl mnop"
                            value={smtpPass}
                            onChange={(e) => setSmtpPass(e.target.value)}
                            className="w-full px-3.5 py-2.5 pr-10 bg-black/80 border border-amber-500/30 rounded-xl text-white text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-amber-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white bg-transparent border-none cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
                      <strong>💡 Gmail App Password Instructions:</strong>
                      <ol className="list-decimal list-inside mt-1 space-y-0.5 text-slate-300">
                        <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline font-bold">Google App Passwords</a>.</li>
                        <li>Type App Name: <strong className="text-white">Cloud9</strong> &gt; Click <strong>Create</strong>.</li>
                        <li>Copy the 16-letter password into the box above.</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wide">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-amber-500/30 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Step 1: Send Test Email */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    🧪 Step 1: Test with a Single Email First (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your personal email to receive a test preview"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-black/70 border border-white/20 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isTesting || !isConfigReady}
                  className="sm:mt-5 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <TestTube className="w-3.5 h-3.5" />
                  <span>{isTesting ? 'Sending Test...' : 'Send Test Email'}</span>
                </button>
              </div>

              {testResult && (
                <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                  testResult.success 
                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-200' 
                    : 'bg-rose-500/15 border border-rose-500/40 text-rose-200'
                }`}>
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
              )}

              {/* Step 2: Main Launch Button */}
              <button
                onClick={handleServerBulkDispatch}
                disabled={isSending || !isConfigReady || selectedParticipants.length === 0}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:opacity-95 text-slate-950 font-black text-sm transition-all shadow-xl shadow-emerald-500/25 active:scale-98 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Sending Personalized Passes to {selectedParticipants.length} Participants...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>🚀 Launch Automated Dispatch to All {selectedParticipants.length} Candidates</span>
                  </>
                )}
              </button>

              {/* Progress Bar & Status */}
              {sendProgress && (
                <div className="p-4 rounded-2xl bg-black/50 border border-amber-500/30 space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-amber-300">{sendProgress.message}</span>
                    <span className="text-white">{sendProgress.current} / {sendProgress.total}</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-400 transition-all duration-300 rounded-full"
                      style={{ width: `${Math.min(100, (sendProgress.current / sendProgress.total) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {sendResult && (
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs space-y-2 text-emerald-200">
                  <div className="flex items-center gap-2 font-bold text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{sendResult.message}</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Successful: <strong className="text-emerald-300">{sendResult.successCount}</strong> • Failed: <strong className="text-rose-400">{sendResult.failCount}</strong> • Total Candidates: {sendResult.total}
                  </p>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: Client Mailto / Gmail */}
          {activeTab === 'client' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
                Click below to launch Gmail with all <strong className="text-white">{allEmails.length} participant emails</strong> in the <code className="font-mono bg-black/40 px-1 py-0.5 rounded text-amber-300">BCC:</code> field to send a general announcement pointing to the public pass portal.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleOpenGmail}
                  className="flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl bg-[#EA4335] hover:bg-[#d9382b] text-white font-black text-xs transition-all shadow-lg shadow-red-500/20 active:scale-95 cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>Open in Gmail (BCC {allEmails.length} Recipients)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleOpenDefaultMailClient}
                  className="flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Open in Default Mail Client</span>
                </button>
              </div>

              <div className="mt-4 p-4 rounded-2xl bg-black/60 border border-white/10">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  Email Message Preview
                </span>
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {defaultEmailBody}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: Copy Lists & Templates */}
          {activeTab === 'copy' && (
            <div className="space-y-4">
              
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white">All {allEmails.length} Email Addresses (Comma-separated)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Ready to paste directly into Gmail or Outlook BCC field.</p>
                </div>
                <button
                  onClick={() => handleCopy(commaSeparatedEmails, 'comma')}
                  className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  {copiedType === 'comma' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'comma' ? 'Copied!' : 'Copy Emails'}</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white">All {allEmails.length} Email Addresses (One per Line)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Ideal for spreadsheet import, Mailchimp, or newsletter lists.</p>
                </div>
                <button
                  onClick={() => handleCopy(newlineSeparatedEmails, 'line')}
                  className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  {copiedType === 'line' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'line' ? 'Copied!' : 'Copy List'}</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-emerald-300">WhatsApp Broadcast Announcement Message</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Formatted with bold markdown, pass links, and WhatsApp group URL.</p>
                </div>
                <button
                  onClick={() => handleCopy(whatsappAnnouncement, 'whatsapp')}
                  className="px-4 py-2 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/50 text-[#25D366] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  {copiedType === 'whatsapp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <MessageSquare className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'whatsapp' ? 'Copied!' : 'Copy WhatsApp Text'}</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white">Full Email Body Text</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Complete announcement copy with event details and steps.</p>
                </div>
                <button
                  onClick={() => handleCopy(defaultEmailBody, 'template')}
                  className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  {copiedType === 'template' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'template' ? 'Copied!' : 'Copy Template'}</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-amber-500/20 flex items-center justify-between text-xs text-slate-400">
          <span>Official Chipset Technical Community Event Dispatcher</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
