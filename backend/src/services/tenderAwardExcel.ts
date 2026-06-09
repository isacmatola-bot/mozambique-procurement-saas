import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

function safeText(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function addRowsFromObjects(sheet: ExcelJS.Worksheet, rows: any[]) {
  if (rows.length === 0) {
    sheet.addRow(['No records']);
    return;
  }

  const keys = Object.keys(rows[0]);
  sheet.addRow(keys);

  for (const row of rows) {
    sheet.addRow(keys.map(key => safeText(row[key])));
  }

  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach(column => {
    column.width = 24;
  });
}

export async function generateTenderAwardExcel(input: {
  tender: any;
  winningBid: any;
  winningSupplier: any;
  approval: any;
  ranking: any[];
  allBids: any[];
  officerReason?: string | null;
}) {
  const auditRoot = path.resolve(process.cwd(), 'uploads', 'audit');
  fs.mkdirSync(auditRoot, { recursive: true });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Mozambique Procurement SaaS';
  workbook.created = new Date();

  const summary = workbook.addWorksheet('Tender Summary');
  addRowsFromObjects(summary, [
    {
      tender_id: input.tender.id,
      title: input.tender.title,
      reference_number: input.tender.reference_number,
      category: input.tender.category,
      procurement_method: input.tender.procurement_method,
      budget: input.tender.budget,
      currency: input.tender.currency,
      status_before_award: input.tender.status,
      winning_supplier: input.winningSupplier.name,
      winning_supplier_id: input.winningSupplier.id,
      winning_bid_id: input.winningBid.id,
      approval_id: input.approval.id,
      officer_reason: input.officerReason || '',
      generated_at: new Date().toISOString()
    }
  ]);

  const rankingSheet = workbook.addWorksheet('Final AI Ranking');
  addRowsFromObjects(rankingSheet, input.ranking);

  const winningBidSheet = workbook.addWorksheet('Winning Bid');
  addRowsFromObjects(winningBidSheet, [input.winningBid]);

  const allBidsSheet = workbook.addWorksheet('All Bids');
  addRowsFromObjects(allBidsSheet, input.allBids);

  const approvalSheet = workbook.addWorksheet('Decision Approval');
  addRowsFromObjects(approvalSheet, [input.approval]);

  const notesSheet = workbook.addWorksheet('Audit Notes');
  notesSheet.addRow(['Note']);
  notesSheet.addRow(['This file is an automatically generated audit record of the tender award decision.']);
  notesSheet.addRow(['The final decision remains the responsibility of the procurement officer or authorized committee.']);
  notesSheet.addRow(['AI ranking is decision-support evidence and should be reviewed with procurement law, tender documents, and supplier submissions.']);
  notesSheet.getRow(1).font = { bold: true };
  notesSheet.columns = [{ width: 120 }];

  const fileName = `tender-award-audit-${input.tender.reference_number || input.tender.id}-${Date.now()}-${randomUUID()}.xlsx`
    .replace(/[^a-zA-Z0-9._-]/g, '-');

  const filePath = path.join(auditRoot, fileName);
  await workbook.xlsx.writeFile(filePath);

  const stats = fs.statSync(filePath);

  return {
    fileName,
    filePath,
    sizeBytes: stats.size
  };
}
