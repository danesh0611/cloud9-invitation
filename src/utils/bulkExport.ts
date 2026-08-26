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
  const width = 800;
  const height = 1220;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // 1. Yellow/Amber Dark Theme Gradient Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#0d0d12');
  bgGrad.addColorStop(0.35, '#14120c');
  bgGrad.addColorStop(0.7, '#1a1408');
  bgGrad.addColorStop(1, '#08080c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Yellow & Gold Radial Glow Orbs
  const glowTop = ctx.createRadialGradient(width - 80, 120, 10, width - 80, 120, 320);
  glowTop.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
  glowTop.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = glowTop;
  ctx.beginPath();
  ctx.arc(width - 80, 120, 320, 0, Math.PI * 2);
  ctx.fill();

  const glowBottom = ctx.createRadialGradient(100, height - 120, 10, 100, height - 120, 300);
  glowBottom.addColorStop(0, 'rgba(234, 179, 8, 0.2)');
  glowBottom.addColorStop(1, 'rgba(234, 179, 8, 0)');
  ctx.fillStyle = glowBottom;
  ctx.beginPath();
  ctx.arc(100, height - 120, 300, 0, Math.PI * 2);
  ctx.fill();

  // 3. Card Outer Border with Gold Accent
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.lineWidth = 3;
  roundRect(ctx, 24, 24, width - 48, height - 48, 28);
  ctx.stroke();

  // 4. Draw Official CHIPSET Logo on Top
  const logoSvg = getChipsetLogoSvgString({
    textColor: '#FFFFFF',
    amberColor: '#F59E0B',
    width: 320,
    height: 85,
  });
  const logoBlob = new Blob([logoSvg], { type: 'image/svg+xml;charset=utf-8' });
  const logoUrl = URL.createObjectURL(logoBlob);
  const logoImg = new Image();

  await new Promise<void>((resolve, reject) => {
    logoImg.onload = () => resolve();
    logoImg.onerror = reject;
    logoImg.src = logoUrl;
  });

  ctx.drawImage(logoImg, 55, 55, 320, 85);
  URL.revokeObjectURL(logoUrl);

  // Badge: SELECTED (Gold Badge)
  ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
  ctx.lineWidth = 2;
  roundRect(ctx, width - 220, 72, 160, 48, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FBBF24';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★ SELECTED', width - 140, 103);

  // Separator Line
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(55, 165);
  ctx.lineTo(width - 55, 165);
  ctx.stroke();

  // 5. Section: Congratulations, [NAME]!
  ctx.textAlign = 'center';
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('PERSONAL INVITATION PASS', width / 2, 215);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 42px sans-serif';
  if (participant.name.length > 20) {
    ctx.font = '900 34px sans-serif';
  }
  ctx.fillText(`Congratulations, ${participant.name}!`, width / 2, 275);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '500 22px sans-serif';
  ctx.fillText('You are selected for Cloud 9 event.', width / 2, 335);

  // 6. Generate QR Code image with High Contrast
  const verifyUrl = `${baseUrl}/verify?id=${participant.unique_id}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 320,
    color: {
      dark: '#08080C',
      light: '#FFFFFF',
    },
  });

  const qrImg = new Image();
  await new Promise<void>((resolve, reject) => {
    qrImg.onload = () => resolve();
    qrImg.onerror = reject;
    qrImg.src = qrDataUrl;
  });

  // Draw QR background box with warm border
  const qrBoxSize = 340;
  const qrBoxY = 440;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, (width - qrBoxSize) / 2, qrBoxY, qrBoxSize, qrBoxSize, 22);
  ctx.fill();

  // Draw QR image
  ctx.drawImage(qrImg, (width - 310) / 2, qrBoxY + 15, 310, 310);

  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('SCAN TO VERIFY AGAINST CHIPSET DATABASE', width / 2, qrBoxY + qrBoxSize + 35);

  // 7. Selection ID & Year of Study Boxes with Gold Glow
  const idBoxY = 865;
  
  // Left Box (Selection ID)
  ctx.fillStyle = 'rgba(20, 16, 8, 0.85)';
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
  ctx.lineWidth = 2;
  roundRect(ctx, 90, idBoxY, 250, 115, 18);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FCD34D';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('SELECTION ID', 215, idBoxY + 36);

  ctx.fillStyle = '#F59E0B';
  ctx.font = '900 28px monospace';
  ctx.fillText(participant.unique_id, 215, idBoxY + 82);

  // Right Box (Year of Study)
  ctx.fillStyle = 'rgba(20, 16, 8, 0.85)';
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
  ctx.lineWidth = 2;
  roundRect(ctx, 360, idBoxY, 250, 115, 18);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FCD34D';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('YEAR OF STUDY', 485, idBoxY + 36);

  ctx.fillStyle = '#F59E0B';
  ctx.font = '900 24px sans-serif';
  ctx.fillText(participant.year_of_study || 'N/A', 485, idBoxY + 82);

  // 8. Footer Anti-Tamper & Branding
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(55, 1030);
  ctx.lineTo(width - 55, 1030);
  ctx.stroke();

  ctx.fillStyle = '#34D399';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🛡️ Database-Authoritative Key', 55, 1070);

  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`CHIPSET • ${new Date().getFullYear()}`, width - 55, 1070);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Official Chipset Community Pass • Non-Transferable', width / 2, 1125);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob || new Blob());
    }, 'image/png');
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
