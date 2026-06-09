import { Router } from 'express';
import { query } from '../db.js';
import { generateTenderAwardExcel } from '../services/tenderAwardExcel.js';

const router = Router();

function textValue(row: any, keys: string[], fallback = ''): string {
  for (const key of keys) {
    if (row && row[key] !== undefined && row[key] !== null) {
      return String(row[key]);
    }
  }
  return fallback;
}

function numberValue(row: any, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = Number(row?.[key]);
    if (!Number.isNaN(value) && value > 0) return value;
  }
  return fallback;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

async function getSupplierPerformanceScore(supplierId: string): Promise<number> {
  const result = await query(
    `
    SELECT AVG(final_rating)::numeric(5,2) AS avg_rating
    FROM supplier_performance
    WHERE supplier_id = $1
    `,
    [supplierId]
  );

  const avg = Number(result[0]?.avg_rating);
  return Number.isNaN(avg) ? 70 : avg;
}

async function getSupplierRiskPenalty(supplierId: string): Promise<{ penalty: number; warnings: string[]; riskLevel: string }> {
  const result = await query(
    `
    SELECT risk_type, severity, description
    FROM supplier_risk_flags
    WHERE supplier_id = $1 AND active = TRUE
    `,
    [supplierId]
  );

  let penalty = 0;
  const warnings: string[] = [];

  for (const risk of result) {
    const severity = normalize(risk.severity || 'medium');

    if (severity === 'high') penalty += 20;
    else if (severity === 'medium') penalty += 10;
    else penalty += 5;

    warnings.push(`${risk.risk_type}: ${risk.description || risk.severity}`);
  }

  let riskLevel = 'low';
  if (penalty >= 20) riskLevel = 'high';
  else if (penalty >= 10) riskLevel = 'medium';

  return { penalty, warnings, riskLevel };
}

function scoreSupplier(tender: any, supplier: any, performanceScore: number, riskPenalty: number) {
  const reasons: string[] = [];

  const tenderCategory = normalize(
    textValue(tender, ['category', 'procurement_category', 'type', 'sector'])
  );

  const supplierCategory = normalize(
    textValue(supplier, ['category', 'procurement_category', 'specialization', 'sector'])
  );

  const bidAmount = numberValue(supplier, ['bid_amount'], 0);
  const bidTechnicalScore = numberValue(supplier, ['bid_technical_score'], 0);
  const bidFinancialScore = numberValue(supplier, ['bid_financial_score'], 0);
  const bidTotalScore = numberValue(supplier, ['bid_total_score'], 0);
  const tenderBudget = numberValue(tender, ['estimated_budget', 'budget', 'estimated_value', 'value'], 0);

  let score = 0;

  if (bidTotalScore > 0) {
    score += bidTotalScore * 0.55;
    reasons.push(`Tender-specific total bid score is the main ranking factor: ${bidTotalScore}.`);
  }

  if (bidTechnicalScore > 0) {
    score += bidTechnicalScore * 0.1;
    reasons.push(`Tender-specific technical bid score considered: ${bidTechnicalScore}.`);
  }

  if (bidFinancialScore > 0) {
    score += bidFinancialScore * 0.1;
    reasons.push(`Tender-specific financial bid score considered: ${bidFinancialScore}.`);
  }

  if (tenderCategory && supplierCategory && supplierCategory.includes(tenderCategory)) {
    score += 8;
    reasons.push('Supplier category matches the tender requirement.');
  } else if (tenderCategory && supplierCategory) {
    score += 3;
    reasons.push('Supplier has category information, but it is not an exact tender match.');
  } else {
    reasons.push('Category information is incomplete.');
  }

  const status = normalize(textValue(supplier, ['status', 'compliance_status', 'approval_status'], 'active'));

  if (['active', 'approved', 'compliant', 'verified'].includes(status)) {
    score += 7;
    reasons.push('Supplier appears active/compliant.');
  } else {
    score -= 20;
    reasons.push(`Supplier status may require review: ${status}.`);
  }

  if (tenderBudget > 0 && bidAmount > 0) {
    if (bidAmount <= tenderBudget) {
      score += 5;
      reasons.push(`Bid amount ${bidAmount.toFixed(2)} is within the tender budget ${tenderBudget.toFixed(2)}.`);
    } else {
      score -= 15;
      reasons.push(`Bid amount ${bidAmount.toFixed(2)} exceeds the tender budget ${tenderBudget.toFixed(2)}.`);
    }
  } else if (bidAmount > 0) {
    reasons.push(`Bid amount considered: ${bidAmount.toFixed(2)}.`);
  }

  score += Math.min(5, Math.max(0, performanceScore * 0.05));
  reasons.push(`Historical performance score considered: ${performanceScore.toFixed(2)}.`);

  const supplierCapacity = numberValue(supplier, ['capacity_score', 'financial_capacity_score', 'delivery_capacity_score'], 70);
  score += Math.min(3, supplierCapacity * 0.03);
  reasons.push(`Capacity indicator considered: ${supplierCapacity}.`);

  score -= riskPenalty;

  const finalScore = Math.max(0, Math.min(100, Number(score.toFixed(2))));

  return {
    score: finalScore,
    reasons
  };
}


router.post('/recommendations/run', async (req, res, next) => {
  try {
    const { tenderId } = req.body;

    if (!tenderId) {
      return res.status(400).json({ error: 'tenderId is required' });
    }

    const tenderResult = await query(
      `SELECT * FROM tenders WHERE id::text = $1 LIMIT 1`,
      [String(tenderId)]
    );

    if (tenderResult.length === 0) {
      return res.status(404).json({ error: 'Tender not found' });
    }

    const tender = tenderResult[0];

    const bidRows = await query(
      `
      SELECT
        s.*,
        b.id AS bid_id,
        b.amount AS bid_amount,
        b.currency AS bid_currency,
        b.technical_score AS bid_technical_score,
        b.financial_score AS bid_financial_score,
        b.total_score AS bid_total_score,
        b.local_preference_applied AS bid_local_preference_applied,
        b.status AS bid_status,
        b.submitted_at AS bid_submitted_at,
        b.notes AS bid_notes
      FROM bids b
      JOIN suppliers s ON s.id = b.supplier_id
      WHERE b.tender_id = $1
        AND b.status IN ('submitted', 'under_review', 'qualified', 'winner')
      ORDER BY b.total_score DESC, b.submitted_at ASC
      `,
      [String(tenderId)]
    );

    const suppliers = bidRows;

    if (suppliers.length === 0) {
      return res.status(400).json({ error: 'No bids found for this tender to rank' });
    }

    await query(`DELETE FROM ai_supplier_recommendations WHERE tender_id = $1`, [
      String(tenderId)
    ]);

    const scored = [];

    for (const supplier of suppliers) {
      const supplierId = String(supplier.id);
      const supplierName = textValue(supplier, ['name', 'company_name', 'supplier_name'], 'Unnamed Supplier');

      const performanceScore = await getSupplierPerformanceScore(supplierId);
      const risk = await getSupplierRiskPenalty(supplierId);
      const ranking = scoreSupplier(tender, supplier, performanceScore, risk.penalty);

      scored.push({
        supplierId,
        supplierName,
        score: ranking.score,
        reasons: ranking.reasons,
        warnings: risk.warnings,
        riskLevel: risk.riskLevel
      });
    }

    scored.sort((a, b) => b.score - a.score);

    const topRecommendations = scored.slice(0, 5);
    const saved = [];

    for (let i = 0; i < topRecommendations.length; i++) {
      const item = topRecommendations[i];

      const insert = await query(
        `
        INSERT INTO ai_supplier_recommendations
          (tender_id, supplier_id, supplier_name, score, rank, risk_level, reasons, warnings)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
        RETURNING *
        `,
        [
          String(tenderId),
          item.supplierId,
          item.supplierName,
          item.score,
          i + 1,
          item.riskLevel,
          JSON.stringify(item.reasons),
          JSON.stringify(item.warnings)
        ]
      );

      saved.push(insert[0]);
    }

    await query(
      `
      INSERT INTO audit_logs (action, entity_type, entity_id, new_value)
      VALUES ($1, $2, $3, $4::jsonb)
      `,
      [
        'AI_RECOMMENDATIONS_GENERATED',
        'tender',
        String(tenderId),
        JSON.stringify({ tenderId, recommendations: saved.length })
      ]
    );

    res.json({
      tenderId,
      count: saved.length,
      recommendations: saved
    });
  } catch (error) {
    next(error);
  }
});

router.get('/tenders/:tenderId/recommendations', async (req, res, next) => {
  try {
    const result = await query(
      `
        SELECT *
        FROM (
          SELECT DISTINCT ON (supplier_id) *
          FROM ai_supplier_recommendations
          WHERE tender_id = $1
          ORDER BY
            supplier_id,
            CASE
              WHEN status = 'approved' THEN 0
              WHEN status = 'pending' THEN 1
              ELSE 2
            END,
            created_at DESC
        ) latest_per_supplier
        ORDER BY rank ASC, score DESC
      `,
      [String(req.params.tenderId)]
    );

    res.json({ recommendations: result });
  } catch (error) {
    next(error);
  }
});

router.post('/recommendations/:id/decision', async (req, res, next) => {
  try {
    const { decision, officerReason, officerId } = req.body;

    if (!['approved', 'rejected', 'manual_review'].includes(decision)) {
      return res.status(400).json({
        error: 'decision must be approved, rejected, or manual_review'
      });
    }

    if (decision !== 'approved' && !officerReason) {
      return res.status(400).json({
        error: 'officerReason is required when rejecting or requesting manual review'
      });
    }

    const recommendationResult = await query(
      `SELECT * FROM ai_supplier_recommendations WHERE id = $1 LIMIT 1`,
      [String(req.params.id)]
    );

    if (recommendationResult.length === 0) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    const recommendation = recommendationResult[0];

    const approval = await query(
      `
      INSERT INTO procurement_approvals
        (recommendation_id, tender_id, supplier_id, officer_id, decision, officer_reason)
      VALUES
        ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        recommendation.id,
        recommendation.tender_id,
        recommendation.supplier_id,
        officerId || null,
        decision,
        officerReason || null
      ]
    );

    let auditFile = null;

    if (decision === 'approved') {
      const tenderResult = await query(
        `SELECT * FROM tenders WHERE id::text = $1 LIMIT 1`,
        [String(recommendation.tender_id)]
      );

      if (tenderResult.length === 0) {
        return res.status(404).json({ error: 'Tender not found for approved recommendation' });
      }

      const winningSupplierResult = await query(
        `SELECT * FROM suppliers WHERE id::text = $1 LIMIT 1`,
        [String(recommendation.supplier_id)]
      );

      if (winningSupplierResult.length === 0) {
        return res.status(404).json({ error: 'Winning supplier not found' });
      }

      const winningBidResult = await query(
        `
        SELECT b.*, s.name AS supplier_name
        FROM bids b
        JOIN suppliers s ON s.id = b.supplier_id
        WHERE b.tender_id::text = $1
          AND b.supplier_id::text = $2
        LIMIT 1
        `,
        [String(recommendation.tender_id), String(recommendation.supplier_id)]
      );

      if (winningBidResult.length === 0) {
        return res.status(404).json({ error: 'Winning bid not found for this tender and supplier' });
      }

      const ranking = await query(
        `
        SELECT *
        FROM ai_supplier_recommendations
        WHERE tender_id = $1
        ORDER BY rank ASC, score DESC, created_at DESC
        `,
        [String(recommendation.tender_id)]
      );

      const allBids = await query(
        `
        SELECT b.*, s.name AS supplier_name, s.nif AS supplier_nuit, s.category AS supplier_category,
               s.status AS supplier_status, s.risk_score AS supplier_risk_score
        FROM bids b
        JOIN suppliers s ON s.id = b.supplier_id
        WHERE b.tender_id::text = $1
        ORDER BY b.total_score DESC, b.amount ASC, b.submitted_at ASC
        `,
        [String(recommendation.tender_id)]
      );

      const excel = await generateTenderAwardExcel({
        tender: tenderResult[0],
        winningBid: winningBidResult[0],
        winningSupplier: winningSupplierResult[0],
        approval: approval[0],
        ranking,
        allBids,
        officerReason: officerReason || null
      });

      const auditFileResult = await query(
        `
        INSERT INTO tender_award_audit_files
          (organization_id, tender_id, winning_supplier_id, winning_bid_id, recommendation_id, approval_id,
           file_name, file_path, size_bytes, generated_by, decision_summary)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING *
        `,
        [
          tenderResult[0].organization_id || null,
          String(recommendation.tender_id),
          String(recommendation.supplier_id),
          String(winningBidResult[0].id),
          String(recommendation.id),
          String(approval[0].id),
          excel.fileName,
          excel.filePath,
          excel.sizeBytes,
          officerId || null,
          `Tender awarded to ${winningSupplierResult[0].name}. AI rank: ${recommendation.rank}. Score: ${recommendation.score}.`
        ]
      );

      auditFile = auditFileResult[0];

      await query(
        `
        UPDATE bids
        SET status = CASE
          WHEN supplier_id::text = $2 THEN 'winner'
          ELSE 'rejected'
        END
        WHERE tender_id::text = $1
        `,
        [String(recommendation.tender_id), String(recommendation.supplier_id)]
      );

      await query(
        `
        UPDATE tenders
        SET status = 'awarded',
            updated_at = now()
        WHERE id::text = $1
        `,
        [String(recommendation.tender_id)]
      );

      await query(
        `
        UPDATE ai_supplier_recommendations
        SET status = CASE
          WHEN id = $2 THEN 'approved'
          ELSE 'archived'
        END
        WHERE tender_id = $1
        `,
        [String(recommendation.tender_id), String(recommendation.id)]
      );
    } else {
      await query(
        `
        UPDATE ai_supplier_recommendations
        SET status = $1
        WHERE id = $2
        `,
        [decision, recommendation.id]
      );
    }

    await query(
      `
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
      `,
      [
        officerId || null,
        `AI_RECOMMENDATION_${decision.toUpperCase()}`,
        'ai_supplier_recommendation',
        recommendation.id,
        JSON.stringify(recommendation),
        JSON.stringify({ approval: approval[0], auditFile })
      ]
    );

    res.json({
      approval: approval[0],
      auditFile
    });
  } catch (error) {
    next(error);
  }
});


router.get('/tenders/:tenderId/audit-files', async (req, res, next) => {
  try {
    const result = await query(
      `
      SELECT id, tender_id, winning_supplier_id, winning_bid_id, recommendation_id,
             approval_id, file_name, mime_type, size_bytes, generated_by,
             decision_summary, created_at
      FROM tender_award_audit_files
      WHERE tender_id::text = $1
      ORDER BY created_at DESC
      `,
      [String(req.params.tenderId)]
    );

    res.json({ auditFiles: result });
  } catch (error) {
    next(error);
  }
});

router.get('/tenders/:tenderId/audit-files/:fileId/download', async (req, res, next) => {
  try {
    const result = await query(
      `
      SELECT *
      FROM tender_award_audit_files
      WHERE tender_id::text = $1
        AND id::text = $2
      LIMIT 1
      `,
      [String(req.params.tenderId), String(req.params.fileId)]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'Audit file not found' });
    }

    const file = result[0];

    const fs = await import('fs');

    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({ error: 'Stored audit file not found' });
    }

    res.download(file.file_path, file.file_name);
  } catch (error) {
    next(error);
  }
});

router.post('/performance', async (req, res, next) => {
  try {
    const {
      supplierId,
      tenderId,
      contractId,
      deliveryScore,
      qualityScore,
      complianceScore,
      timelinessScore,
      notes,
      officerId
    } = req.body;

    if (!supplierId) {
      return res.status(400).json({ error: 'supplierId is required' });
    }

    const delivery = Number(deliveryScore || 0);
    const quality = Number(qualityScore || 0);
    const compliance = Number(complianceScore || 0);
    const timeliness = Number(timelinessScore || 0);

    const finalRating = Number(((delivery + quality + compliance + timeliness) / 4).toFixed(2));

    const result = await query(
      `
      INSERT INTO supplier_performance
        (supplier_id, tender_id, contract_id, delivery_score, quality_score, compliance_score, timeliness_score, final_rating, notes)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
      `,
      [
        String(supplierId),
        tenderId ? String(tenderId) : null,
        contractId ? String(contractId) : null,
        delivery,
        quality,
        compliance,
        timeliness,
        finalRating,
        notes || null
      ]
    );

    await query(
      `
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value)
      VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [
        officerId || null,
        'SUPPLIER_PERFORMANCE_RECORDED',
        'supplier',
        String(supplierId),
        JSON.stringify(result[0])
      ]
    );

    res.json({
      performance: result[0]
    });
  } catch (error) {
    next(error);
  }
});

router.get('/audit-logs', async (_req, res, next) => {
  try {
    const result = await query(
      `
      SELECT *
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 100
      `,
      []
    );

    res.json({ auditLogs: result });
  } catch (error) {
    next(error);
  }
});

export default router;
