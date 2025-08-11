import { useEffect, useState } from 'react';
import './App.css';

// --- page components ---
function Dashboard() { return <div>Dashboard</div>; }
function Monthly() { return <div>Monthly</div>; }
function Yearly() { return <div>Yearly</div>; }
function ImportCsv() { return <div>Import CSV</div>; }
function Rules() { return <div>Rules</div>; }
function Transactions() { return <div>Transactions</div>; }
function Prefs() { return <div>Prefs</div>; }

export default function App() {
  const [page, setPage] = useState(() => window.location.hash.slice(1) || 'dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const handler = () => setPage(window.location.hash.slice(1) || 'dashboard');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = (p) => {
    window.location.hash = p;
    if (window.innerWidth < 768) setDrawerOpen(false);
  };

  const Page = {
    dashboard: Dashboard,
    monthly: Monthly,
    yearly: Yearly,
    importcsv: ImportCsv,
    rules: Rules,
    transactions: Transactions,
    prefs: Prefs,
  }[page] || Dashboard;

  return (
    <div className="flex h-screen">
      {/* Drawer */}
      <nav
        className={`fixed inset-y-0 left-0 w-64 bg-white border-r p-4 transform transition-transform md:relative md:translate-x-0 md:flex-shrink-0 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <ul className="space-y-2">
          <li><a href="#dashboard" onClick={() => navigate('dashboard')}>Dashboard</a></li>
          <li><a href="#monthly" onClick={() => navigate('monthly')}>Monthly</a></li>
          <li><a href="#yearly" onClick={() => navigate('yearly')}>Yearly</a></li>
          <li><a href="#importcsv" onClick={() => navigate('importcsv')}>Import CSV</a></li>
          <li><a href="#rules" onClick={() => navigate('rules')}>Rules</a></li>
          <li><a href="#transactions" onClick={() => navigate('transactions')}>Transactions</a></li>
          <li><a href="#prefs" onClick={() => navigate('prefs')}>Prefs</a></li>
        </ul>
      </nav>

      {/* Overlay for mobile */}
      {drawerOpen && <div className="fixed inset-0 bg-black/20 md:hidden" onClick={() => setDrawerOpen(false)}></div>}

      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-64">
        <header className="md:hidden p-2 border-b">
          <button onClick={() => setDrawerOpen(true)} aria-label="open menu">☰</button>
        </header>
        <main className="p-4 flex-1 overflow-y-auto">
          <Page />
        </main>
      </div>
    </div>
  );
}
