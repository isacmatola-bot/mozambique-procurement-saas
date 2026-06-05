import { useEffect, useState } from 'react';
import { api } from '../api';
import { ErrorBox } from '../ui/Status';

type DashboardData = {
  counts: { suppliers: number; tenders: number; contracts: number; invoices: number; invoice_total: string };
  tendersByStatus: { status: string; count: number }[];
  invoicesByStatus: { status: string; count: number; total: string }[];
  recentAudit: any[];
};

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api<DashboardData>('/reports/dashboard').then(setData).catch(e => setError(e.message)); }, []);
  return <div className="grid">
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="muted">Operational overview for procurement compliance and finance.</p>
    </div>
    <ErrorBox error={error} />
    <div className="grid cols-3">
      <Stat title="Suppliers" value={data?.counts.suppliers ?? 0} />
      <Stat title="Tenders" value={data?.counts.tenders ?? 0} />
      <Stat title="Contracts" value={data?.counts.contracts ?? 0} />
      <Stat title="Invoices" value={data?.counts.invoices ?? 0} />
      <Stat title="Invoice Total" value={`${Number(data?.counts.invoice_total ?? 0).toLocaleString()} MZN`} />
      <div className="card"><strong>Compliance flags</strong><p className="muted">VAT 17%, audit logs, supplier disclosure, local preference tracking.</p></div>
    </div>
    <div className="grid cols-2">
      <div className="card"><h3>Tenders by status</h3>{data?.tendersByStatus.map(x => <p key={x.status}><span className="badge warn">{x.status}</span> {x.count}</p>)}</div>
      <div className="card"><h3>Invoices by status</h3>{data?.invoicesByStatus.map(x => <p key={x.status}><span className="badge">{x.status}</span> {x.count} — {Number(x.total).toLocaleString()} MZN</p>)}</div>
    </div>
    <div className="card"><h3>Recent audit activity</h3><div className="table-wrap"><table><thead><tr><th>Action</th><th>Entity</th><th>Date</th></tr></thead><tbody>{data?.recentAudit.map((x, i) => <tr key={i}><td>{x.action}</td><td>{x.entity_type}</td><td>{new Date(x.created_at).toLocaleString()}</td></tr>)}</tbody></table></div></div>
  </div>;
}

function Stat({ title, value }: { title: string; value: any }) {
  return <div className="card stat"><span className="muted">{title}</span><strong>{value}</strong></div>;
}
