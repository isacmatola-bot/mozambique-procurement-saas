const API_URL = '/api';

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
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
