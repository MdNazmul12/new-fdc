'use client';

import jsPDF from 'jspdf';
import { Member, Collection } from '../types';

export interface PDFColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  widthRatio?: number;
}

export interface PDFReportMeta {
  category?: string;
  period?: string;
  totalRecords?: number;
  totalAmountText?: string;
}

/**
 * Builds a professional vector PDF table using jsPDF directly.
 * Does NOT use html2canvas, eliminating all modern CSS "lab()" or "oklch()" parse errors.
 */
export function exportTableToPDF(
  data: Record<string, any>[],
  columns: PDFColumn[],
  title: string,
  filename: string,
  meta?: PDFReportMeta
): void {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const rowHeight = 18;
  const headerHeight = 22;

  // Calculate proportional column widths
  const totalRatio = columns.reduce((acc, c) => acc + (c.widthRatio || 1), 0);
  const colWidths = columns.map(c => ((c.widthRatio || 1) / totalRatio) * contentWidth);

  // ── Header Band ───────────────────────────────────────────────────────────
  pdf.setFillColor(79, 70, 229); // indigo-600
  pdf.rect(0, 0, pageWidth, 52, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('Friends Development Committee (FDC)', margin, 24);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Official Report: ${title}`, margin, 42);

  const generatedAt = new Date().toLocaleString('en-BD');
  pdf.setFontSize(8);
  pdf.text(`Printed: ${generatedAt}`, pageWidth - margin, 42, { align: 'right' });

  // ── Meta Info Box ─────────────────────────────────────────────────────────
  let y = 62;
  if (meta) {
    pdf.setFillColor(243, 244, 246);
    pdf.roundedRect(margin, y, contentWidth, 24, 4, 4, 'F');
    pdf.setTextColor(55, 65, 81);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);

    let metaParts: string[] = [];
    if (meta.category && meta.category !== 'all') metaParts.push(`Category: ${meta.category}`);
    if (meta.period) metaParts.push(`Period: ${meta.period}`);
    metaParts.push(`Records: ${meta.totalRecords ?? data.length}`);
    if (meta.totalAmountText) metaParts.push(`Total Value: ${meta.totalAmountText}`);

    pdf.text(metaParts.join('   |   '), margin + 10, y + 15);
    y += 32;
  }

  // Helper function to draw Table Column Headers
  const drawTableHeaders = (currY: number) => {
    pdf.setFillColor(224, 231, 255); // indigo-100
    pdf.rect(margin, currY, contentWidth, headerHeight, 'F');

    pdf.setTextColor(30, 41, 59); // slate-800
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);

    let curX = margin;
    columns.forEach((col, i) => {
      const w = colWidths[i];
      let textX = curX + 6;
      let alignOpt: any = 'left';

      if (col.align === 'center') {
        textX = curX + w / 2;
        alignOpt = 'center';
      } else if (col.align === 'right') {
        textX = curX + w - 6;
        alignOpt = 'right';
      }

      pdf.text(col.label, textX, currY + 14, { align: alignOpt });
      curX += w;
    });
  };

  drawTableHeaders(y);
  y += headerHeight;

  // ── Render Data Rows ───────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);

  let pageNum = 1;

  data.forEach((row, rowIdx) => {
    // Check if new page is needed
    if (y + rowHeight > pageHeight - margin - 40) {
      // Draw footer on current page
      drawPageFooter(pdf, pageNum, pageWidth, pageHeight, margin);
      pdf.addPage();
      pageNum++;
      y = margin;
      drawTableHeaders(y);
      y += headerHeight;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
    }

    // Zebra striping
    if (rowIdx % 2 === 0) {
      pdf.setFillColor(248, 250, 252); // slate-50
      pdf.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    pdf.setTextColor(15, 23, 42); // slate-900
    let curX = margin;

    columns.forEach((col, i) => {
      const w = colWidths[i];
      let val = row[col.key];
      let textVal = val !== undefined && val !== null ? String(val) : '-';

      // Trim very long texts
      if (textVal.length > 45) {
        textVal = textVal.substring(0, 42) + '...';
      }

      let textX = curX + 6;
      let alignOpt: any = 'left';

      if (col.align === 'center') {
        textX = curX + w / 2;
        alignOpt = 'center';
      } else if (col.align === 'right') {
        textX = curX + w - 6;
        alignOpt = 'right';
      }

      pdf.text(textVal, textX, y + 12, { align: alignOpt });
      curX += w;
    });

    // Subtle bottom row border
    pdf.setDrawColor(241, 245, 249);
    pdf.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

    y += rowHeight;
  });

  // ── Total Summary Row (if available) ──────────────────────────────────────
  if (meta && meta.totalAmountText) {
    if (y + rowHeight + 10 > pageHeight - margin - 40) {
      drawPageFooter(pdf, pageNum, pageWidth, pageHeight, margin);
      pdf.addPage();
      pageNum++;
      y = margin;
    }

    pdf.setFillColor(241, 245, 249); // slate-100
    pdf.rect(margin, y, contentWidth, rowHeight + 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text('TOTAL:', margin + 10, y + 13);
    pdf.setTextColor(16, 185, 129); // emerald-500
    pdf.text(meta.totalAmountText, pageWidth - margin - 10, y + 13, { align: 'right' });
    y += rowHeight + 12;
  }

  // ── Official Signatures Block ─────────────────────────────────────────────
  if (y + 50 > pageHeight - margin - 20) {
    drawPageFooter(pdf, pageNum, pageWidth, pageHeight, margin);
    pdf.addPage();
    pageNum++;
    y = margin + 20;
  } else {
    y += 24;
  }

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);

  const colSigWidth = contentWidth / 3;
  // Sig 1
  pdf.setDrawColor(148, 163, 184);
  pdf.line(margin + 20, y + 15, margin + 20 + 130, y + 15);
  pdf.text('Prepared By (Accountant)', margin + 20 + 65, y + 27, { align: 'center' });

  // Sig 2
  pdf.line(margin + colSigWidth + 20, y + 15, margin + colSigWidth + 20 + 130, y + 15);
  pdf.text('Audited By (Audit Committee)', margin + colSigWidth + 20 + 65, y + 27, { align: 'center' });

  // Sig 3
  pdf.line(margin + colSigWidth * 2 + 20, y + 15, margin + colSigWidth * 2 + 20 + 130, y + 15);
  pdf.text('Authorized Signature (President / GS)', margin + colSigWidth * 2 + 20 + 65, y + 27, { align: 'center' });

  // Footer for last page
  drawPageFooter(pdf, pageNum, pageWidth, pageHeight, margin);

  // Clean filename
  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(cleanFilename);
}

function drawPageFooter(pdf: jsPDF, pageNum: number, pageWidth: number, pageHeight: number, margin: number) {
  pdf.setFontSize(7.5);
  pdf.setTextColor(148, 163, 184);
  pdf.text('© Friends Development Committee (FDC) — Confidential & Official Record', margin, pageHeight - 16);
  pdf.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 16, { align: 'right' });
}

/**
 * Creates a professional member statement PDF with FDC header,
 * member info, payment history table and totals summary.
 */
export function exportMemberStatement(
  member: Member,
  collections: Collection[],
  filename: string
): void {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 45;

  // Header band
  pdf.setFillColor(79, 70, 229);
  pdf.rect(0, 0, pageWidth, 60, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('Friends Development Committee', margin, 28);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Member Financial Statement', margin, 46);

  const generatedAt = new Date().toLocaleString('en-BD');
  pdf.setFontSize(8);
  pdf.text(`Date: ${generatedAt}`, pageWidth - margin, 46, { align: 'right' });

  // Member info card
  let y = 80;
  pdf.setFillColor(243, 244, 246);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 70, 4, 4, 'F');

  pdf.setTextColor(55, 65, 81);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text(member.name, margin + 14, y + 22);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Member ID: ${member.id}`, margin + 14, y + 38);
  pdf.text(`Phone: ${member.phone}`, margin + 14, y + 52);
  pdf.text(`Status: ${(member.status || 'Active').toUpperCase()}`, pageWidth / 2, y + 38);
  pdf.text(`Monthly Fee: ${member.monthlyFee?.toLocaleString('en-BD') ?? '-'} TK`, pageWidth / 2, y + 52);

  // Table header
  y = 168;
  const colWidths = [30, 80, 80, 75, 75, 65, 80];
  const headers = ['SL', 'Receipt No', 'Month', 'Date Paid', 'Amount', 'Fine', 'Total'];

  pdf.setFillColor(224, 231, 255);
  pdf.rect(margin, y, pageWidth - margin * 2, 22, 'F');

  pdf.setTextColor(30, 41, 59);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  let curX = margin;
  headers.forEach((h, i) => {
    pdf.text(h, curX + 4, y + 15);
    curX += colWidths[i];
  });

  // Table rows
  y += 22;
  const rowH = 18;
  let totalPaid = 0;
  let totalFine = 0;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);

  collections.forEach((c, idx) => {
    if (y + rowH > pageHeight - margin - 30) {
      pdf.addPage();
      y = margin;
    }

    if (idx % 2 === 0) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, y, pageWidth - margin * 2, rowH, 'F');
    }

    pdf.setTextColor(31, 41, 55);
    const rowTotal = (c.amount || 0) + (c.lateFine || 0);
    totalPaid += c.amount || 0;
    totalFine += c.lateFine || 0;

    const cells = [
      String(idx + 1),
      c.receiptNo || '-',
      c.month || '-',
      c.date || '-',
      `${(c.amount || 0).toLocaleString()} TK`,
      c.lateFine ? `${c.lateFine.toLocaleString()} TK` : '-',
      `${rowTotal.toLocaleString()} TK`,
    ];

    curX = margin;
    cells.forEach((cell, i) => {
      pdf.text(cell, curX + 4, y + 13);
      curX += colWidths[i];
    });

    pdf.setDrawColor(229, 231, 235);
    pdf.line(margin, y + rowH, pageWidth - margin, y + rowH);
    y += rowH;
  });

  // Totals row
  y += 6;
  pdf.setFillColor(238, 242, 255);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 24, 3, 3, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(30, 41, 59);
  pdf.text('Total Collections Paid:', margin + 10, y + 16);
  pdf.setTextColor(79, 70, 229);
  pdf.text(`${(totalPaid + totalFine).toLocaleString('en-BD')} TK`, pageWidth - margin - 10, y + 16, { align: 'right' });

  // Footer
  pdf.setFontSize(7.5);
  pdf.setTextColor(156, 163, 175);
  pdf.text('Friends Development Committee — Computer Generated Official Statement', margin, pageHeight - 15);

  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(cleanFilename);
}

/**
 * Fallback DOM capture export (safe wrapper)
 */
export async function exportElementToPDF(elementId: string, filename: string): Promise<void> {
  console.warn('exportElementToPDF is deprecated; please prefer exportTableToPDF to avoid lab/oklch issues.');
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(element as HTMLElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${filename}.pdf`);
  } catch (err: any) {
    console.error('exportElementToPDF error:', err);
    alert('Please use the Table PDF Export feature for this report.');
  }
}
