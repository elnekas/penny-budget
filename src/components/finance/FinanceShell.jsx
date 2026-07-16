import React, { useState, createContext } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { Gauge, TrendingUp, PieChart, History } from 'lucide-react';
import PennyDock from '@/components/budget/PennyDock';

export const PennyActionContext = createContext({ action: null, clear: () => {} });

const TABS = [
  { to: '/budget', label: 'Cockpit', icon: Gauge },
  { to: '/riseup-dashboard', label: 'Insights', icon: TrendingUp },
  { to: '/riseup-analytics', label: 'Analytics', icon: PieChart }
];

export default function FinanceShell() {
  const [action, setAction] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleUiAction = (a) => {
    setAction({ ...a, _ts: Date.now() });
    if (location.pathname !== '/budget') navigate('/budget');
  };

  return (
    <PennyActionContext.Provider value={{ action, clear: () => setAction(null) }}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3">
            <nav className="flex items-center gap-1 bg-slate-100/80 rounded-full p-1">
              {TABS.map(t => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  className={({ isActive }) => `flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <t.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                </NavLink>
              ))}
            </nav>
            <Link to="/classic" className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600">
              <History className="w-3.5 h-3.5" /> Classic
            </Link>
          </div>
        </header>
        <Outlet />
        <PennyDock onUiAction={handleUiAction} />
      </div>
    </PennyActionContext.Provider>
  );
}