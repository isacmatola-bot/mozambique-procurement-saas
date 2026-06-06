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

type Bid = {
  id: string;
  supplier_name: string;
  amount: string;
  technical_score: string;
  financial_score: string;
  total_score: string;
  status: string;
};

export function Tenders() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selected, setSelected] = useState('');
  const [bids, setBids] = useState<Bid[]>([]);
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    title: '',
    reference_number: '',
    procurement_method: 'quotation',
    category: 'goods',
    budget: 0,
    deadline: ''
  });

  const [bidForm, setBidForm] = useState({
    supplier_id: '',
    amount: 0,
    technical_score: 80,
    financial_score: 80,
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

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api('/tenders', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          currency: 'MZN',
          status: 'published',
          evaluation_criteria: [
            { name: 'Preço', weight: 40 },
            { name: 'Qualidade', weight: 35 },
            { name: 'Prazo', weight: 25 }
          ]
        })
      });

      setSuccess('Tender created.');
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function submitBid(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;

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

      setSuccess('Bid saved and scored.');
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
      setSuccess(`AI ranking completed: ${result.count || 0} supplier recommendations generated.`);
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
        <h1 className="page-title">Tenders & Bids</h1>
        <p className="muted">
          Create tenders, score supplier bids, run AI supplier ranking, approve recommendations,
          and record supplier performance.
        </p>
      </div>

      <ErrorBox error={error} />
      <SuccessBox message={success} />

      <div className="grid cols-2">
        <form className="card form" onSubmit={submit}>
          <h3>New tender</h3>

          <div className="field">
            <label>Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div className="field">
            <label>Reference</label>
            <input
              value={form.reference_number}
              onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
              placeholder="IFP/PROC/2026/002"
              required
            />
          </div>

          <div className="field">
            <label>Method</label>
            <select
              value={form.procurement_method}
              onChange={(e) => setForm({ ...form, procurement_method: e.target.value })}
            >
              <option value="quotation">Quotation</option>
              <option value="public_tender">Public tender</option>
              <option value="limited_tender">Limited tender</option>
              <option value="direct_award">Direct award</option>
            </select>
          </div>

          <div className="field">
            <label>Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="goods">Goods</option>
              <option value="services">Services</option>
              <option value="works">Works</option>
            </select>
          </div>

          <div className="field">
            <label>Budget</label>
            <input
              type="number"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
            />
          </div>

          <div className="field">
            <label>Deadline</label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              required
            />
          </div>

          <button className="btn" type="submit">Create tender</button>
        </form>

        <form className="card form" onSubmit={submitBid}>
          <h3>Add bid to selected tender</h3>

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
            <label>Amount</label>
            <input
              type="number"
              value={bidForm.amount}
              onChange={(e) => setBidForm({ ...bidForm, amount: Number(e.target.value) })}
            />
          </div>

          <div className="field">
            <label>Technical score</label>
            <input
              type="number"
              value={bidForm.technical_score}
              onChange={(e) => setBidForm({ ...bidForm, technical_score: Number(e.target.value) })}
            />
          </div>

          <div className="field">
            <label>Financial score</label>
            <input
              type="number"
              value={bidForm.financial_score}
              onChange={(e) => setBidForm({ ...bidForm, financial_score: Number(e.target.value) })}
            />
          </div>

          <button className="btn" type="submit" disabled={!selected}>
            Save bid
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Tenders</h3>

        <div className="grid">
          {tenders.map((tender) => (
            <div key={tender.id} className="card">
              <h4>{tender.title}</h4>
              <p className="muted">
                {tender.reference_number} · {tender.procurement_method} · {tender.status}
              </p>
              <p>
                Budget: {tender.currency} {tender.budget} · Bids: {tender.bid_count || 0}
              </p>
              <button className="btn" type="button" onClick={() => loadBids(tender.id)}>
                Select tender
              </button>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="card">
          <h3>Selected tender</h3>
          <p>
            <strong>{currentTender?.title || selected}</strong>
          </p>

          <button className="btn" type="button" onClick={runAiRanking} disabled={loadingAi}>
            {loadingAi ? 'Running AI ranking...' : 'Run AI Ranking'}
          </button>
        </div>
      )}

      {selected && (
        <div className="card">
          <h3>Bids</h3>

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
            <p className="muted">No AI recommendations yet. Select a tender and click Run AI Ranking.</p>
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
