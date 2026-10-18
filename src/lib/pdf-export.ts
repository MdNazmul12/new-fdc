'use client';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Member, Collection } from '../types';

/**
 * Captures a DOM element by ID and saves it as a PDF file.
 */
export async function exportElementToPDF(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  try {
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
  } catch (err) {
    console.error('exportElementToPDF error:', err);
  }
}

/**
 * Builds a nicely formatted PDF table using jsPDF directly (no HTML capture).
 */
export function exportTableToPDF(
  data: Record<string, any>[],
  columns: { key: string; label: string }[],
  title: string,
  filename: string
): void {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 40;
  const colWidth = (pageWidth - margin * 2) / columns.length;
  const rowHeight = 20;
  const headerHeight = 24;

  // ── FDC header ───────────────────────────────────────────────────────────
  pdf.setFillColor(79, 70, 229); // indigo-600
  pdf.rect(0, 0, pageWidth, 50, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('Friends Development Committee', margin, 22);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Report: ${title}`, margin, 38);

  const generatedAt = new Date().toLocaleString('en-BD');
  pdf.text(`Generated: ${generatedAt}`, pageWidth - margin, 38, { align: 'right' });

  // ── Column headers ────────────────────────────────────────────────────────
  let y = 70;
  pdf.setFillColor(243, 244, 246); // gray-100
  pdf.rect(margin, y, pageWidth - margin * 2, headerHeight, 'F');

  pdf.setTextColor(55, 65, 81); // gray-700
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  columns.forEach((col, i) => {
    pdf.text(col.label, margin + i * colWidth + 6, y + 15);
  });

  // ── Rows ──────────────────────────────────────────────────────────────────
  y += headerHeight;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);

  data.forEach((row, rowIdx) => {
    if (y + rowHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }

    // Zebra striping
    if (rowIdx % 2 === 0) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, y, pageWidth - margin * 2, rowHeight, 'F');
    }

    pdf.setTextColor(31, 41, 55);
    columns.forEach((col, i) => {
      const cellVal = row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '-';
      pdf.text(cellVal, margin + i * colWidth + 6, y + 13);
    });

    // Row border
    pdf.setDrawColor(229, 231, 235);
    pdf.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

    y += rowHeight;
  });

  // ── Footer ────────────────────────────────────────────────────────────────
  pdf.setFontSize(7);
  pdf.setTextColor(156, 163, 175);
  pdf.text('© Friends Development Committee — Confidential', margin, pageHeight - 15);
  pdf.text(`Page 1`, pageWidth - margin, pageHeight - 15, { align: 'right' });

  pdf.save(`${filename}.pdf`);
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

  // ── Header band ───────────────────────────────────────────────────────────
  pdf.setFillColor(79, 70, 229);
  pdf.rect(0, 0, pageWidth, 60, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text('Friends Development Committee', margin, 25);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Member Payment Statement', margin, 42);
  pdf.text(new Date().toLocaleDateString('en-BD'), pageWidth - margin, 42, { align: 'right' });

  // ── Member info block ─────────────────────────────────────────────────────
  let y = 80;
  pdf.setFillColor(238, 242, 255); // indigo-50
  pdf.setDrawColor(199, 210, 254); // indigo-200
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 80, 6, 6, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(55, 48, 163); // indigo-800
  pdf.text(member.name, margin + 12, y + 20);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(55, 65, 81);

  const col1X = margin + 12;
  const col2X = margin + (pageWidth - margin * 2) / 2;

  pdf.text(`Member ID: ${member.id}`, col1X, y + 36);
  pdf.text(`Phone: ${member.phone}`, col1X, y + 50);
  pdf.text(`Email: ${member.email}`, col1X, y + 64);

  const statusColor = member.status === 'active' ? [16, 185, 129] : [239, 68, 68];
  pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Status: ${member.status.toUpperCase()}`, col2X, y + 36);
  pdf.setTextColor(55, 65, 81);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Join Date: ${member.joinDate}`, col2X, y + 50);
  pdf.text(`Monthly Fee: ${member.monthlyFee.toLocaleString()} TK`, col2X, y + 64);

  // ── Payment history table ─────────────────────────────────────────────────
  y += 100;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(55, 48, 163);
  pdf.text('Payment History', margin, y);

  y += 8;

  const columns = [
    { key: 'receiptNo', label: 'Receipt No', w: 80 },
    { key: 'month', label: 'Month', w: 65 },
    { key: 'date', label: 'Date Paid', w: 70 },
    { key: 'paymentType', label: 'Method', w: 60 },
    { key: 'amount', label: 'Amount (TK)', w: 75 },
    { key: 'lateFine', label: 'Fine (TK)', w: 60 },
    { key: 'status', label: 'Status', w: 65 },
  ];

  const rowH = 18;

  // Header row
  pdf.setFillColor(79, 70, 229);
  pdf.rect(margin, y, pageWidth - margin * 2, rowH, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);

  let xOff = margin + 4;
  columns.forEach(col => {
    pdf.text(col.label, xOff, y + 12);
    xOff += col.w;
  });

  y += rowH;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);

  let totalPaid = 0;
  let totalFine = 0;

  const memberCollections = collections.filter(c => c.memberId === member.id);

  memberCollections.forEach((c, idx) => {
    if (y + rowH > pageHeight - 60) {
      pdf.addPage();
      y = margin;
    }

    if (idx % 2 === 0) {
      pdf.setFillColor(238, 242, 255);
      pdf.rect(margin, y, pageWidth - margin * 2, rowH, 'F');
    }

    const statusTxtColor: [number, number, number] =
      c.status === 'paid' ? [16, 185, 129] : c.status === 'due' ? [239, 68, 68] : [245, 158, 11];

    xOff = margin + 4;
    pdf.setTextColor(31, 41, 55);

    const vals: string[] = [
      c.receiptNo,
      c.month,
      c.date,
      c.paymentType,
      c.amount.toLocaleString(),
      c.lateFine > 0 ? c.lateFine.toLocaleString() : '-',
    ];
    vals.forEach((v, vi) => {
      pdf.text(v, xOff, y + 12);
      xOff += columns[vi].w;
    });

    pdf.setTextColor(...statusTxtColor);
    pdf.setFont('helvetica', 'bold');
    pdf.text(c.status.toUpperCase(), xOff, y + 12);
    pdf.setFont('helvetica', 'normal');

    pdf.setDrawColor(199, 210, 254);
    pdf.line(margin, y + rowH, pageWidth - margin, y + rowH);

    if (c.status === 'paid') {
      totalPaid += c.amount;
      totalFine += c.lateFine;
    }

    y += rowH;
  });

  if (memberCollections.length === 0) {
    pdf.setTextColor(107, 114, 128);
    pdf.text('No payment records found for this member.', margin + 4, y + 12);
    y += rowH;
  }

  // ── Totals summary ────────────────────────────────────────────────────────
  y += 16;
  pdf.setFillColor(238, 242, 255);
  pdf.setDrawColor(199, 210, 254);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 60, 4, 4, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(55, 48, 163);
  pdf.text('Statement Summary', margin + 10, y + 16);

  pdf.setFontSize(8.5);
  pdf.setTextColor(31, 41, 55);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Total Payments Collected: ${totalPaid.toLocaleString()} TK`, margin + 10, y + 32);
  pdf.text(`Total Late Fines: ${totalFine.toLocaleString()} TK`, margin + 10, y + 46);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(16, 185, 129);
  const grandTotal = totalPaid + totalFine;
  pdf.text(`Grand Total: ${grandTotal.toLocaleString()} TK`, pageWidth - margin - 10, y + 46, { align: 'right' });

  // ── Footer ────────────────────────────────────────────────────────────────
  pdf.setFontSize(7);
  pdf.setTextColor(156, 163, 175);
  pdf.setFont('helvetica', 'normal');
  pdf.text('© Friends Development Committee — Confidential Document', margin, pageHeight - 20);
  pdf.text('This document was auto-generated by FDC Management System', pageWidth - margin, pageHeight - 20, { align: 'right' });

  pdf.save(`${filename}.pdf`);
}
