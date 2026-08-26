import QRCode from 'qrcode';
import JSZip from 'jszip';
import type { Participant } from '../types';
import { getChipsetLogoSvgString } from '../components/ChipsetLogo';

/**
 * Draws a high-resolution Yellow-Themed Chipset invitation card on an HTML5 canvas and converts to PNG blob.
 */
export async function renderInvitationCardToCanvas(
  participant: Participant,
  baseUrl: string
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const W = 1100;
  const H = 500;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // ── 1. Left panel: background template image ──────────────────────────────
  const bgImg = new Image();
  bgImg.crossOrigin = 'anonymous';
  bgImg.src = '/assets/ticket_bg.png';
  await new Promise<void>((resolve) => {
    bgImg.onload = () => resolve();
    bgImg.onerror = () => resolve(); // continue even if image fails
  });
  // Draw only the left 780px of the 1100px template (scaled to fit)
  ctx.drawImage(bgImg, 0, 0, W, H, 0, 0, 780, H);

  // ── 2. Right stub panel background ────────────────────────────────────────
  const STUB_X = 780;
  const STUB_W = W - STUB_X; // 320px
  ctx.fillStyle = '#08080C';
  ctx.fillRect(STUB_X, 0, STUB_W, H);

  // Dashed left border on stub
  ctx.strokeStyle = 'rgba(245,158,11,0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(STUB_X, 0);
  ctx.lineTo(STUB_X, H);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── 3. Blue header banner ─────────────────────────────────────────────────
  const HEADER_H = 38;
  ctx.fillStyle = '#1a56db';
  ctx.fillRect(STUB_X, 0, STUB_W, HEADER_H);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('✈  BOARDING PASS', STUB_X + 14, 24);

  // ── 4. Detail rows — 6 equal rows ─────────────────────────────────────────
  const BARCODE_W = 24;           // vertical barcode strip width
  const ROW_X = STUB_X + 10;
  const ROW_W = STUB_W - BARCODE_W - 10;
  const CONTENT_AREA_H = H - HEADER_H - 38; // minus header and footer
  const NUM_ROWS = 6;
  const ROW_H = CONTENT_AREA_H / NUM_ROWS;

  const rows = [
    { label: 'PASSENGER', value: participant.name.toUpperCase() },
    { label: 'FLIGHT',    value: 'CLOUD9 ☁️' },
    { label: 'DATE',      value: '29 AUG 2026' },
    { label: 'DESTINATION', value: 'GALLERY HALL 1' },
    { label: 'BOARDING TIME', value: '9 AM ONWARDS' },
    { label: 'GATE',      value: 'BLOCK 5, 1ST FLOOR\nNEAR CENTRAL LIBRARY' },
  ];

  rows.forEach((row, i) => {
    const rowY = HEADER_H + i * ROW_H;
    const midY = rowY + ROW_H / 2;

    // Blue label
    ctx.fillStyle = '#4d9fff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(row.label, ROW_X, midY - 8);

    // White value (handle multiline for GATE)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px sans-serif';
    if (row.value.includes('\n')) {
      const lines = row.value.split('\n');
      ctx.fillText(lines[0], ROW_X, midY + 4);
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(lines[1], ROW_X, midY + 18);
    } else {
      ctx.fillText(row.value, ROW_X, midY + 6);
    }

    // Dashed separator at bottom of row (except last)
    if (i < NUM_ROWS - 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(ROW_X, rowY + ROW_H);
      ctx.lineTo(STUB_X + STUB_W - BARCODE_W - 4, rowY + ROW_H);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  // ── 5. Vertical barcode strip ─────────────────────────────────────────────
  const BAR_X = STUB_X + STUB_W - BARCODE_W;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(BAR_X, HEADER_H, BARCODE_W, CONTENT_AREA_H);

  const barcodePattern = [2,1,3,1,2,3,1,2,1,3,2,1,3,1,2,1,3,2,1,2,3,1,2,1,3,1,2,3,1,2,1,3,2,1,2,3,1,2];
  let barY = HEADER_H + 6;
  const barW = Math.floor(BARCODE_W * 0.55);
  const barOffX = BAR_X + (BARCODE_W - barW) / 2;
  barcodePattern.forEach((h) => {
    ctx.fillStyle = '#000000';
    const barH = h * 1.4;
    ctx.fillRect(barOffX, barY, barW, barH);
    barY += barH + 2;
  });

  // ── 6. Footer bar ──────────────────────────────────────────────────────────
  const FOOTER_H = 38;
  const FOOTER_Y = H - FOOTER_H;
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(STUB_X, FOOTER_Y, STUB_W, FOOTER_H);

  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(STUB_X, FOOTER_Y);
  ctx.lineTo(W, FOOTER_Y);
  ctx.stroke();

  ctx.textAlign = 'center';
  const centerX = STUB_X + (STUB_W - BARCODE_W) / 2;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 8px sans-serif';
  ctx.fillText('THIS PASS IS YOUR ENTRY TO', centerX, FOOTER_Y + 16);

  // "CLOUD 9" in blue
  ctx.fillStyle = '#1a56db';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('CLOUD 9', centerX, FOOTER_Y + 29);

  // ── 7. QR code on left panel ───────────────────────────────────────────────
  const verifyUrl = `${baseUrl}/verify?id=${participant.unique_id}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 512,
    color: { dark: '#08080C', light: '#FFFFFF' },
  });

  const qrImg = new Image();
  await new Promise<void>((resolve, reject) => {
    qrImg.onload = () => resolve();
    qrImg.onerror = reject;
    qrImg.src = qrDataUrl;
  });

  // QR white bg block — sized to match UI (20% of 780px wide ≈ 156px)
  const QR_SIZE = 156;
  const QR_X = 780 - QR_SIZE - 10; // right-aligned on left panel
  const QR_Y = H - QR_SIZE - 14;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, QR_X - 4, QR_Y - 4, QR_SIZE + 8, QR_SIZE + 8, 6);
  ctx.fill();
  ctx.drawImage(qrImg, QR_X, QR_Y, QR_SIZE, QR_SIZE);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob || new Blob()), 'image/png');
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Bulk exports an array of participants into a single ZIP file containing PNG invitation cards.
 */
export async function generateBulkInvitationsZip(
  participants: Participant[],
  baseUrl: string,
  onProgress?: (current: number, total: number, currentName: string) => void
): Promise<Blob> {
  const zip = new JSZip();
  const selectedOnly = participants.filter((p) => p.selection_status === 'SELECTED');
  const total = selectedOnly.length;

  const folder = zip.folder('Chipset_Invitations') || zip;

  for (let i = 0; i < total; i++) {
    const p = selectedOnly[i];
    if (onProgress) {
      onProgress(i + 1, total, p.name);
    }
    const blob = await renderInvitationCardToCanvas(p, baseUrl);
    const sanitizedName = p.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    folder.file(`${p.unique_id}_${sanitizedName}.png`, blob);
  }

  // Also include a CSV manifest
  let csvContent = 'Unique_ID,Name,Email,Team_Name,Selection_Status,Checked_In,Verification_URL\n';
  selectedOnly.forEach((p) => {
    csvContent += `"${p.unique_id}","${p.name}","${p.email}","${p.team_name || ''}","${p.selection_status}","${p.checked_in}","${baseUrl}/verify?id=${p.unique_id}"\n`;
  });
  zip.file('manifest_participants.csv', csvContent);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return zipBlob;
}
