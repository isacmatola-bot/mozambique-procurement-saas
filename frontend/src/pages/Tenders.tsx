import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import { ErrorBox, SuccessBox } from '../ui/Status';

type Tender = { id:string; title:string; reference_number:string; procurement_method:string; budget:string; currency:string; deadline:string; status:string; bid_count:number };
type Supplier = { id:string; name:string };
type Bid = { id:string; supplier_name:string; amount:string; technical_score:string; financial_score:string; total_score:string; status:string };

export function Tenders() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selected, setSelected] = useState('');
  const [bids, setBids] = useState<Bid[]>([]);
  const [form, setForm] = useState({ title:'', reference_number:'', procurement_method:'quotation', category:'goods', budget:0, deadline:'' });
  const [bidForm, setBidForm] = useState({ supplier_id:'', amount:0, technical_score:80, financial_score:80, local_preference_applied:true });
  const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  async function load() { const [t, s] = await Promise.all([api<Tender[]>('/tenders'), api<Supplier[]>('/suppliers')]); setTenders(t); setSuppliers(s); if (!bidForm.supplier_id && s[0]) setBidForm(f=>({...f,supplier_id:s[0].id})); }
  async function loadBids(id: string) { setSelected(id); setBids(await api<Bid[]>(`/tenders/${id}/bids`)); }
  useEffect(() => { load().catch(e=>setError(e.message)); }, []);
  async function submit(e: FormEvent) { e.preventDefault(); setError(''); setSuccess(''); try { await api('/tenders', { method:'POST', body: JSON.stringify({...form, currency:'MZN', status:'published', evaluation_criteria:[{name:'Preço',weight:40},{name:'Qualidade',weight:35},{name:'Prazo',weight:25}]}) }); setSuccess('Tender created.'); await load(); } catch(err:any){ setError(err.message); } }
  async function submitBid(e: FormEvent) { e.preventDefault(); if (!selected) return; setError(''); setSuccess(''); try { await api(`/tenders/${selected}/bids`, { method:'POST', body: JSON.stringify({...bidForm, currency:'MZN', status:'qualified'}) }); setSuccess('Bid saved and scored.'); await loadBids(selected); await load(); } catch(err:any){ setError(err.message); } }
  return <div className="grid">
    <div><h1 className="page-title">Tenders & Bids</h1><p className="muted">Create tenders and score supplier bids.</p></div><ErrorBox error={error}/><SuccessBox message={success}/>
    <div className="grid cols-2">
      <form className="card form" onSubmit={submit}><h3>New tender</h3><div className="field"><label>Title</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required /></div><div className="field"><label>Reference</label><input value={form.reference_number} onChange={e=>setForm({...form,reference_number:e.target.value})} placeholder="IFPI/PROC/2026/002" required /></div><div className="field"><label>Method</label><select value={form.procurement_method} onChange={e=>setForm({...form,procurement_method:e.target.value})}><option value="quotation">Quotation</option><option value="public_tender">Public tender</option><option value="limited_tender">Limited tender</option><option value="direct_award">Direct award</option></select></div><div className="field"><label>Budget</label><input type="number" value={form.budget} onChange={e=>setForm({...form,budget:Number(e.target.value)})} /></div><div className="field"><label>Deadline</label><input type="date" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})} required /></div><button className="btn">Create tender</button></form>
      <form className="card form" onSubmit={submitBid}><h3>Add bid to selected tender</h3><div className="field"><label>Supplier</label><select value={bidForm.supplier_id} onChange={e=>setBidForm({...bidForm,supplier_id:e.target.value})}>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="field"><label>Amount</label><input type="number" value={bidForm.amount} onChange={e=>setBidForm({...bidForm,amount:Number(e.target.value)})}/></div><div className="field"><label>Technical score</label><input type="number" value={bidForm.technical_score} onChange={e=>setBidForm({...bidForm,technical_score:Number(e.target.value)})}/></div><div className="field"><label>Financial score</label><input type="number" value={bidForm.financial_score} onChange={e=>setBidForm({...bidForm,financial_score:Number(e.target.value)})}/></div><label><input type="checkbox" checked={bidForm.local_preference_applied} onChange={e=>setBidForm({...bidForm,local_preference_applied:e.target.checked})}/> Apply local preference</label><button className="btn" disabled={!selected}>Save bid</button><p className="muted">Select a tender below first.</p></form>
    </div>
    <div className="card table-wrap"><h3>Tenders</h3><table><thead><tr><th>Reference</th><th>Title</th><th>Budget</th><th>Deadline</th><th>Status</th><th></th></tr></thead><tbody>{tenders.map(t=><tr key={t.id}><td>{t.reference_number}</td><td>{t.title}<div className="muted">{t.bid_count} bids</div></td><td>{Number(t.budget).toLocaleString()} {t.currency}</td><td>{t.deadline}</td><td><span className="badge warn">{t.status}</span></td><td><button className="btn secondary" onClick={()=>loadBids(t.id)}>View bids</button></td></tr>)}</tbody></table></div>
    {selected && <div className="card table-wrap"><h3>Bids</h3><table><thead><tr><th>Supplier</th><th>Amount</th><th>Technical</th><th>Financial</th><th>Total</th><th>Status</th></tr></thead><tbody>{bids.map(b=><tr key={b.id}><td>{b.supplier_name}</td><td>{Number(b.amount).toLocaleString()} MZN</td><td>{b.technical_score}</td><td>{b.financial_score}</td><td><strong>{b.total_score}</strong></td><td>{b.status}</td></tr>)}</tbody></table></div>}
  </div>;
}
