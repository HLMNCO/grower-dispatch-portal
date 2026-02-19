import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export async function generateDeliveryAdvicePDF(dispatchId: string) {
  const { data: daNumber, error: daError } = await supabase.rpc('generate_delivery_advice_number', { p_dispatch_id: dispatchId });
  if (daError) throw new Error(daError.message);

  const { data: dispatch, error: dispError } = await supabase
    .from('dispatches')
    .select('*')
    .eq('id', dispatchId)
    .single();
  if (dispError || !dispatch) throw new Error('Dispatch not found');

  const { data: items } = await supabase
    .from('dispatch_items')
    .select('*')
    .eq('dispatch_id', dispatchId)
    .order('created_at');

  let supplierBiz: any = null;
  if (dispatch.supplier_business_id) {
    const { data } = await supabase.from('businesses').select('*').eq('id', dispatch.supplier_business_id).single();
    supplierBiz = data;
  }

  let receiverBiz: any = null;
  if (dispatch.receiver_business_id) {
    const { data } = await supabase.from('businesses').select('*').eq('id', dispatch.receiver_business_id).single();
    receiverBiz = data;
  }

  // QR code — leaf green on pale green background
  const appUrl = window.location.origin;
  const qrUrl = `${appUrl}/dispatch/scan/${dispatch.qr_code_token}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: 256,
    margin: 1,
    color: { dark: '#2a6b3a', light: '#f0faf3' },
  });

  const da = dispatch.delivery_advice_number || daNumber;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Pack to Produce brand colours
  const leafGreen   = [42, 107, 58]   as [number, number, number]; // #2a6b3a deep green
  const leafMid     = [58, 140, 78]   as [number, number, number]; // #3a8c4e mid green
  const paleGreen   = [232, 245, 236] as [number, number, number]; // light bg
  const sunGold     = [224, 168, 32]  as [number, number, number]; // #e0a820
  const darkText    = [26, 46, 29]    as [number, number, number]; // #1a2e1d
  const mutedText   = [107, 128, 112] as [number, number, number]; // #6b8070
  const white       = [255, 255, 255] as [number, number, number];

  const addText = (text: string, x: number, ty: number, opts?: {
    size?: number; bold?: boolean; italic?: boolean; color?: number[];
  }) => {
    doc.setFontSize(opts?.size || 10);
    doc.setFont('helvetica', opts?.bold ? 'bold' : opts?.italic ? 'italic' : 'normal');
    doc.setTextColor(...((opts?.color || darkText) as [number, number, number]));
    doc.text(text, x, ty);
  };

  // ── HEADER ──
  // Green header band
  doc.setFillColor(...leafGreen);
  doc.rect(0, 0, pageW, 38, 'F');

  // Wordmark: "Pack to Produce"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...white);
  doc.text('Pack', margin, y + 8);

  // measure "Pack" width to position "to"
  const packW = doc.getTextWidth('Pack');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(245, 200, 66); // sun yellow
  doc.text('to', margin + packW + 2, y + 8);

  const toW = doc.getTextWidth('to') + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(245, 200, 66);
  doc.text('Produce', margin + packW + toW + 1, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('DELIVERY ADVICE', margin, y + 16);

  // DA number — white pill top-right
  addText(da, pageW - margin, y + 10, { size: 13, bold: true, color: white });
  doc.setFontSize(7);
  doc.setTextColor(200, 230, 210);
  doc.text('Delivery Advice No.', pageW - margin, y + 4, { align: 'right' });

  // QR code box — sits partially overlapping header
  const qrSize = 36;
  const qrX = pageW - margin - qrSize;
  const qrY = 6;
  doc.setFillColor(...white);
  doc.roundedRect(qrX - 3, qrY - 1, qrSize + 6, qrSize + 8, 2, 2, 'F');
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY + 1, qrSize, qrSize);
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...leafMid);
  doc.text('SCAN FOR LIVE STATUS', qrX + qrSize / 2, qrY + qrSize + 5, { align: 'center' });

  y = 46;

  // ── PARTIES ──
  const colW = contentW / 3;

  addText('FROM (GROWER)', margin, y, { size: 8, bold: true, color: leafGreen });
  y += 5;
  addText(dispatch.grower_name, margin, y, { size: 10, bold: true });
  y += 5;
  if (dispatch.grower_code) { addText(`Code: ${dispatch.grower_code}`, margin, y, { size: 8, color: mutedText }); y += 4; }
  if (supplierBiz?.phone) { addText(supplierBiz.phone, margin, y, { size: 8, color: mutedText }); y += 4; }
  if (supplierBiz?.email) { addText(supplierBiz.email, margin, y, { size: 8, color: mutedText }); y += 4; }

  let partyY = y;
  const partyStartY = 52;

  addText('TO (RECEIVER)', margin + colW, partyStartY, { size: 8, bold: true, color: leafGreen });
  addText(receiverBiz?.name || 'Not specified', margin + colW, partyStartY + 5, { size: 10, bold: true });
  if (receiverBiz?.city) addText(receiverBiz.city, margin + colW, partyStartY + 10, { size: 8, color: mutedText });
  if (receiverBiz?.phone) addText(receiverBiz.phone, margin + colW, partyStartY + 14, { size: 8, color: mutedText });

  addText('TRANSPORT', margin + colW * 2, partyStartY, { size: 8, bold: true, color: leafGreen });
  addText(dispatch.carrier || 'Not specified', margin + colW * 2, partyStartY + 5, { size: 10, bold: true });
  if (dispatch.truck_number) addText(`Rego: ${dispatch.truck_number}`, margin + colW * 2, partyStartY + 10, { size: 8, color: mutedText });
  const conNoteText = dispatch.transporter_con_note_number || 'To be completed by carrier';
  addText(`Con Note: ${conNoteText}`, margin + colW * 2, partyStartY + 14, { size: 8, color: mutedText });

  y = Math.max(partyY, partyStartY + 22);

  // Divider
  doc.setDrawColor(...leafMid);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  // ── DELIVERY DETAILS ──
  addText('DELIVERY DETAILS', margin, y, { size: 8, bold: true, color: leafGreen });
  y += 6;

  const detailPairs = [
    ['Delivery Advice No', da],
    ['Dispatch Date', dispatch.dispatch_date ? format(new Date(dispatch.dispatch_date), 'EEEE d MMMM yyyy') : '-'],
    ['Expected Arrival', dispatch.expected_arrival ? format(new Date(dispatch.expected_arrival), 'EEEE d MMMM yyyy') : '-'],
    ['Arrival Window', dispatch.estimated_arrival_window_start && dispatch.estimated_arrival_window_end
      ? `${dispatch.estimated_arrival_window_start} – ${dispatch.estimated_arrival_window_end}` : '-'],
    ['Temperature Zone', dispatch.temperature_zone ? dispatch.temperature_zone.charAt(0).toUpperCase() + dispatch.temperature_zone.slice(1) : '-'],
    ['Commodity Class', dispatch.commodity_class ? dispatch.commodity_class.replace('_', ' ') : '-'],
    ['Total Pallets', String(dispatch.total_pallets)],
    ['Total Cartons', String((items || []).reduce((s: number, i: any) => s + i.quantity, 0))],
    ['Total Weight', `${(items || []).reduce((s: number, i: any) => s + (i.unit_weight ? i.quantity * i.unit_weight : (i.weight || 0)), 0).toLocaleString()} kg`],
  ];

  detailPairs.forEach(([label, value]) => {
    addText(label + ':', margin, y, { size: 8, color: mutedText });
    addText(value, margin + 45, y, { size: 8, bold: true });
    y += 5;
  });

  // Carrier con note box
  const boxX = margin + contentW / 2 + 5;
  const boxY = y - 45;
  const boxW = contentW / 2 - 5;
  const boxH = 35;
  doc.setFillColor(...paleGreen);
  doc.setDrawColor(190, 220, 200);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, 'FD');
  addText("CARRIER'S CON NOTE", boxX + 3, boxY + 6, { size: 8, bold: true, color: leafGreen });
  addText(`Con Note #: ${conNoteText}`, boxX + 3, boxY + 14, { size: 9 });
  addText('Carrier to complete. Photo can be', boxX + 3, boxY + 24, { size: 7, color: mutedText });
  addText('attached in Pack to Produce app.', boxX + 3, boxY + 28, { size: 7, color: mutedText });

  y += 8;

  // ── LINE ITEMS ──
  doc.setDrawColor(190, 220, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  addText('LINE ITEMS', margin, y, { size: 8, bold: true, color: leafGreen });
  y += 6;

  const cols = [
    { label: '#', w: 8, align: 'left' as const },
    { label: 'Product', w: 30, align: 'left' as const },
    { label: 'Variety', w: 25, align: 'left' as const },
    { label: 'Grade/Size', w: 20, align: 'left' as const },
    { label: 'Pack Type', w: 22, align: 'left' as const },
    { label: 'Qty (Ctns)', w: 18, align: 'right' as const },
    { label: 'Wt/Unit (kg)', w: 22, align: 'right' as const },
    { label: 'Total Wt (kg)', w: 25, align: 'right' as const },
  ];

  // Header row — leaf green
  doc.setFillColor(...leafGreen);
  doc.rect(margin, y - 1, contentW, 6, 'F');

  let cx = margin;
  cols.forEach(col => {
    const tx = col.align === 'right' ? cx + col.w - 1 : cx + 1;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...white);
    doc.text(col.label, tx, y + 3, { align: col.align === 'right' ? 'right' : 'left' });
    cx += col.w;
  });
  y += 7;

  (items || []).forEach((item: any, idx: number) => {
    if (y > 260) { doc.addPage(); y = margin; }
    if (idx % 2 === 1) {
      doc.setFillColor(...paleGreen);
      doc.rect(margin, y - 3, contentW, 6, 'F');
    }

    const totalWt = item.unit_weight ? item.quantity * item.unit_weight : (item.weight || 0);
    const rowData = [
      String(idx + 1),
      item.product || '-',
      item.variety || '-',
      item.size || '-',
      item.tray_type || '-',
      String(item.quantity),
      item.unit_weight ? String(item.unit_weight) : '-',
      totalWt ? totalWt.toLocaleString() : '-',
    ];

    cx = margin;
    rowData.forEach((val, ci) => {
      const col = cols[ci];
      const tx = col.align === 'right' ? cx + col.w - 1 : cx + 1;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...darkText);
      doc.text(val, tx, y, { align: col.align === 'right' ? 'right' : 'left' });
      cx += col.w;
    });
    y += 6;
  });

  // Totals row — slightly darker green
  doc.setFillColor(210, 232, 215);
  doc.rect(margin, y - 3, contentW, 7, 'F');
  const totalCtns = (items || []).reduce((s: number, i: any) => s + i.quantity, 0);
  const totalWt   = (items || []).reduce((s: number, i: any) => s + (i.unit_weight ? i.quantity * i.unit_weight : (i.weight || 0)), 0);
  addText('TOTAL', margin + 1, y + 1, { size: 8, bold: true });
  let totX = margin;
  cols.forEach((col, i) => {
    if (i === 5) {
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...darkText);
      doc.text(String(totalCtns), totX + col.w - 1, y + 1, { align: 'right' });
    }
    if (i === 7) {
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...darkText);
      doc.text(totalWt.toLocaleString(), totX + col.w - 1, y + 1, { align: 'right' });
    }
    totX += col.w;
  });
  y += 12;

  // ── DECLARATION ──
  if (y > 245) { doc.addPage(); y = margin; }

  doc.setDrawColor(190, 220, 200);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  addText('DECLARATION', margin, y, { size: 8, bold: true, color: leafGreen });
  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...mutedText);
  const declText = "This produce is dispatched in good order and condition as described above. The carrier's con note is the freight contract for this consignment.";
  const declLines = doc.splitTextToSize(declText, contentW);
  doc.text(declLines, margin, y);
  y += declLines.length * 4 + 6;

  ['GROWER SIGN-OFF', 'CARRIER RECEIPT', 'RECEIVER RECEIPT'].forEach((title, i) => {
    const sx = margin + i * (contentW / 3);
    addText(title, sx, y, { size: 7, bold: true, color: leafGreen });
    addText('Signed: _____________', sx, y + 6, { size: 7, color: mutedText });
    addText('Name:   _____________', sx, y + 11, { size: 7, color: mutedText });
    addText('Date:   _____________', sx, y + 16, { size: 7, color: mutedText });
  });
  y += 24;

  // ── FOOTER ──
  doc.setFillColor(...leafGreen);
  doc.rect(0, 284, pageW, 13, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...white);
  doc.text(`Generated by Pack to Produce · ${format(new Date(), 'dd/MM/yyyy h:mma')} · Scan QR for live status`, margin, 290);
  doc.setTextColor(245, 200, 66);
  doc.text(da, pageW - margin, 290, { align: 'right' });

  doc.save(`${da}.pdf`);
}
