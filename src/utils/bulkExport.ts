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
  const width = 1100;
  const height = 500;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Helper function to wrap text inside canvas
  function wrapText(
    c: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = c.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        c.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    c.fillText(line, x, currentY);
  }

  // 1. Dark Theme Gradient Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#0d0d12');
  bgGrad.addColorStop(0.35, '#14120c');
  bgGrad.addColorStop(0.7, '#1a1408');
  bgGrad.addColorStop(1, '#08080c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Green & Red Radial Ambient Glows
  const glowTop = ctx.createRadialGradient(200, 100, 10, 200, 100, 250);
  glowTop.addColorStop(0, 'rgba(16, 185, 129, 0.12)');
  glowTop.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.fillStyle = glowTop;
  ctx.beginPath();
  ctx.arc(200, 100, 250, 0, Math.PI * 2);
  ctx.fill();

  const glowBottom = ctx.createRadialGradient(600, 400, 10, 600, 400, 250);
  glowBottom.addColorStop(0, 'rgba(239, 68, 68, 0.1)');
  glowBottom.addColorStop(1, 'rgba(239, 68, 68, 0)');
  ctx.fillStyle = glowBottom;
  ctx.beginPath();
  ctx.arc(600, 400, 250, 0, Math.PI * 2);
  ctx.fill();

  // 3. Card Outer Border
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.lineWidth = 3;
  roundRect(ctx, 16, 16, width - 32, height - 32, 28);
  ctx.stroke();

  // 4. Dashed Separator Line
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(780, 16);
  ctx.lineTo(780, 484);
  ctx.stroke();
  ctx.setLineDash([]); // Reset dash

  // 5. Draw Official CHIPSET Logo on Top Left
  const logoSvg = getChipsetLogoSvgString({
    textColor: '#FFFFFF',
    amberColor: '#F59E0B',
    width: 220,
    height: 60,
  });
  const logoBlob = new Blob([logoSvg], { type: 'image/svg+xml;charset=utf-8' });
  const logoUrl = URL.createObjectURL(logoBlob);
  const logoImg = new Image();

  await new Promise<void>((resolve, reject) => {
    logoImg.onload = () => resolve();
    logoImg.onerror = reject;
    logoImg.src = logoUrl;
  });

  ctx.drawImage(logoImg, 50, 45, 220, 60);
  URL.revokeObjectURL(logoUrl);

  // Google X CHIPSET text on the right side of left panel
  ctx.fillStyle = '#E2E8F0';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('GOOGLE × CHIPSET', 740, 80);

  // 6. Section: Congratulations Centerpiece
  ctx.textAlign = 'center';
  ctx.fillStyle = '#5ae0ff';
  ctx.font = 'bold 30px sans-serif';
  ctx.shadowColor = 'rgba(90, 224, 255, 0.7)';
  ctx.shadowBlur = 10;
  ctx.fillText('CONGRATULATIONS! ✈️', 390, 175);
  ctx.shadowBlur = 0; // Reset shadow

  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText("YOU'VE BEEN CLEARED FOR", 390, 215);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 62px sans-serif';
  ctx.fillText('CLOUD9', 390, 285);

  // Bottom Grid Separator
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(50, 345);
  ctx.lineTo(740, 345);
  ctx.stroke();

  // Bottom Panel Text Details
  ctx.textAlign = 'left';
  
  // Date
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('📅 DATE', 55, 375);
  ctx.fillStyle = '#4285F4';
  ctx.font = '900 22px monospace';
  ctx.fillText('29', 55, 405);
  ctx.fillStyle = '#5ae0ff';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('AUGUST 2026', 55, 423);

  // Destination
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('📍 DESTINATION', 200, 375);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('GALLERY', 200, 400);
  ctx.fillStyle = '#EA4335';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('HALL 1', 200, 418);

  // Boarding Time
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('🕒 BOARDING', 345, 375);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 16px sans-serif';
  ctx.fillText('9 AM', 345, 400);
  ctx.fillStyle = '#5ae0ff';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('ONWARDS', 345, 418);

  // Gate
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('🚪 GATE', 490, 375);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('BLOCK', 490, 400);
  ctx.fillStyle = '#FBBC05';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('5', 490, 418);



  // 7. QR Code rendering
  const verifyUrl = `${baseUrl}/verify?id=${participant.unique_id}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 160,
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

  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 655, 360, 85, 85, 12);
  ctx.fill();
  ctx.drawImage(qrImg, 660, 365, 75, 75);

  // Left Footer
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, 455);
  ctx.lineTo(740, 455);
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('GOOGLE', 55, 475);
  ctx.textAlign = 'center';
  ctx.fillText('CHIPSET COMMUNITY', 390, 475);
  ctx.textAlign = 'right';
  ctx.fillText('GOOGLE', 740, 475);


  // --- RIGHT PANEL: STUB TICKET ---
  // Blue banner
  ctx.fillStyle = '#0f4c9c';
  roundRect(ctx, 810, 40, 240, 40, 10);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BOARDING PASS', 930, 65);

  ctx.textAlign = 'left';
  
  // Passenger
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 8px sans-serif';
  ctx.fillText('PASSENGER', 815, 110);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(participant.name.toUpperCase(), 815, 130);

  // Flight & Date
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 8px sans-serif';
  ctx.fillText('FLIGHT', 815, 165);
  ctx.fillStyle = '#FBBF24';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('CLOUD9 ☁️', 815, 185);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 8px sans-serif';
  ctx.fillText('DATE', 940, 165);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('29 AUG 2026', 940, 185);

  // Destination
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 8px sans-serif';
  ctx.fillText('DESTINATION', 815, 220);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('GALLERY HALL 1', 815, 240);

  // Boarding Time & Gate
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 8px sans-serif';
  ctx.fillText('BOARDING TIME', 815, 275);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('9 AM ONWARDS', 815, 295);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 8px sans-serif';
  ctx.fillText('GATE', 940, 275);
  ctx.fillStyle = '#FBBF24';
  ctx.font = 'bold 8px sans-serif';
  wrapText(ctx, 'Block V 1st floor near Central Library', 940, 295, 110, 10);

  // Stub Divider
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(810, 360);
  ctx.lineTo(1050, 360);
  ctx.stroke();

  // Stub Footer Info
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 7px sans-serif';
  ctx.fillText('CHIPSET PASS', 815, 385);
  ctx.fillStyle = '#5ae0ff';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(participant.unique_id, 815, 410);

  // Draw Barcode Box
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 930, 375, 120, 50, 6);
  ctx.fill();

  // Draw Barcode Stripes
  ctx.fillStyle = '#000000';
  let barX = 940;
  const barPattern = [1, 2, 1, 3, 1, 2, 3, 1, 2, 1, 2, 1, 3];
  barPattern.forEach((w) => {
    ctx.fillRect(barX, 383, w * 2, 34);
    barX += (w * 2) + 3;
  });

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
