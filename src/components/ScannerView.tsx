import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, CheckCircle, AlertTriangle, XCircle, Clock, ShieldCheck, RefreshCw, UserCheck, Zap, Volume2, VolumeX, ShieldAlert } from 'lucide-react';
import type { Participant, VerificationResponse } from '../types';
import { formatTimestamp } from '../utils/idGenerator';
import { playSuccessBeep, playWarningBeep, playErrorBeep } from '../utils/audio';
import { ChipsetLogo } from './ChipsetLogo';

interface ScannerViewProps {
  participants: Participant[];
  onCheckInCompleted: () => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  participants,
  onCheckInCompleted,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedId, setScannedId] = useState<string>('');
  const [verification, setVerification] = useState<VerificationResponse | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInSuccessMsg, setCheckInSuccessMsg] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentScans, setRecentScans] = useState<Array<{ id: string; name?: string; status: string; time: string }>>([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-video-box';

  const parseScannedText = (text: string): string => {
    try {
      if (text.includes('id=')) {
        const url = new URL(text);
        const id = url.searchParams.get('id');
        if (id) return id.trim().toUpperCase();
      }
      const match = text.match(/C9-[A-Z0-9]{4,10}/i);
      if (match) return match[0].toUpperCase();
    } catch {
      // Fallback
    }
    return text.trim().toUpperCase();
  };

  const handleScanSuccess = async (decodedText: string) => {
    const cleanId = parseScannedText(decodedText);
    if (!cleanId || cleanId === scannedId) return;

    setScannedId(cleanId);
    setCheckInSuccessMsg(null);

    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.pause(true);
      } catch (e) {
        console.debug('Error pausing scanner:', e);
      }
    }

    await verifyScannedId(cleanId);
  };

  const verifyScannedId = async (id: string) => {
    try {
      const response = await fetch(`/api/verify/${encodeURIComponent(id)}`);
      const data: VerificationResponse = await response.json();

      setVerification(data);

      const nowStr = new Date().toLocaleTimeString();

      if (data.valid && data.status === 'VALID') {
        if (soundEnabled) playSuccessBeep();
        setRecentScans((prev) => [
          { id, name: data.participant?.name, status: 'VALID', time: nowStr },
          ...prev.slice(0, 7),
        ]);
      } else if (data.valid && data.status === 'ALREADY_CHECKED_IN') {
        if (soundEnabled) playWarningBeep();
        setRecentScans((prev) => [
          { id, name: data.participant?.name, status: 'DUPLICATE', time: nowStr },
          ...prev.slice(0, 7),
        ]);
      } else {
        if (soundEnabled) playErrorBeep();
        setRecentScans((prev) => [
          { id, name: 'Unknown / Invalid', status: 'INVALID', time: nowStr },
          ...prev.slice(0, 7),
        ]);
      }
    } catch (err) {
      console.error('Scan verification failed:', err);
      if (soundEnabled) playErrorBeep();
      setVerification({
        valid: false,
        status: 'INVALID',
        message: 'Could not connect to verification server.',
      });
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {}
      );
      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera start error:', err);
      setCameraError(err.message || 'Unable to access camera. Please check permissions or use manual ID input.');
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.debug('Error stopping camera:', err);
      }
    }
    setIsScanning(false);
  };

  const resumeScanning = async () => {
    setScannedId('');
    setVerification(null);
    setCheckInSuccessMsg(null);

    if (html5QrCodeRef.current && isScanning) {
      try {
        html5QrCodeRef.current.resume();
      } catch {
        startCamera();
      }
    } else {
      startCamera();
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const clean = parseScannedText(manualInput);
    setScannedId(clean);
    verifyScannedId(clean);
    setManualInput('');
  };

  const handleCheckInAction = async () => {
    if (!verification?.participant?.unique_id) return;
    const id = verification.participant.unique_id;

    try {
      setCheckingIn(true);
      const res = await fetch(`/api/checkin/${encodeURIComponent(id)}`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok) {
        if (soundEnabled) playSuccessBeep();
        setCheckInSuccessMsg(`✅ Successfully checked in ${data.participant.name}!`);
        await verifyScannedId(id);
        onCheckInCompleted();
      } else {
        alert(data.message || 'Check-in failed');
      }
    } catch (err) {
      console.error('Check-in error:', err);
      alert('Network error while processing check-in.');
    } finally {
      setCheckingIn(false);
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [isScanning]);

  const selectedParticipants = participants.filter((p) => p.selection_status === 'SELECTED');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Station Header with Chipset Branding */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0e0d14]/90 backdrop-blur-xl border-2 border-amber-500/30 rounded-3xl p-6 shadow-2xl shadow-amber-950/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
              Staff Entrance Terminal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white mt-1">
            Chipset <span className="font-black text-amber-400">Live Entrance Scanner</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-4 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              soundEnabled ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-black/40 text-slate-400 border-amber-500/20'
            }`}
            title="Toggle audio feedback"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
            <span>Audio {soundEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Camera Scanner */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-[#0e0d14] border-2 border-amber-500/30 rounded-3xl p-5 flex flex-col items-center shadow-2xl">
            <div className="w-full relative rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center border border-amber-500/30 shadow-inner">
              <div id={scannerContainerId} className="w-full h-full object-cover" />

              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#08080C]/95 backdrop-blur-md z-10">
                  <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-xl shadow-amber-500/15">
                    <Camera className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-black text-white mb-1">
                    Camera Scanner Standby
                  </h3>
                  <p className="text-xs text-slate-400 mb-4 max-w-[240px] leading-relaxed">
                    Point camera at attendee's Chipset invitation QR code for instant check-in.
                  </p>
                  <button
                    id="btn-start-camera"
                    onClick={startCamera}
                    className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-amber-500/25 active:scale-95 cursor-pointer"
                  >
                    Start Live Scanner
                  </button>
                </div>
              )}

              {cameraError && (
                <div className="absolute bottom-3 left-3 right-3 p-3.5 rounded-xl bg-rose-950/90 backdrop-blur-md border border-rose-500/50 text-rose-200 text-xs z-20">
                  {cameraError}
                </div>
              )}
            </div>

            {/* Camera Controls */}
            {isScanning && (
              <div className="mt-4 flex items-center gap-3 w-full">
                <button
                  onClick={stopCamera}
                  className="flex-1 py-3 rounded-2xl bg-black/50 hover:bg-black/70 text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-500/30"
                >
                  <CameraOff className="w-4 h-4 text-rose-400" /> Stop Camera
                </button>
                <button
                  onClick={resumeScanning}
                  className="flex-1 py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" /> Reset Scanner
                </button>
              </div>
            )}
          </div>

          {/* Manual ID Input */}
          <div className="bg-[#0e0d14] border border-amber-500/25 rounded-3xl p-5 shadow-xl">
            <h4 className="text-xs font-black uppercase tracking-widest text-amber-400 mb-2.5">
              Manual ID / Barcode Gun Input
            </h4>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                id="input-manual-scan-id"
                type="text"
                placeholder="Scan or type ID (e.g. C9-X7K29P)"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="flex-1 px-4 py-3 bg-black/50 border border-amber-500/30 rounded-2xl text-white font-mono text-sm placeholder-slate-600 focus:outline-none focus:border-amber-400 uppercase transition"
              />
              <button
                type="submit"
                className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all cursor-pointer"
              >
                Lookup
              </button>
            </form>
          </div>

          {/* Quick Simulation Scanner */}
          <div className="bg-[#0e0d14] border border-amber-500/25 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Quick Test Simulation ({selectedParticipants.length} Loaded)
              </h4>
              <span className="text-[10px] text-amber-300/80">1-click test</span>
            </div>
            <select
              id="select-simulate-scan-participant"
              onChange={(e) => {
                if (e.target.value) {
                  setScannedId(e.target.value);
                  verifyScannedId(e.target.value);
                }
              }}
              defaultValue=""
              className="w-full bg-black/50 border border-amber-500/30 text-amber-200 text-xs rounded-2xl p-3 focus:outline-none focus:border-amber-400"
            >
              <option value="" disabled className="bg-slate-900">
                Select a participant to simulate QR scan...
              </option>
              {selectedParticipants.slice(0, 30).map((p) => (
                <option key={p.unique_id} value={p.unique_id} className="bg-slate-900">
                  {p.name} ({p.unique_id}) — {p.checked_in ? 'Already Checked In' : 'Ready'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Column: Scan Verification Result Card */}
        <div className="lg:col-span-6 space-y-4">
          {checkInSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-bold flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
              {checkInSuccessMsg}
            </div>
          )}

          {verification ? (
            <div className="bg-[#0e0d14] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              {/* STATE 1: First Scan - VERIFIED */}
              {verification.valid && verification.status === 'VALID' && verification.participant && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 pb-4 border-b border-emerald-500/30">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
                        First Scan Verification
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        ✅ VERIFIED
                      </h2>
                    </div>
                  </div>

                  <div className="space-y-3 bg-black/40 p-4 rounded-2xl border border-amber-500/20">
                    <div className="flex justify-between items-center py-1.5 border-b border-amber-500/10">
                      <span className="text-xs font-semibold text-slate-400">Name:</span>
                      <span className="text-lg font-black text-white">
                        {verification.participant.name}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-amber-500/10">
                      <span className="text-xs font-semibold text-slate-400">Selection ID:</span>
                      <span className="text-lg font-mono font-black text-amber-400">
                        {verification.participant.unique_id}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-amber-500/10">
                      <span className="text-xs font-semibold text-slate-400">Status:</span>
                      <span className="inline-flex px-3 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300">
                        {verification.participant.selection_status}
                      </span>
                    </div>

                    {verification.participant.team_name && (
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-xs font-semibold text-slate-400">Team:</span>
                        <span className="text-xs font-bold text-amber-300">
                          {verification.participant.team_name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-amber-200 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Database source of truth verified: <strong>{verification.participant.name}</strong></span>
                  </div>

                  <button
                    id="btn-confirm-checkin"
                    onClick={handleCheckInAction}
                    disabled={checkingIn}
                    className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base tracking-widest uppercase shadow-xl shadow-amber-500/30 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2.5"
                  >
                    <UserCheck className="w-5 h-5" />
                    {checkingIn ? 'Processing Check-In...' : 'CHECK IN COMPLETE'}
                  </button>
                </div>
              )}

              {/* STATE 2: Duplicate Scan - ALREADY CHECKED IN */}
              {verification.valid && verification.status === 'ALREADY_CHECKED_IN' && verification.participant && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 pb-4 border-b border-amber-500/30">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono font-bold tracking-widest text-amber-400 uppercase">
                        Duplicate Scan Detected
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                        ⚠️ ALREADY CHECKED IN
                      </h2>
                    </div>
                  </div>

                  <div className="space-y-3 bg-black/40 p-4 rounded-2xl border border-amber-500/20">
                    <div className="flex justify-between items-center py-1.5 border-b border-amber-500/10">
                      <span className="text-xs font-semibold text-slate-400">Name:</span>
                      <span className="text-lg font-black text-white">
                        {verification.participant.name}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-amber-500/10">
                      <span className="text-xs font-semibold text-slate-400">Selection ID:</span>
                      <span className="text-lg font-mono font-black text-amber-400">
                        {verification.participant.unique_id}
                      </span>
                    </div>

                    <div className="bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/30 flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" /> Checked in at:
                      </span>
                      <span className="text-base font-black font-mono text-white">
                        {formatTimestamp(verification.participant.check_in_time)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
                    <strong>Notice:</strong> This Chipset invitation pass was already validated at the entrance.
                  </div>

                  <button
                    onClick={resumeScanning}
                    className="w-full py-3.5 rounded-2xl bg-black/50 hover:bg-black/70 text-white font-bold text-xs transition-all cursor-pointer border border-amber-500/30"
                  >
                    Scan Next Participant
                  </button>
                </div>
              )}

              {/* STATE 3: Invalid Invitation */}
              {!verification.valid && (
                <div className="space-y-5">
                  <div className="flex items-center gap-4 pb-4 border-b border-rose-500/30">
                    <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/10">
                      <XCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono font-bold tracking-widest text-rose-400 uppercase">
                        Access Denied
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-rose-400 tracking-tight">
                        {verification.status === 'NOT_SELECTED' ? '⛔ PASS REVOKED / REALLOCATED' : '❌ INVALID INVITATION'}
                      </h2>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-200 space-y-2">
                    {verification.status === 'NOT_SELECTED' && verification.participant ? (
                      <>
                        <div className="flex justify-between items-center pb-1.5 border-b border-rose-500/20">
                          <span className="text-slate-400">Candidate:</span>
                          <strong className="text-white font-bold text-sm">{verification.participant.name}</strong>
                        </div>
                        <div className="flex justify-between items-center pb-1.5 border-b border-rose-500/20">
                          <span className="text-slate-400">Current Status:</span>
                          <span className="font-mono font-bold text-rose-400 px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/40">
                            {verification.participant.selection_status}
                          </span>
                        </div>
                        <p className="text-rose-200/90 text-xs pt-1 leading-relaxed">
                          ⛔ <strong>Do not admit:</strong> This candidate's seat was released and re-assigned to the waitlist pool due to unconfirmed RSVP deadline.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-sm text-white">
                          "This invitation could not be verified."
                        </p>
                        <p className="text-slate-400">
                          Scanned ID <code className="font-mono text-rose-300 font-bold">{scannedId}</code> does not exist in the database.
                        </p>
                      </>
                    )}
                  </div>

                  <button
                    onClick={resumeScanning}
                    className="w-full py-3.5 rounded-2xl bg-black/50 hover:bg-black/70 text-white font-bold text-xs transition-all cursor-pointer border border-amber-500/30"
                  >
                    Scan Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#0e0d14] border-2 border-dashed border-amber-500/25 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
                <UserCheck className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-200">Scanner Standby</h4>
              <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
                Scan participant QR code using the camera or lookup an ID to view verified identity and complete check-in.
              </p>
            </div>
          )}

          {/* Recent Scans Audit Stream */}
          {recentScans.length > 0 && (
            <div className="bg-[#0e0d14] border border-amber-500/25 rounded-3xl p-5 shadow-xl">
              <h4 className="text-xs font-black uppercase tracking-widest text-amber-400 mb-3">
                Recent Scans at this Station
              </h4>
              <div className="space-y-2">
                {recentScans.map((scan, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-amber-500/20 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {scan.status === 'VALID' && <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />}
                      {scan.status === 'DUPLICATE' && <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />}
                      {scan.status === 'INVALID' && <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />}
                      <span className="font-bold text-white">{scan.name}</span>
                      <span className="font-mono text-[10px] text-amber-300/80">{scan.id}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">{scan.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
