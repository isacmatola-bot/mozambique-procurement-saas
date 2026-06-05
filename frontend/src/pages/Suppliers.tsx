import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import { ErrorBox, SuccessBox } from '../ui/Status';

type Supplier = { id: string; name: string; nif?: string; category: string; email?: string; local_supplier: boolean; status: string; risk_score: number; beneficial_ownership_disclosed: boolean };

export function Suppliers() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [form, setForm] = useState({ name: '', nif: '', category: 'goods', email: '', local_supplier: true });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function load() { setRows(await api<Supplier[]>('/suppliers')); }
  useEffect(() => { load().catch(e => setError(e.message)); }, []);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setSuccess('');
    try {
      await api('/suppliers', { method: 'POST', body: JSON.stringify({ ...form, beneficial_ownership_disclosed: false, risk_score: 10, status: 'active' }) });
      setForm({ name: '', nif: '', category: 'goods', email: '', local_supplier: true });
      setSuccess('Supplier created.'); await load();
    } catch (err: any) { setError(err.message); }
  }
  return <div className="grid">
    <div><h1 className="page-title">Suppliers</h1><p className="muted">Register, risk-score and monitor suppliers.</p></div>
    <ErrorBox error={error}/><SuccessBox message={success}/>
    <div className="grid cols-2">
      <form className="card form" onSubmit={submit}>
        <h3>New supplier</h3>
        <div className="field"><label>Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required /></div>
        <div className="field"><label>NIF</label><input value={form.nif} onChange={e=>setForm({...form,nif:e.target.value})} /></div>
        <div className="field"><label>Email</label><input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
        <div className="field"><label>Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="goods">Goods</option><option value="services">Services</option><option value="works">Works</option></select></div>
        <label><input type="checkbox" checked={form.local_supplier} onChange={e=>setForm({...form,local_supplier:e.target.checked})} /> Local supplier</label>
        <button className="btn">Create supplier</button>
      </form>
      <div className="card"><h3>Supplier compliance</h3><p className="muted">Track local supplier preference, NIF, beneficial ownership disclosure and risk score. Contracts above the configured threshold will flag disclosure requirements.</p></div>
    </div>
    <div className="card table-wrap"><table><thead><tr><th>Name</th><th>NIF</th><th>Category</th><th>Local</th><th>Risk</th><th>Status</th></tr></thead><tbody>{rows.map(s => <tr key={s.id}><td>{s.name}<div className="muted">{s.email}</div></td><td>{s.nif}</td><td>{s.category}</td><td>{s.local_supplier ? 'Yes' : 'No'}</td><td>{s.risk_score}</td><td><span className="badge">{s.status}</span></td></tr>)}</tbody></table></div>
  </div>;
}
