import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AiRecommendation,
  api,
  approveAiRecommendation,
  getAiRecommendations,
  recordSupplierPerformance,
  runAiRecommendations
} from '../api';
import { ErrorBox, SuccessBox } from '../ui/Status';

type Tender = {
  id: string;
  title: string;
  reference_number: string;
  procurement_method: string;
  category?: string;
  budget: string;
  currency: string;
  deadline: string;
  status: string;
  bid_count: number;
};

type Supplier = {
  id: string;
  name: string;
};

function formatDate(value: string) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-GB');
}

type Bid = {
  id: string;
  supplier_name: string;
  amount: string;
  technical_score: string;
  financial_score: string;
  total_score: string;
  status: string;
  notes?: string;
};

export function Bids() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selected, setSelected] = useState('');
  const [bids, setBids] = useState<Bid[]>([]);
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [bidForm, setBidForm] = useState({
    supplier_id: '',
    amount: 0,
    technical_score: 1,
    financial_score: 1,
    local_preference_applied: true
  });

  const [performanceForm, setPerformanceForm] = useState({
    deliveryScore: 90,
    qualityScore: 85,
    complianceScore: 95,
    timelinessScore: 80,
    notes: 'Supplier completed the contract with good quality and acceptable delivery time.'
  });

  const currentTender = useMemo(
    () => tenders.find((tender) => tender.id === selected),
    [tenders, selected]
  );

  const ongoingTenders = useMemo(
    () =>
      tenders.filter((tender) =>
        ['published', 'evaluation'].includes(tender.status)
      ),
    [tenders]
  );

  async function load() {
    const [tenderRows, supplierRows] = await Promise.all([
      api<Tender[]>('/tenders'),
      api<Supplier[]>('/suppliers')
    ]);

    setTenders(tenderRows);
    setSuppliers(supplierRows);

    if (!bidForm.supplier_id && supplierRows[0]) {
      setBidForm((current) => ({ ...current, supplier_id: supplierRows[0].id }));
    }
  }

  async function loadBids(id: string) {
    setSelected(id);
    setBids(await api<Bid[]>(`/tenders/${id}/bids`));

    try {
      const result = await getAiRecommendations(id);
      setRecommendations(result.recommendations || []);
    } catch {
      setRecommendations([]);
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function submitBid(e: FormEvent) {
    e.preventDefault();

    if (!selected) {
      setError('Select a tender before adding a bid.');
      return;
    }

    setError('');
    setSuccess('');

    try {
      await api(`/tenders/${selected}/bids`, {
        method: 'POST',
        body: JSON.stringify({
          ...bidForm,
          currency: 'MZN',
          status: 'qualified'
        })
      });

      setSuccess('Bid saved. Technical and financial scores were generated automatically by the system.');
      await loadBids(selected);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function runAiRanking() {
    if (!selected) {
      setError('Select a tender first.');
      return;
    }

    setError('');
    setSuccess('');
    setLoadingAi(true);

    try {
      const result = await runAiRecommendations(selected);
      setRecommendations(result.recommendations || []);
      setSuccess(`AI ranking completed: ${result.count || 0} top supplier recommendations generated.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingAi(false);
    }
  }

  async function approveRecommendation(recommendationId: string) {
    setError('');
    setSuccess('');

    try {
      await approveAiRecommendation(
        recommendationId,
        'AI recommendation reviewed and approved by procurement officer.'
      );

      if (selected) {
        const result = await getAiRecommendations(selected);
        setRecommendations(result.recommendations || []);
      }

      setSuccess('AI recommendation approved and audit record created.');
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function savePerformance(supplierId: string) {
    if (!selected) {
      setError('Select a tender first.');
      return;
    }

    setError('');
    setSuccess('');

    try {
      await recordSupplierPerformance({
        supplierId,
        tenderId: selected,
        ...performanceForm
      });

      setSuccess('Supplier performance recorded. Future AI rankings will use this score.');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="grid">
      <div>
        <h1 className="page-title">Bids & AI Evaluation</h1>
        <p className="muted">
          Select an ongoing tender, add supplier bids, allow the system to auto-score them,
          run AI ranking, approve recommendations, and record supplier performance.
        </p>
      </div>

      <ErrorBox error={error} />
      <SuccessBox message={success} />

      <div className="card">
        <h3>Available ongoing tenders</h3>

        {ongoingTenders.length === 0 ? (
          <p className="muted">No published or evaluation tenders are available for bidding.</p>
        ) : (
          <div className="grid">
            {ongoingTenders.map((tender) => (
              <div key={tender.id} className="card">
                <h4>{tender.title}</h4>
                <p className="muted">
                  {tender.reference_number} · {tender.procurement_method} · {tender.status}
                </p>
                <p>
                  Category: {tender.category || 'N/A'} · Budget: {tender.currency}{' '}
                  {tender.budget} · Deadline: {formatDate(tender.deadline)}
                </p>
                <button className="btn" type="button" onClick={() => loadBids(tender.id)}>
                  Open bids
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && currentTender && (
        <div className="card">
          <h3>Bids for: {currentTender.title}</h3>
          <p className="muted">
            Reference: {currentTender.reference_number} · Category:{' '}
            {currentTender.category || 'N/A'} · Method: {currentTender.procurement_method}
          </p>
          <p>
            Budget: {currentTender.currency} {currentTender.budget} · Deadline:{' '}
            {formatDate(currentTender.deadline)} · Status: {currentTender.status}
          </p>

          <button className="btn" type="button" onClick={runAiRanking} disabled={loadingAi}>
            {loadingAi ? 'Running AI ranking...' : 'Run AI Ranking'}
          </button>
        </div>
      )}

      {selected && (
        <form className="card form" onSubmit={submitBid}>
          <h3>Add supplier bid</h3>

          <div className="field">
            <label>Supplier</label>
            <select
              value={bidForm.supplier_id}
              onChange={(e) => setBidForm({ ...bidForm, supplier_id: e.target.value })}
            >
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Bid amount</label>
            <input
              type="number"
              value={bidForm.amount}
              onChange={(e) => setBidForm({ ...bidForm, amount: Number(e.target.value) })}
            />
          </div>

          <p className="muted">
            Technical and financial scores are generated automatically by the backend.
            Any manual score values submitted from the browser are ignored by the system.
          </p>

          <button className="btn" type="submit">
            Save bid with automatic scoring
          </button>
        </form>
      )}

      {selected && (
        <div className="card">
          <h3>Submitted bids</h3>

          {bids.length === 0 ? (
            <p className="muted">No bids found for this tender yet.</p>
          ) : (
            <div className="grid">
              {bids.map((bid) => (
                <div key={bid.id} className="card">
                  <h4>{bid.supplier_name}</h4>
                  <p>Amount: {bid.amount}</p>
                  <p>
                    Technical: {bid.technical_score} · Financial: {bid.financial_score} · Total:{' '}
                    {bid.total_score}
                  </p>
                  <p>Status: {bid.status}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selected && (
        <div className="card">
          <h3>AI supplier recommendations</h3>

          {recommendations.length === 0 ? (
            <p className="muted">No AI recommendations yet. Click Run AI Ranking.</p>
          ) : (
            <div className="grid">
              {recommendations.map((recommendation) => (
                <div key={recommendation.id} className="card">
                  <h4>
                    #{recommendation.rank} {recommendation.supplier_name}
                  </h4>
                  <p>
                    Score: <strong>{recommendation.score}</strong> · Risk:{' '}
                    {recommendation.risk_level} · Status: {recommendation.status}
                  </p>

                  <p><strong>Reasons</strong></p>
                  <ul>
                    {recommendation.reasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>

                  {recommendation.warnings.length > 0 && (
                    <>
                      <p><strong>Warnings</strong></p>
                      <ul>
                        {recommendation.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  <button
                    className="btn"
                    type="button"
                    disabled={recommendation.status === 'approved'}
                    onClick={() => approveRecommendation(recommendation.id)}
                  >
                    {recommendation.status === 'approved'
                      ? 'Approved'
                      : 'Approve Recommendation'}
                  </button>

                  <div className="field">
                    <label>Performance notes</label>
                    <textarea
                      value={performanceForm.notes}
                      onChange={(e) =>
                        setPerformanceForm({ ...performanceForm, notes: e.target.value })
                      }
                    />
                  </div>

                  <button
                    className="btn"
                    type="button"
                    onClick={() => savePerformance(recommendation.supplier_id)}
                  >
                    Record Performance
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
