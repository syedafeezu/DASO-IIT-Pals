import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import KioskPage from './pages/KioskPage';
import StaffPage from './pages/StaffPage';
import AdminPage from './pages/AdminPage';

// Landing page for navigation convenience
const Landing = () => (
  <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white space-y-8">
    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
      DASO System Prototype
    </h1>
    <div className="flex gap-8">
      <Link to="/kiosk" className="px-8 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold border border-gray-700 hover:border-blue-500 transition-all">
        Open Kiosk View
      </Link>
      <Link to="/staff" className="px-8 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold border border-gray-700 hover:border-blue-500 transition-all">
        Open Staff Dashboard
      </Link>
      <Link to="/admin" className="px-8 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold border border-gray-700 hover:border-blue-500 transition-all">
        Open Manager Analytics
      </Link>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/kiosk" element={<KioskPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Router>
  );
}

export default App;
