import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import { ErrorBox, SuccessBox } from '../ui/Status';

type Supplier = { id:string; name:string };
type Contract = { id:string; contract_number:string; title:string };
type Invoice = { id:string; invoice_number:string; supplier_name:string; contract_number?:string; subtotal:string; vat_amount:string; total:string; status:string; issue_date:string };

export function Invoices() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [form, setForm] = useState({ supplier_id:'', contract_id:'', due_date:'', description:'Material/serviço contratado', quantity:1, unit_price:0 });
  const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  async function load() { const [i,s,c] = await Promise.all([api<Invoice[]>('/invoices'), api<Supplier[]>('/suppliers'), api<Contract[]>('/contracts')]); setRows(i); setSuppliers(s); setContracts(c); setForm(f=>({...f, supplier_id:f.supplier_id || s[0]?.id || '', contract_id:f.contract_id || c[0]?.id || ''})); }
  useEffect(()=>{ load().catch(e=>setError(e.message)); }, []);
  async function submit(e: FormEvent) { e.preventDefault(); setError(''); setSuccess(''); try { await api('/invoices/generate', { method:'POST', body: JSON.stringify({ supplier_id: form.supplier_id, contract_id: form.contract_id || null, due_date: form.due_date || null, items:[{ description: form.description, quantity: form.quantity, unit_price: form.unit_price }] }) }); setSuccess('Invoice generated with VAT.'); await load(); } catch(err:any){ setError(err.message); } }
  async function markPaid(id:string) { await api(`/invoices/${id}/status`, { method:'PATCH', body: JSON.stringify({ status:'paid' }) }); await load(); }
  return <div className="grid">
    <div><h1 className="page-title">Invoices</h1><p className="muted">Generate tax-aware invoices with VAT calculation.</p></div><ErrorBox error={error}/><SuccessBox message={success}/>
    <div className="grid cols-2">
      <form className="card form" onSubmit={submit}><h3>Generate invoice</h3><div className="field"><label>Supplier</label><select value={form.supplier_id} onChange={e=>setForm({...form,supplier_id:e.target.value})}>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="field"><label>Contract</label><select value={form.contract_id} onChange={e=>setForm({...form,contract_id:e.target.value})}><option value="">No contract</option>{contracts.map(c=><option key={c.id} value={c.id}>{c.contract_number} — {c.title}</option>)}</select></div><div className="field"><label>Due date</label><input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/></div><div className="field"><label>Description</label><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div><div className="grid cols-2"><div className="field"><label>Qty</label><input type="number" value={form.quantity} onChange={e=>setForm({...form,quantity:Number(e.target.value)})}/></div><div className="field"><label>Unit price</label><input type="number" value={form.unit_price} onChange={e=>setForm({...form,unit_price:Number(e.target.value)})}/></div></div><button className="btn">Generate invoice</button></form>
      <div className="card"><h3>VAT rule</h3><p className="muted">Subtotal + 17% VAT = total. The invoice record keeps line items, issue date, due date, supplier, contract and audit trail metadata.</p></div>
    </div>
    <div className="card table-wrap"><h3>Invoices</h3><table><thead><tr><th>Number</th><th>Supplier</th><th>Subtotal</th><th>VAT</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>{rows.map(i=><tr key={i.id}><td>{i.invoice_number}<div className="muted">{i.issue_date}</div></td><td>{i.supplier_name}<div className="muted">{i.contract_number}</div></td><td>{Number(i.subtotal).toLocaleString()} MZN</td><td>{Number(i.vat_amount).toLocaleString()} MZN</td><td><strong>{Number(i.total).toLocaleString()} MZN</strong></td><td><span className="badge">{i.status}</span></td><td><button className="btn secondary" onClick={()=>markPaid(i.id)}>Mark paid</button></td></tr>)}</tbody></table></div>
  </div>;
}
