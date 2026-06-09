const API_URL = import.meta.env.VITE_API_URL || '/api';

export type User = {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  role: string;
};

export function getToken() {
  return localStorage.getItem('mozproc_token');
}

export function setToken(token: string) {
  localStorage.setItem('mozproc_token', token);
}

export function clearToken() {
  localStorage.removeItem('mozproc_token');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function login(email: string, password: string) {
  return api<{ token: string; user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export type AiRecommendation = {
  id: string;
  tender_id: string;
  supplier_id: string;
  supplier_name: string;
  score: string;
  rank: number;
  risk_level: string;
  reasons: string[];
  warnings: string[];
  model_used: string;
  status: string;
  created_at: string;
};

export type AiRecommendationsResponse = {
  tenderId?: string;
  count?: number;
  recommendations: AiRecommendation[];
};

export async function runAiRecommendations(tenderId: string) {
  return api<AiRecommendationsResponse>('/ai/recommendations/run', {
    method: 'POST',
    body: JSON.stringify({ tenderId })
  });
}

export async function getAiRecommendations(tenderId: string) {
  return api<AiRecommendationsResponse>(`/ai/tenders/${tenderId}/recommendations`);
}

export async function approveAiRecommendation(recommendationId: string, officerReason: string) {
  return api<{ approval: unknown }>(`/ai/recommendations/${recommendationId}/decision`, {
    method: 'POST',
    body: JSON.stringify({
      decision: 'approved',
      officerReason
    })
  });
}

export async function recordSupplierPerformance(input: {
  supplierId: string;
  tenderId: string;
  deliveryScore: number;
  qualityScore: number;
  complianceScore: number;
  timelinessScore: number;
  notes: string;
}) {
  return api<{ performance: unknown }>('/ai/performance', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export type SupplierDocument = {
  id: string;
  supplier_id: string;
  document_type: string;
  original_filename: string;
  mime_type?: string;
  size_bytes?: string | number;
  verification_status: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export async function getSupplierDocuments(supplierId: string) {
  return api<SupplierDocument[]>(`/suppliers/${supplierId}/documents`);
}

export async function uploadSupplierDocument(
  supplierId: string,
  input: { file: File; documentType: string; notes?: string }
) {
  const formData = new FormData();
  formData.append('document', input.file);
  formData.append('document_type', input.documentType);
  if (input.notes) formData.append('notes', input.notes);

  return api<SupplierDocumentUploadResponse>(`/suppliers/${supplierId}/documents`, {
    method: 'POST',
    body: formData
  });
}

export async function downloadSupplierDocument(
  supplierId: string,
  documentId: string,
  filename: string
) {
  const token = getToken();

  const response = await fetch(`${API_URL}/suppliers/${supplierId}/documents/${documentId}/download`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Download failed: ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function updateSupplierDocumentStatus(
  supplierId: string,
  documentId: string,
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'expired',
  notes?: string
) {
  return api<SupplierDocument>(`/suppliers/${supplierId}/documents/${documentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      verification_status: verificationStatus,
      notes
    })
  });
}

export type SupplierDocumentAiRecommendation = {
  document_id: string;
  supplier_id: string;
  supplier_name: string;
  original_filename: string;
  document_type: string;
  current_status: string;
  recommended_status: 'verified' | 'rejected' | 'expired';
  confidence: number;
  reasons: string[];
  warnings: string[];
  model: string;
  provider: string;
};

export type SupplierDocumentAiValidation = {
  id: string;
  supplier_id: string;
  document_id: string;
  recommended_status: 'verified' | 'rejected' | 'expired';
  confidence: string | number;
  reasons: string[];
  warnings: string[];
  provider: string;
  created_at: string;
};

export type SupplierDocumentNotification = {
  id: string;
  supplier_id: string;
  document_id: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'in_app';
  recipient?: string | null;
  subject?: string | null;
  message: string;
  status: string;
  provider?: string | null;
  created_at: string;
};

export type SupplierDocumentUploadResponse = SupplierDocument & {
  ai_recommendation?: SupplierDocumentAiRecommendation;
  ai_validation?: SupplierDocumentAiValidation;
  notification?: SupplierDocumentNotification;
};

export async function aiValidateSupplierDocument(supplierId: string, documentId: string) {
  return api<{ recommendation: SupplierDocumentAiRecommendation }>(
    `/suppliers/${supplierId}/documents/${documentId}/ai-validate`,
    { method: 'POST' }
  );
}

