import React, { useState, useEffect } from 'react';
import {
    CheckCircle, Clock, AlertTriangle, Layers, Sun, Sunset, Moon, Coffee, Sparkles,
    Zap, RefreshCw, Bell, Mail, WifiOff, ChevronRight, Target, TrendingUp, TrendingDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import HighPriorityFocus from '../components/HighPriorityFocus';
import './Dashboard.css';
import './Dashboard.css';



/* ─── Stat Card ──────────────────────────────────── */
const StatCard = ({ title, value, icon, colorClass, trend, trendVal, trendUp, delay = '0s', onClick }) => (
    <motion.div
        className={`dashboard-card ${colorClass}`}
        style={{ animationDelay: delay, cursor: onClick ? 'pointer' : 'default' }}
        onClick={onClick}
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: parseFloat(delay) }}
    >
        <div className="card-header">
            <span className="card-title">{title}</span>
            <div className="card-icon">{icon}</div>
        </div>
        <div className="card-value">{value}</div>
        <div className="card-footer-flex">
            {trendVal && (
                <span className={`trend-pill ${trendUp ? 'trend-up' : 'trend-down'}`}>
                    {trendUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {trendVal}
                </span>
            )}
            {trend && <div className="card-trend">{trend}</div>}
        </div>
    </motion.div>
);


/* ─── Dashboard Page ─────────────────────────────── */
const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ totalTasks: 0, completedTasks: 0, pendingTasks: 0, highPriorityTasks: 0 });
    const [backendStatus, setBackendStatus] = useState('connecting');
    const [recentEmails, setRecentEmails] = useState([]);
    const [greeting, setGreeting] = useState('Good Evening');
    const [greetingIcon, setGreetingIcon] = useState(null);
    const [userName, setUserName] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [showHighPriorityFocus, setShowHighPriorityFocus] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Live clock
    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) { setGreeting('Good Morning'); setGreetingIcon(<Sun size={22} />); }
        else if (hour < 17) { setGreeting('Good Afternoon'); setGreetingIcon(<Coffee size={22} />); }
        else if (hour < 20) { setGreeting('Good Evening'); setGreetingIcon(<Sunset size={22} />); }
        else { setGreeting('Good Night'); setGreetingIcon(<Moon size={22} />); }

        const email = localStorage.getItem('user_email') || '';
        if (email) {
            const namePart = email.split('@')[0];
            setUserName(namePart.charAt(0).toUpperCase() + namePart.slice(1));
        }

        axios.get('/api/dashboard')
            .then(res => { setStats(res.data); setBackendStatus('online'); })
            .catch(() => setBackendStatus('offline'));

        axios.get('/api/tasks')
            .then(res => setTasks(res.data))
            .catch(() => {});

        axios.get('/api/emails')
            .then(res => setRecentEmails(res.data.slice(0, 4)))
            .catch(() => {});
    }, []);

    const completionPct = stats.totalTasks > 0
        ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;


    return (
        <div className="page-container dashboard-page">

            {/* ── Hero Header ── */}
            <motion.header
                className="page-header dash-hero"
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="dash-hero-left">
                    <div className="greeting-icon">{greetingIcon}</div>
                    <div>
                        <h1 className="grad-text">{greeting}, {userName} 👋</h1>
                        <p>Your AI has analyzed your workflow. Here's your intelligent productivity snapshot.</p>
                        <div className="dash-live-time">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                    </div>
                </div>

                {stats.completedTasks > 0 && (
                    <motion.div className="motivational-banner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                        <Sparkles size={14} className="spin-slow" />
                        <span>You completed <strong>{stats.completedTasks} tasks</strong> — keep it up! 🔥</span>
                    </motion.div>
                )}
            </motion.header>

            {/* ── Stat Cards ── */}
            <div className="dashboard-grid">
                <StatCard title="Total Tasks" value={stats.totalTasks} icon={<Layers size={20} />}
                    colorClass="default-card" trend="From Gmail" trendVal="+12%" trendUp delay="0s" />
                <StatCard title="Completed" value={stats.completedTasks} icon={<CheckCircle size={20} />}
                    colorClass="success-card" trend="Completion Rate" trendVal={`${completionPct}%`} trendUp delay="0.08s" />
                <StatCard title="Pending Tasks" value={stats.pendingTasks} icon={<Clock size={20} />}
                    colorClass="warning-card" trend="Need action" trendVal="-2%" delay="0.16s" />
                <StatCard title="High Priority" value={stats.highPriorityTasks} icon={<AlertTriangle size={20} />}
                    colorClass="danger-card" trend="Click to Focus" trendVal="+1" delay="0.24s"
                    onClick={() => setShowHighPriorityFocus(true)} />
            </div>



            {showHighPriorityFocus && <HighPriorityFocus onClose={() => setShowHighPriorityFocus(false)} />}
        </div>
    );
};

export default Dashboard;
