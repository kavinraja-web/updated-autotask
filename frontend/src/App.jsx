import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import EmailAnalysis from './pages/EmailAnalysis';
import AutoTaskList from './pages/AutoTaskList';
import Reminders from './pages/Reminders';
import Login from './pages/Login';
import ProductivityTrends from './pages/ProductivityTrends';
import AiInsights from './pages/AiInsights';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('google_id_token');
    const email = localStorage.getItem('user_email');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      if (email) axios.defaults.headers.common['X-User-Email'] = email;
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (credentialResponse) => {
    const idToken = credentialResponse.credential;
    const email = credentialResponse.email;

    try {
      // Save token in axios headers so API calls work
      axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`;
      localStorage.setItem('google_id_token', idToken);

      if (email) {
        axios.defaults.headers.common['X-User-Email'] = email;
        localStorage.setItem('user_email', email);
      }

      // Tell backend about this user so they get saved to the DB
      await axios.post('/api/auth/google', {
        idToken,
        accessToken: credentialResponse.accessToken
      });

      setIsAuthenticated(true);
    } catch (err) {
      console.error('Backend login failed:', err);
      setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('google_id_token');
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('user_email');
    delete axios.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['X-User-Email'];
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
        <span className="app-loading-text">Loading SmartTask AI…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Layout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/trends" element={<ProductivityTrends />} />
          <Route path="/dashboard/insights" element={<AiInsights />} />
          <Route path="/emails" element={<EmailAnalysis />} />
          <Route path="/tasks" element={<AutoTaskList />} />
          <Route path="/reminders" element={<Reminders />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
