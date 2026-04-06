// utils/pdfCert.js — Guna Milan PDF Certificate Generator
const PDFDocument = require('pdfkit');

const GOLD = '#C9A84C';
const INK  = '#1A1209';
const SOFT = '#6B5837';
const BG   = '#FAF5EC';

function generateCertificate(evalData, user1, user2, kootas) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      info: {
        Title: `Ashtakoota Report — ${user1.Username} & ${user2.Username}`,
        Author: 'Ashtakoota Dating',
        Subject: 'Vedic Compatibility (Guna Milan)',
      },
    });

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const margin = 60;
    const contentW = W - margin * 2;

    // ── Background tint ──────────────────────────────────────────────────
    doc.rect(0, 0, W, doc.page.height).fill(BG);

    // ── Decorative border ────────────────────────────────────────────────
    doc.rect(margin - 12, 48, contentW + 24, doc.page.height - 96)
       .lineWidth(1).strokeColor(GOLD).stroke();
    doc.rect(margin - 8, 52, contentW + 16, doc.page.height - 104)
       .lineWidth(0.3).strokeColor(GOLD).stroke();

    // ── Header ───────────────────────────────────────────────────────────
    doc.y = 80;
    doc.fontSize(9).fillColor(GOLD).font('Helvetica')
       .text('✦  VEDIC COMPATIBILITY REPORT  ✦', margin, doc.y, {
         align: 'center', width: contentW, characterSpacing: 2,
       });

    doc.y += 14;
    doc.fontSize(28).fillColor(INK).font('Helvetica-Bold')
       .text('Ashtakoota', margin, doc.y, { align: 'center', width: contentW });

    doc.y += 8;
    doc.fontSize(12).fillColor(SOFT).font('Helvetica')
       .text('Guna Milan Certificate', margin, doc.y, { align: 'center', width: contentW });

    // ── Divider ──────────────────────────────────────────────────────────
    doc.y += 20;
    doc.moveTo(margin + 40, doc.y).lineTo(W - margin - 40, doc.y)
       .lineWidth(0.5).strokeColor(GOLD).stroke();

    // ── Couple names ─────────────────────────────────────────────────────
    doc.y += 24;
    const midX = W / 2;
    doc.fontSize(18).fillColor(INK).font('Helvetica-Bold')
       .text(user1.Username, margin, doc.y, { width: contentW / 2 - 20, align: 'center' })
       .text(user2.Username, midX + 10,  doc.y - doc.currentLineHeight(), { width: contentW / 2 - 20, align: 'center' });

    doc.y += 4;
    doc.fontSize(9).fillColor(SOFT).font('Helvetica')
       .text(`${user1.RashiName} · ${user1.NakshatraName}`, margin, doc.y,
             { width: contentW / 2 - 20, align: 'center' })
       .text(`${user2.RashiName} · ${user2.NakshatraName}`, midX + 10, doc.y - doc.currentLineHeight(),
             { width: contentW / 2 - 20, align: 'center' });

    // ── Score circle (text version) ───────────────────────────────────────
    doc.y += 30;
    const label = evalData.MatchQualityLabel;
    const labelColor = label === 'Excellent' ? '#1A5C5C'
                     : label === 'Good'      ? '#2E6B2E'
                     : label === 'Average'   ? SOFT
                     : '#8B2020';
    doc.fontSize(48).fillColor(GOLD).font('Helvetica-Bold')
       .text(evalData.TotalScore.toString(), margin, doc.y, { align: 'center', width: contentW });
    doc.fontSize(12).fillColor(SOFT)
       .text('out of 36 Gunas', margin, doc.y - 4, { align: 'center', width: contentW });
    doc.y += 8;
    doc.fontSize(14).fillColor(labelColor).font('Helvetica-Bold')
       .text(`✦  ${label.toUpperCase()}  ✦`, margin, doc.y, { align: 'center', width: contentW });

    // ── Divider ──────────────────────────────────────────────────────────
    doc.y += 20;
    doc.moveTo(margin + 40, doc.y).lineTo(W - margin - 40, doc.y)
       .lineWidth(0.5).strokeColor(GOLD).stroke();

    // ── Koota breakdown table ─────────────────────────────────────────────
    doc.y += 20;
    doc.fontSize(10).fillColor(GOLD).font('Helvetica-Bold')
       .text('KOOTA BREAKDOWN', margin, doc.y, { align: 'center', width: contentW, characterSpacing: 1 });

    doc.y += 16;
    const colW = [110, 60, 40, contentW - 210];
    let rowY = doc.y;

    // Table header
    doc.fontSize(8).fillColor(SOFT).font('Helvetica-Bold');
    doc.text('Koota', margin, rowY, { width: colW[0] });
    doc.text('Score', margin + colW[0], rowY, { width: colW[1], align: 'center' });
    doc.text('Max', margin + colW[0] + colW[1], rowY, { width: colW[2], align: 'center' });
    doc.text('Explanation', margin + colW[0] + colW[1] + colW[2], rowY, { width: colW[3] });

    rowY += 14;
    doc.moveTo(margin, rowY).lineTo(W - margin, rowY).lineWidth(0.3).strokeColor(GOLD).stroke();
    rowY += 8;

    const kootaOrder = ['Varna','Vashya','Tara','Yoni','GrahaMaitri','Gana','Bhakoot','Nadi'];
    kootaOrder.forEach((type, i) => {
      const k = kootas.find(k => k.KootaType === type);
      if (!k) return;
      const isEven = i % 2 === 0;
      if (isEven) {
        doc.rect(margin - 4, rowY - 4, contentW + 8, 28)
           .fillColor('#F0E8D5').fill();
      }
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(9)
         .text(type === 'GrahaMaitri' ? 'Graha Maitri' : type, margin, rowY, { width: colW[0] });
      const pct = k.ScoreValue / k.MaxScore;
      const scoreColor = pct >= 0.75 ? '#2E6B2E' : pct >= 0.5 ? SOFT : '#8B2020';
      doc.fillColor(scoreColor).font('Helvetica-Bold')
         .text(`${k.ScoreValue}`, margin + colW[0], rowY, { width: colW[1], align: 'center' });
      doc.fillColor(SOFT).font('Helvetica')
         .text(`${k.MaxScore}`, margin + colW[0] + colW[1], rowY, { width: colW[2], align: 'center' });
      doc.fillColor(INK).font('Helvetica').fontSize(7)
         .text(k.ExplanationText || '', margin + colW[0] + colW[1] + colW[2], rowY,
               { width: colW[3], lineGap: 1 });
      rowY += 30;
    });

    // ── Footer ────────────────────────────────────────────────────────────
    doc.moveTo(margin + 40, rowY + 8).lineTo(W - margin - 40, rowY + 8)
       .lineWidth(0.5).strokeColor(GOLD).stroke();
    doc.y = rowY + 20;
    doc.fontSize(8).fillColor(SOFT).font('Helvetica-Oblique')
       .text(`Generated by Ashtakoota · ${new Date(evalData.EvaluatedAtTimestamp).toDateString()}`,
             margin, doc.y, { align: 'center', width: contentW });
    doc.y += 10;
    doc.fontSize(7).fillColor(GOLD)
       .text('✦  May the stars align  ✦', margin, doc.y, { align: 'center', width: contentW });

    doc.end();
  });
}

module.exports = { generateCertificate };
