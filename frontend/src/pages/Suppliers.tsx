import { FormEvent, useEffect, useState } from 'react';
import {
  api,
  downloadSupplierDocument,
  getSupplierDocuments,
  SupplierDocument,
  uploadSupplierDocument
} from '../api';
import { ErrorBox, SuccessBox } from '../ui/Status';

type Supplier = {
  id: string;
  name: string;
  nif?: string;
  category: string;
  email?: string;
  local_supplier: boolean;
  status: string;
  risk_score: number;
  beneficial_ownership_disclosed: boolean;
};

const documentTypes = [
  { value: 'tax_clearance', label: 'Tax clearance' },
  { value: 'company_registration', label: 'Company registration' },
  { value: 'nif_certificate', label: 'NUIT certificate' },
  { value: 'bank_details', label: 'Bank details' },
  { value: 'license', label: 'License' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'beneficial_ownership', label: 'Beneficial ownership' },
  { value: 'past_performance', label: 'Past performance' },
  { value: 'other', label: 'Other' }
];

function formatSize(value?: string | number) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Suppliers() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [documents, setDocuments] = useState<SupplierDocument[]>([]);
  const [form, setForm] = useState({ name: '', nif: '', category: 'goods', email: '', local_supplier: true });
  const [docForm, setDocForm] = useState({ documentType: 'tax_clearance', notes: '', file: null as File | null });
  const [fileInputKey, setFileInputKey] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    setRows(await api<Supplier[]>('/suppliers'));
  }

  async function loadDocuments(supplierId: string) {
    setDocuments(await getSupplierDocuments(supplierId));
  }

  useEffect(() => {
    load().catch(e => setError(e.message));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api('/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          beneficial_ownership_disclosed: false,
          risk_score: 10,
          status: 'active'
        })
      });

      setForm({ name: '', nif: '', category: 'goods', email: '', local_supplier: true });
      setSuccess('Supplier created.');
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function selectSupplier(supplier: Supplier) {
    setSelectedSupplier(supplier);
    setError('');
    setSuccess('');
    try {
      await loadDocuments(supplier.id);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function submitDocument(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedSupplier) {
      setError('Select a supplier first.');
      return;
    }

    if (!docForm.file) {
      setError('Choose a document file first.');
      return;
    }

    try {
      await uploadSupplierDocument(selectedSupplier.id, {
        file: docForm.file,
        documentType: docForm.documentType,
        notes: docForm.notes
      });

      setDocForm({ documentType: 'tax_clearance', notes: '', file: null });
      setFileInputKey(k => k + 1);
      setSuccess('Supplier document uploaded.');
      await loadDocuments(selectedSupplier.id);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function downloadDocument(doc: SupplierDocument) {
    if (!selectedSupplier) return;

    setError('');
    setSuccess('');

    try {
      await downloadSupplierDocument(selectedSupplier.id, doc.id, doc.original_filename);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="grid">
      <div>
        <h1 className="page-title">Suppliers</h1>
        <p className="muted">Register, risk-score, monitor suppliers, and store supplier compliance documents.</p>
      </div>

      <ErrorBox error={error} />
      <SuccessBox message={success} />

      <div className="grid cols-2">
        <form className="card form" onSubmit={submit}>
          <h3>New supplier</h3>

          <div className="field">
            <label>Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div className="field">
            <label>NUIT</label>
            <input value={form.nif} onChange={e => setForm({ ...form, nif: e.target.value })} />
          </div>

          <div className="field">
            <label>Email</label>
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>

          <div className="field">
            <label>Category</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              <option value="goods">Goods</option>
              <option value="services">Services</option>
              <option value="works">Works</option>
            </select>
          </div>

          <label>
            <input
              type="checkbox"
              checked={form.local_supplier}
              onChange={e => setForm({ ...form, local_supplier: e.target.checked })}
            />{' '}
            Local supplier
          </label>

          <button className="btn">Create supplier</button>
        </form>

        <form className="card form" onSubmit={submitDocument}>
          <h3>Supplier documents</h3>
          <p className="muted">
            {selectedSupplier ? `Selected: ${selectedSupplier.name}` : 'Select a supplier from the table below to upload documents.'}
          </p>

          <div className="field">
            <label>Document type</label>
            <select
              value={docForm.documentType}
              onChange={e => setDocForm({ ...docForm, documentType: e.target.value })}
              disabled={!selectedSupplier}
            >
              {documentTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Document file</label>
            <input
              key={fileInputKey}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              disabled={!selectedSupplier}
              onChange={e => setDocForm({ ...docForm, file: e.target.files?.[0] || null })}
            />
          </div>

          <div className="field">
            <label>Notes</label>
            <textarea
              value={docForm.notes}
              onChange={e => setDocForm({ ...docForm, notes: e.target.value })}
              disabled={!selectedSupplier}
              placeholder="Optional notes about this document"
            />
          </div>

          <button className="btn" disabled={!selectedSupplier || !docForm.file}>
            Upload document
          </button>
        </form>
      </div>

      <div className="card table-wrap">
        <h3>Registered suppliers</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>NUIT</th>
              <th>Category</th>
              <th>Local</th>
              <th>Risk</th>
              <th>Status</th>
              <th>Documents</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(s => (
              <tr key={s.id}>
                <td>{s.name}<div className="muted">{s.email}</div></td>
                <td>{s.nif}</td>
                <td>{s.category}</td>
                <td>{s.local_supplier ? 'Yes' : 'No'}</td>
                <td>{s.risk_score}</td>
                <td><span className="badge">{s.status}</span></td>
                <td>
                  <button className="btn secondary" type="button" onClick={() => selectSupplier(s)}>
                    Manage documents
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSupplier && (
        <div className="card table-wrap">
          <h3>Documents for {selectedSupplier.name}</h3>

          {documents.length === 0 ? (
            <p className="muted">No documents uploaded yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th>Uploaded</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id}>
                    <td>{doc.original_filename}<div className="muted">{doc.notes}</div></td>
                    <td>{doc.document_type}</td>
                    <td>{formatSize(doc.size_bytes)}</td>
                    <td><span className="badge">{doc.verification_status}</span></td>
                    <td>{new Date(doc.created_at).toLocaleDateString('en-GB')}</td>
                    <td>
                      <button className="btn secondary" type="button" onClick={() => downloadDocument(doc)}>
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
