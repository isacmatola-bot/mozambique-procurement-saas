import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, setToken } from '../api';
import { ErrorBox } from '../ui/Status';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@procurement.mz');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const result = await login(email, password);
      setToken(result.token);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return <div className="login-screen">
    <form className="login-card form" onSubmit={submit}>
      <div className="logo">IFP</div>
      <div>
        <h1>Procurement SaaS</h1>
        <p className="muted">Login to manage suppliers, tenders, contracts and invoices.</p>
      </div>
      <ErrorBox error={error} />
      <div className="field"><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} /></div>
      <div className="field"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
      <button className="btn" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
      <p className="muted">Demo: admin@procurement.mz / admin123</p>
    </form>
  </div>;
}
