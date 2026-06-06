import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearToken } from '../api';

export function AppShell() {
  const navigate = useNavigate();
  function logout() {
    clearToken();
    navigate('/login');
  }

  return <div className="app">
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">IFP</div>
        <div>
          <h1>Procurement SaaS</h1>
          <p>Inhamizua</p>
        </div>
      </div>
      <nav className="nav">
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/suppliers">Suppliers</NavLink>
        <NavLink to="/tenders">Tenders</NavLink>
        <NavLink to="/bids">Bids</NavLink>
        <NavLink to="/contracts">Contracts</NavLink>
        <NavLink to="/invoices">Invoices</NavLink>
        <NavLink to="/analyzer">AI Analyzer</NavLink>
      </nav>
      <button className="btn secondary" onClick={logout}>Logout</button>
    </aside>
    <main className="main">
      <header className="topbar">
        <div>
          <strong>Instituto de Formação de Professores de Inhamizua</strong>
          <div className="muted">Procurement, contracts, supplier selection and invoicing</div>
        </div>
        <span className="badge">MVP Ready</span>
      </header>
      <section className="content"><Outlet /></section>
    </main>
  </div>;
}
