import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
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

function formatDate(value: string) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-GB');
}

function isDeadlineActive(value: string) {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadline = new Date(value);
  deadline.setHours(0, 0, 0, 0);

  return deadline >= today;
}

export function Tenders() {
  const [tenders, setTenders] = useState<Tender[]>([]);
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

  const ongoingTenders = useMemo(
    () =>
      tenders.filter(
        (tender) =>
          ['published', 'evaluation'].includes(tender.status) &&
          isDeadlineActive(tender.deadline)
      ),
    [tenders]
  );

  const nextAvailableTenders = useMemo(
    () =>
      tenders.filter(
        (tender) =>
          tender.status === 'draft' ||
          (tender.status === 'published' && !isDeadlineActive(tender.deadline))
      ),
    [tenders]
  );

  const closedTenders = useMemo(
    () =>
      tenders.filter(
        (tender) =>
          ['awarded', 'cancelled', 'closed'].includes(tender.status) ||
          (tender.status !== 'draft' && !isDeadlineActive(tender.deadline))
      ),
    [tenders]
  );

  async function load() {
    setTenders(await api<Tender[]>('/tenders'));
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

      setSuccess('Tender created and published.');
      setForm({
        title: '',
        reference_number: '',
        procurement_method: 'quotation',
        category: 'goods',
        budget: 0,
        deadline: ''
      });

      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function TenderCard({ tender }: { tender: Tender }) {
    return (
      <div className="card">
        <h4>{tender.title}</h4>
        <p className="muted">
          {tender.reference_number} · {tender.procurement_method} · {tender.status}
        </p>
        <p>
          Category: {tender.category || 'N/A'} · Budget: {tender.currency}{' '}
          {tender.budget} · Deadline: {formatDate(tender.deadline)}
        </p>
        <p>Bids received: {tender.bid_count || 0}</p>
        {['published', 'evaluation'].includes(tender.status) && (
          <Link className="btn" to="/bids">
            Go to bids
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="grid">
      <div>
        <h1 className="page-title">Tenders</h1>
        <p className="muted">
          Create and publish tenders. Published tenders become available on the Bids page
          for supplier bid submission, automatic scoring, and AI evaluation.
        </p>
      </div>

      <ErrorBox error={error} />
      <SuccessBox message={success} />

      <form className="card form" onSubmit={submit}>
        <h3>New tender</h3>

        <div className="field">
          <label>Title</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Building Cleaning"
            required
          />
        </div>

        <div className="field">
          <label>Reference</label>
          <input
            value={form.reference_number}
            onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
            placeholder="IFPI/PROC/2026/15"
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

        <button className="btn" type="submit">
          Create and publish tender
        </button>
      </form>

      <div className="card">
        <h3>Available ongoing tenders</h3>
        {ongoingTenders.length === 0 ? (
          <p className="muted">No ongoing published tenders available.</p>
        ) : (
          <div className="grid">
            {ongoingTenders.map((tender) => (
              <TenderCard key={tender.id} tender={tender} />
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Next available tenders</h3>
        <p className="muted">
          With the current database, this section uses draft tenders or published tenders
          that are not currently active. Later we can add opening date and closing date
          for more precise tender scheduling.
        </p>

        {nextAvailableTenders.length === 0 ? (
          <p className="muted">No next available tenders found.</p>
        ) : (
          <div className="grid">
            {nextAvailableTenders.map((tender) => (
              <TenderCard key={tender.id} tender={tender} />
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Closed or expired tenders</h3>
        {closedTenders.length === 0 ? (
          <p className="muted">No closed or expired tenders found.</p>
        ) : (
          <div className="grid">
            {closedTenders.map((tender) => (
              <TenderCard key={tender.id} tender={tender} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
