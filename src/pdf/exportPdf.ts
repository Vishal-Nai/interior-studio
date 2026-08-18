import { jsPDF } from 'jspdf';
import type { Project, Room } from '../types';
import { renderOverviewSnapshot, renderRoomSnapshot } from '../three/snapshot';
import { renderPlanSchematic } from '../utils/planRender';
import { formatFeet, formatSize } from '../utils/units';
import { ROOM_TYPE_LABELS } from '../data/presets';

const PAGE_W = 297;
const PAGE_H = 210;

const INK = '#232323';
const MUTED = '#8a8578';
const GOLD = '#b99358';
const CREAM = '#f6f3ec';
const CHARCOAL = '#1e1c19';

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function fill(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setFillColor(r, g, b);
}

function text(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setTextColor(r, g, b);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Draw an image fitted (contain) inside a box, centered. */
async function drawFitted(
  doc: jsPDF,
  src: string,
  x: number,
  y: number,
  w: number,
  h: number,
  format: 'JPEG' | 'PNG',
) {
  const img = await loadImage(src);
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  doc.addImage(src, format, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function brandFooter(doc: jsPDF, pageLabel: string) {
  fill(doc, GOLD);
  doc.rect(14, PAGE_H - 13.5, 5, 0.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  text(doc, INK);
  doc.text('ACME INTERIOR', 22, PAGE_H - 12);
  doc.setFont('helvetica', 'normal');
  text(doc, MUTED);
  doc.text(pageLabel, PAGE_W - 14, PAGE_H - 12, { align: 'right' });
}

function pageHeader(doc: jsPDF, title: string, subtitle: string) {
  fill(doc, CREAM);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  text(doc, INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text(title, 14, 20);
  fill(doc, GOLD);
  doc.rect(14, 24, 26, 1.1, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  text(doc, MUTED);
  doc.text(subtitle, PAGE_W - 14, 20, { align: 'right' });
}

function coverPage(doc: jsPDF, project: Project) {
  fill(doc, CHARCOAL);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // subtle side panel
  fill(doc, '#26231f');
  doc.rect(PAGE_W - 92, 0, 92, PAGE_H, 'F');
  fill(doc, GOLD);
  doc.rect(PAGE_W - 93.2, 0, 1.2, PAGE_H, 'F');

  // monogram
  fill(doc, GOLD);
  doc.rect(14, 26, 14, 14, 'F');
  text(doc, CHARCOAL);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('A', 21, 35.5, { align: 'center' });

  text(doc, '#f1ede4');
  doc.setFontSize(30);
  doc.text('ACME INTERIOR', 14, 62);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  text(doc, GOLD);
  doc.text('INTERIOR DESIGN STUDIO', 14, 70.5, { charSpace: 1.2 });

  fill(doc, '#4a453d');
  doc.rect(14, 92, 170, 0.4, 'F');

  text(doc, '#b7b1a4');
  doc.setFontSize(10);
  doc.text('DESIGN PRESENTATION FOR', 14, 106, { charSpace: 0.8 });
  text(doc, '#f1ede4');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text(doc.splitTextToSize(project.name, 165) as string[], 14, 118);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  text(doc, '#cfc9bc');
  let y = 140;
  if (project.client) {
    doc.text(`Client:  ${project.client}`, 14, y);
    y += 8;
  }
  doc.text(
    `Date:  ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    14,
    y,
  );
  const approved = project.rooms.filter((r) => r.approved).length;
  doc.text(`Rooms:  ${project.rooms.length}   |   Approved:  ${approved}/${project.rooms.length}`, 14, y + 8);

  text(doc, GOLD);
  doc.setFontSize(9);
  doc.text('3D VISUALISATION  |  SPACE PLANNING  |  TURNKEY EXECUTION', 14, PAGE_H - 16, { charSpace: 0.6 });
}

function roomSpecs(doc: jsPDF, room: Room, x: number, yStart: number, w: number) {
  let y = yStart;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  text(doc, INK);
  doc.text('FINISHES', x, y);
  y += 6;

  const swatch = (label: string, hex: string, extra: string) => {
    fill(doc, hex);
    doc.setDrawColor(190, 185, 172);
    doc.rect(x, y - 3.6, 5, 5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    text(doc, INK);
    doc.text(`${label}: ${hex.toUpperCase()}${extra}`, x + 8, y);
    y += 7.5;
  };
  swatch('Walls', room.wallColor, '');
  swatch('Floor', room.floorColor, `  (${room.floorStyle})`);

  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`FURNITURE & FIXTURES (${room.items.length})`, x, y);
  y += 6;

  doc.setFontSize(8.5);
  const maxRows = 16;
  const items = room.items.slice(0, maxRows);
  for (const item of items) {
    fill(doc, item.color);
    doc.setDrawColor(190, 185, 172);
    doc.rect(x, y - 3.2, 4.2, 4.2, 'FD');
    doc.setFont('helvetica', 'bold');
    text(doc, INK);
    doc.text(item.label, x + 7, y, { maxWidth: w * 0.55 });
    doc.setFont('helvetica', 'normal');
    text(doc, MUTED);
    doc.text(`${formatFeet(item.w)} x ${formatFeet(item.d)} x ${formatFeet(item.h)} H`, x + w, y, {
      align: 'right',
    });
    y += 6.2;
  }
  if (room.items.length > maxRows) {
    text(doc, MUTED);
    doc.text(`+ ${room.items.length - maxRows} more items`, x, y);
  }
}

export async function exportProjectPdf(project: Project): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // 1. Cover
  coverPage(doc, project);

  // 2. Floor plan
  const planSrc = project.planImage ?? renderPlanSchematic(project);
  if (planSrc) {
    doc.addPage();
    pageHeader(doc, '2D Floor Plan', project.name);
    await drawFitted(doc, planSrc, 14, 32, PAGE_W - 28, PAGE_H - 54, planSrc.startsWith('data:image/png') ? 'PNG' : 'JPEG');
    brandFooter(doc, 'Floor Plan');
  }

  // 3. 3D overview
  if (project.rooms.length > 0) {
    const overview = renderOverviewSnapshot(project);
    doc.addPage();
    pageHeader(doc, '3D Overview - Full Apartment', project.name);
    await drawFitted(doc, overview, 14, 32, PAGE_W - 28, PAGE_H - 54, 'JPEG');
    brandFooter(doc, '3D Overview');
  }

  // 4. Room pages
  for (const room of project.rooms) {
    const snap = renderRoomSnapshot(room);
    doc.addPage();
    pageHeader(doc, room.name, ROOM_TYPE_LABELS[room.type]);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    text(doc, MUTED);
    doc.text(
      `${formatSize(room.width, room.depth)}   |   ${Math.round(room.width * room.depth)} sq.ft   |   Wall height ${formatFeet(room.wallHeight)}`,
      14,
      31,
    );

    if (room.approved) {
      fill(doc, '#3e7a4e');
      doc.roundedRect(PAGE_W - 45, 25, 31, 8, 1.5, 1.5, 'F');
      text(doc, '#ffffff');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('APPROVED', PAGE_W - 29.5, 30.2, { align: 'center' });
    } else {
      doc.setDrawColor(160, 150, 130);
      doc.roundedRect(PAGE_W - 45, 25, 31, 8, 1.5, 1.5, 'D');
      text(doc, MUTED);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('DRAFT', PAGE_W - 29.5, 30.2, { align: 'center' });
    }

    // image panel + white card
    fill(doc, '#ffffff');
    doc.roundedRect(14, 37, 182, PAGE_H - 60, 2, 2, 'F');
    await drawFitted(doc, snap, 17, 40, 176, PAGE_H - 66, 'JPEG');

    roomSpecs(doc, room, 204, 44, PAGE_W - 204 - 14);
    brandFooter(doc, room.name);
  }

  // 5. Closing page
  doc.addPage();
  fill(doc, CHARCOAL);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  text(doc, '#f1ede4');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('Thank you.', PAGE_W / 2, 92, { align: 'center' });
  text(doc, GOLD);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('ACME INTERIOR', PAGE_W / 2, 104, { align: 'center', charSpace: 1.5 });
  text(doc, '#b7b1a4');
  doc.setFontSize(9);
  doc.text('We look forward to bringing this design to life.', PAGE_W / 2, 113, { align: 'center' });

  const safeName = project.name.replace(/[^\w\d-]+/g, '_');
  doc.save(`ACME_Interior_${safeName}.pdf`);
}
