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

  // 1. Draw Template Background Image
  const bgImg = new Image();
  bgImg.src = '/assets/ticket_bg.png';
  await new Promise<void>((resolve, reject) => {
    bgImg.onload = () => resolve();
    bgImg.onerror = reject;
  });
  ctx.drawImage(bgImg, 0, 0, width, height);

  // 2. Cover the original right stub of the template image
  ctx.fillStyle = '#08080C';
  ctx.fillRect(780, 0, 320, 500);

  // 3. Draw Blue Banner
  ctx.fillStyle = '#0f4c9c';
  roundRect(ctx, 810, 40, 240, 40, 8);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BOARDING PASS', 915, 65);
  ctx.fillText('✈️', 1030, 65);

  ctx.textAlign = 'left';

  // 4. Draw Details list (No icons)
  // Passenger
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('PASSENGER', 815, 115);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 20px sans-serif';
  ctx.fillText(participant.name.toUpperCase(), 815, 142);

  // Flight & Date
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('FLIGHT', 815, 185);
  ctx.fillStyle = '#F59E0B';
  ctx.font = '900 15px sans-serif';
  ctx.fillText('CLOUD9 ☁️', 815, 207);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('DATE', 940, 185);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 15px sans-serif';
  ctx.fillText('29 AUG 2026', 940, 207);

  // Destination
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('DESTINATION', 815, 250);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 15px sans-serif';
  ctx.fillText('GALLERY HALL 1', 815, 272);

  // Boarding & Gate
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('BOARDING TIME', 815, 315);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 14px sans-serif';
  ctx.fillText('9 AM', 815, 335);
  ctx.fillText('ONWARDS', 815, 353);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('GATE', 940, 315);
  ctx.fillStyle = '#FBBF24';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('BLOCK 5, 1ST FLR', 940, 335);
  ctx.fillText('NEAR CENTRAL LIB', 940, 348);

  // 5. Draw Dotted Separator Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(810, 385);
  ctx.lineTo(1050, 385);
  ctx.stroke();

  // 6. Draw Footer Row: Chipset Pass ID & Barcode
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('CHIPSET PASS', 815, 415);
  ctx.fillStyle = '#5ae0ff';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(`C9-${participant.unique_id}`, 815, 435);

  // Horizontal Barcode
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 955, 405, 95, 36, 4);
  ctx.fill();

  ctx.fillStyle = '#000000';
  let barX = 960;
  const hBarcodePattern = [1, 2, 3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 2, 3, 1];
  hBarcodePattern.forEach((w) => {
    ctx.fillRect(barX, 409, w * 1.5, 28);
    barX += (w * 1.5) + 2;
  });

  // 3. Overlay Dynamic QR Code on Main Card
  const verifyUrl = `${baseUrl}/verify?id=${participant.unique_id}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 256,
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

  // White background block with rounded corners matching the UI SVG
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 648, 358, 92, 92, 6);
  ctx.fill();

  ctx.drawImage(qrImg, 651, 361, 86, 86);

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
