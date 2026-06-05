import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import { ErrorBox, SuccessBox } from '../ui/Status';

type Supplier = { id:string; name:string };
type Tender = { id:string; title:string; reference_number:string };
type Contract = { id:string; contract_number:string; title:string; value:string; currency:string; status:string; supplier_name:string; content:string; created_at:string };

export function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedContent, setSelectedContent] = useState('');
  const [form, setForm] = useState({ supplier_id:'', tender_id:'', title:'', start_date:'', end_date:'', special_terms:'' });
  const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  async function load() {
    const [c, s, t] = await Promise.all([api<Contract[]>('/contracts'), api<Supplier[]>('/suppliers'), api<Tender[]>('/tenders')]);
    setContracts(c); setSuppliers(s); setTenders(t);
    setForm(f => ({ ...f, supplier_id: f.supplier_id || s[0]?.id || '', tender_id: f.tender_id || t[0]?.id || '' }));
  }
  useEffect(()=>{ load().catch(e=>setError(e.message)); }, []);
  async function submit(e: FormEvent) { e.preventDefault(); setError(''); setSuccess(''); try { const contract = await api<Contract>('/contracts/generate', { method:'POST', body: JSON.stringify({ ...form, tender_id: form.tender_id || null, special_terms: form.special_terms || null }) }); setSuccess('Contract generated.'); setSelectedContent(contract.content); await load(); } catch(err:any){ setError(err.message); } }
  async function changeStatus(id:string, status:string) { await api(`/contracts/${id}/status`, { method:'PATCH', body: JSON.stringify({ status }) }); await load(); }
  return <div className="grid">
    <div><h1 className="page-title">Contracts</h1><p className="muted">Generate contract drafts from supplier/tender data.</p></div><ErrorBox error={error}/><SuccessBox message={success}/>
    <div className="grid cols-2">
      <form className="card form" onSubmit={submit}><h3>Generate contract</h3><div className="field"><label>Supplier</label><select value={form.supplier_id} onChange={e=>setForm({...form,supplier_id:e.target.value})}>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="field"><label>Tender</label><select value={form.tender_id} onChange={e=>setForm({...form,tender_id:e.target.value})}><option value="">No tender</option>{tenders.map(t=><option key={t.id} value={t.id}>{t.reference_number} — {t.title}</option>)}</select></div><div className="field"><label>Title</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required /></div><div className="grid cols-2"><div className="field"><label>Start</label><input type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})}/></div><div className="field"><label>End</label><input type="date" value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})}/></div></div><div className="field"><label>Special terms</label><textarea value={form.special_terms} onChange={e=>setForm({...form,special_terms:e.target.value})}/></div><button className="btn">Generate contract</button></form>
      <div className="card"><h3>Generated text preview</h3>{selectedContent ? <div className="pre">{selectedContent}</div> : <p className="muted">Generate or open a contract to preview its text.</p>}</div>
    </div>
    <div className="card table-wrap"><h3>Contracts</h3><table><thead><tr><th>Number</th><th>Title</th><th>Supplier</th><th>Value</th><th>Status</th><th>Actions</th></tr></thead><tbody>{contracts.map(c=><tr key={c.id}><td>{c.contract_number}</td><td>{c.title}</td><td>{c.supplier_name}</td><td>{Number(c.value).toLocaleString()} {c.currency}</td><td><span className="badge warn">{c.status}</span></td><td className="actions"><button className="btn secondary" onClick={()=>setSelectedContent(c.content)}>Open</button><button className="btn secondary" onClick={()=>changeStatus(c.id,'approved')}>Approve</button><button className="btn secondary" onClick={()=>changeStatus(c.id,'signed')}>Sign</button></td></tr>)}</tbody></table></div>
  </div>;
}
