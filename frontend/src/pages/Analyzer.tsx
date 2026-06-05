import { FormEvent, useState } from 'react';
import { api } from '../api';
import { ErrorBox } from '../ui/Status';

const sample = `Fornecedor: Beira Office Supplies Lda
NIF: 401234567
Valor: MZN 790000
Pagamento em 30 dias após recepção e validação da factura.
O contrato pode ser rescindido em caso de incumprimento grave.`;

export function Analyzer() {
  const [documentText, setDocumentText] = useState(sample);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(e: FormEvent) { e.preventDefault(); setError(''); setLoading(true); try { const r = await api('/ai/extract-contract', { method:'POST', body: JSON.stringify({ documentText, sourceName:'manual-paste' }) }); setResult(r); } catch(err:any){ setError(err.message); } finally { setLoading(false); } }
  return <div className="grid">
    <div><h1 className="page-title">AI Contract Analyzer</h1><p className="muted">Paste contract text to extract supplier, value, obligations, risks and compliance notes.</p></div><ErrorBox error={error}/>
    <div className="grid cols-2">
      <form className="card form" onSubmit={submit}><h3>Document text</h3><textarea style={{minHeight: 320}} value={documentText} onChange={e=>setDocumentText(e.target.value)} /><button className="btn" disabled={loading}>{loading ? 'Analyzing...' : 'Extract structured data'}</button><p className="muted">Uses OpenAI when OPENAI_API_KEY is configured; otherwise uses deterministic demo extraction.</p></form>
      <div className="card"><h3>Extraction result</h3>{result ? <div><p><span className="badge">{result.provider}</span> Model: {result.model}</p><pre className="pre">{JSON.stringify(result.extraction, null, 2)}</pre></div> : <p className="muted">No extraction yet.</p>}</div>
    </div>
  </div>;
}
