import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export async function generateDeliveryAdvicePDF(dispatchId: string) {
  // First generate the DA number via the DB function
  const { data: daNumber, error: daError } = await supabase.rpc('generate_delivery_advice_number', { p_dispatch_id: dispatchId });
  if (daError) throw new Error(daError.message);

  // Fetch full dispatch data
  const { data: dispatch, error: dispError } = await supabase
    .from('dispatches')
    .select('*')
    .eq('id', dispatchId)
    .single();
  if (dispError || !dispatch) throw new Error('Dispatch not found');

  // Fetch items
  const { data: items } = await supabase
    .from('dispatch_items')
    .select('*')
    .eq('dispatch_id', dispatchId)
    .order('created_at');

  // Fetch supplier business
  let supplierBiz: any = null;
  if (dispatch.supplier_business_id) {
    const { data } = await supabase.from('businesses').select('*').eq('id', dispatch.supplier_business_id).single();
    supplierBiz = data;
  }

  // Fetch receiver business
  let receiverBiz: any = null;
  if (dispatch.receiver_business_id) {
    const { data } = await supabase.from('businesses').select('*').eq('id', dispatch.receiver_business_id).single();
    receiverBiz = data;
  }

  // Generate QR code as data URL
  const appUrl = window.location.origin;
  const qrUrl = `${appUrl}/dispatch/scan/${dispatch.qr_code_token}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 256, margin: 1, color: { dark: '#22573c', light: '#f0f8f3' } });

  const da = dispatch.delivery_advice_number || daNumber;

  // Create PDF
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  const green = [34, 87, 60] as [number, number, number]; // primary green
  const lightGreen = [240, 248, 243] as [number, number, number];
  const darkText = [30, 45, 35] as [number, number, number];
  const mutedText = [100, 115, 105] as [number, number, number];

  // Helper to add text
  const addText = (text: string, x: number, ty: number, opts?: { size?: number; bold?: boolean; color?: number[]; font?: string }) => {
    doc.setFontSize(opts?.size || 10);
    doc.setFont(opts?.font || 'helvetica', opts?.bold ? 'bold' : 'normal');
    doc.setTextColor(...((opts?.color || darkText) as [number, number, number]));
    doc.text(text, x, ty);
  };

  // ── HEADER ──
  addText('FreshDock', margin, y + 6, { size: 22, bold: true, color: green });
  addText('DELIVERY ADVICE', margin, y + 14, { size: 12, bold: true, color: green });
  addText(da, margin, y + 22, { size: 14, bold: true });

  // QR code — larger, with border box for easy scanning
  const qrSize = 38;
  const qrX = pageW - margin - qrSize;
  doc.setFillColor(...lightGreen);
  doc.setDrawColor(...green);
  doc.setLineWidth(0.3);
  doc.roundedRect(qrX - 3, y - 2, qrSize + 6, qrSize + 10, 2, 2, 'FD');
  doc.addImage(qrDataUrl, 'PNG', qrX, y, qrSize, qrSize);
  addText('SCAN FOR LIVE STATUS', qrX - 2, y + qrSize + 5, { size: 6, bold: true, color: green });

  y += 42;

  // Separator
  doc.setDrawColor(...green);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── PARTIES ──
  const colW = contentW / 3;

  addText('FROM (GROWER)', margin, y, { size: 8, bold: true, color: green });
  y += 5;
  addText(dispatch.grower_name, margin, y, { size: 10, bold: true });
  y += 5;
  if (dispatch.grower_code) { addText(`Code: ${dispatch.grower_code}`, margin, y, { size: 8, color: mutedText }); y += 4; }
  if (supplierBiz?.address) { addText(supplierBiz.address, margin, y, { size: 8, color: mutedText }); y += 4; }
  if (supplierBiz?.phone) { addText(supplierBiz.phone, margin, y, { size: 8, color: mutedText }); y += 4; }
  if (supplierBiz?.email) { addText(supplierBiz.email, margin, y, { size: 8, color: mutedText }); y += 4; }

  // Reset y for second column
  let partyY = y;
  y -= (supplierBiz ? 17 : 9);

  addText('TO (RECEIVER)', margin + colW, y - 5, { size: 8, bold: true, color: green });
  addText(receiverBiz?.name || 'Not specified', margin + colW, y, { size: 10, bold: true });
  if (receiverBiz?.city) { addText(receiverBiz.city, margin + colW, y + 5, { size: 8, color: mutedText }); }
  if (receiverBiz?.phone) { addText(receiverBiz.phone, margin + colW, y + 9, { size: 8, color: mutedText }); }

  addText('TRANSPORT', margin + colW * 2, y - 5, { size: 8, bold: true, color: green });
  addText(dispatch.carrier || 'Not specified', margin + colW * 2, y, { size: 10, bold: true });
  if (dispatch.truck_number) { addText(`Rego: ${dispatch.truck_number}`, margin + colW * 2, y + 5, { size: 8, color: mutedText }); }
  const conNoteText = dispatch.transporter_con_note_number || 'To be completed by carrier';
  addText(`Con Note #: ${conNoteText}`, margin + colW * 2, y + 9, { size: 8, color: mutedText });

  y = Math.max(partyY, y + 18);

  // Separator
  doc.setDrawColor(200, 210, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── DELIVERY DETAILS ──
  addText('DELIVERY DETAILS', margin, y, { size: 8, bold: true, color: green });
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

  // Carrier Con Note box on the right
  const boxX = margin + contentW / 2 + 5;
  const boxY = y - 45;
  const boxW = contentW / 2 - 5;
  const boxH = 35;
  doc.setFillColor(...lightGreen);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, 'F');
  doc.setDrawColor(200, 220, 200);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, 'S');
  addText("CARRIER'S CON NOTE", boxX + 3, boxY + 6, { size: 8, bold: true, color: green });
  addText(`Con Note #: ${conNoteText}`, boxX + 3, boxY + 14, { size: 9 });
  addText('Carrier to complete. Photo can be', boxX + 3, boxY + 24, { size: 7, color: mutedText });
  addText('attached in FreshDock app.', boxX + 3, boxY + 28, { size: 7, color: mutedText });

  y += 8;

  // ── LINE ITEMS TABLE ──
  doc.setDrawColor(200, 210, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  addText('LINE ITEMS', margin, y, { size: 8, bold: true, color: green });
  y += 6;

  // Table header
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

  doc.setFillColor(...green);
  doc.rect(margin, y - 1, contentW, 6, 'F');

  let cx = margin;
  cols.forEach(col => {
    const tx = col.align === 'right' ? cx + col.w - 1 : cx + 1;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(col.label, tx, y + 3, { align: col.align === 'right' ? 'right' : 'left' });
    cx += col.w;
  });
  y += 7;

  // Table rows
  (items || []).forEach((item: any, idx: number) => {
    if (y > 260) {
      doc.addPage();
      y = margin;
    }
    const isAlt = idx % 2 === 1;
    if (isAlt) {
      doc.setFillColor(...lightGreen);
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

  // Totals row
  doc.setFillColor(220, 230, 225);
  doc.rect(margin, y - 3, contentW, 7, 'F');
  const totalCtns = (items || []).reduce((s: number, i: any) => s + i.quantity, 0);
  const totalWt = (items || []).reduce((s: number, i: any) => s + (i.unit_weight ? i.quantity * i.unit_weight : (i.weight || 0)), 0);
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

  doc.setDrawColor(200, 210, 200);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  addText('DECLARATION', margin, y, { size: 8, bold: true, color: green });
  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...mutedText);
  const declText = "This produce is dispatched in good order and condition as described above. The carrier's con note is the freight contract for this consignment.";
  const declLines = doc.splitTextToSize(declText, contentW);
  doc.text(declLines, margin, y);
  y += declLines.length * 4 + 6;

  // Signature table
  const sigColW = contentW / 3;
  ['GROWER SIGN-OFF', 'CARRIER RECEIPT', 'RECEIVER RECEIPT'].forEach((title, i) => {
    const sx = margin + i * sigColW;
    addText(title, sx, y, { size: 7, bold: true, color: green });
    addText('Signed: _____________', sx, y + 6, { size: 7, color: mutedText });
    addText('Name:   _____________', sx, y + 11, { size: 7, color: mutedText });
    addText('Date:   _____________', sx, y + 16, { size: 7, color: mutedText });
  });
  y += 24;

  // ── FOOTER ──
  doc.setDrawColor(...green);
  doc.setLineWidth(0.3);
  doc.line(margin, 282, pageW - margin, 282);
  addText(`Generated by FreshDock · ${format(new Date(), 'dd/MM/yyyy h:mma')} · Scan QR for live status`, margin, 287, { size: 7, color: mutedText });
  addText(da, pageW - margin, 287, { size: 7, color: mutedText });

  // Save
  doc.save(`${da}.pdf`);
}
