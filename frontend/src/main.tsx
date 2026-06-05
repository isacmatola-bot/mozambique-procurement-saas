import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './styles.css';
import { getToken } from './api';
import { AppShell } from './ui/AppShell';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Suppliers } from './pages/Suppliers';
import { Tenders } from './pages/Tenders';
import { Contracts } from './pages/Contracts';
import { Invoices } from './pages/Invoices';
import { Analyzer } from './pages/Analyzer';

function Protected({ children }: { children: React.ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Protected><AppShell /></Protected>}>
          <Route index element={<Dashboard />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="tenders" element={<Tenders />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="analyzer" element={<Analyzer />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
