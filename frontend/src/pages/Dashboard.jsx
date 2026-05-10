import React, { useState, useEffect, useRef } from 'react';
import {
    Plus, Bell, Settings, Sparkles, TrendingUp, CheckCircle2,
    Clock, Calendar, MoreHorizontal, ChevronRight, Play,
    Mail, Database, Gift, AlarmClock, BarChart3, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

/* ═══════════ Mini Sparkline (pure CSS wave) ═══════════ */
const Sparkline = ({ color }) => (
    <svg className="db-sparkline" viewBox="0 0 120 36" fill="none">
        <polyline
            points="0,28 15,18 30,24 45,10 60,16 75,8 90,14 105,6 120,12"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.85"
        />
    </svg>
);

/* ═══════════ Stat Card ═══════════ */
const StatCard = ({ title, value, trend, trendUp, icon, iconBg, sparkColor, delay }) => (
    <motion.div
        className="db-stat-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
        whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(0,0,0,0.09)' }}
    >
        <div className="db-stat-top">
            <div className="db-stat-icon" style={{ background: iconBg }}>{icon}</div>
            <span className="db-stat-title">{title}</span>
        </div>
        <div className="db-stat-value">{value}</div>
        <div className="db-stat-meta">
            <span className={`db-trend ${trendUp ? 'up' : 'down'}`}>
                <TrendingUp size={11} /> {trend}
            </span>
            <span className="db-vs">vs last 30 days</span>
        </div>
        <Sparkline color={sparkColor} />
    </motion.div>
);

/* ═══════════ Template Row ═══════════ */
const TemplateRow = ({ icon, iconBg, name, schedule, uses }) => (
    <div className="db-tpl-row">
        <div className="db-tpl-icon" style={{ background: iconBg }}>{icon}</div>
        <div className="db-tpl-info">
            <span className="db-tpl-name">{name}</span>
            <span className="db-tpl-sched">{schedule}</span>
        </div>
        <span className="db-tpl-uses">{uses}</span>
        <button className="db-tpl-use-btn">Use</button>
    </div>
);

/* ═══════════ Task Row ═══════════ */
const TaskRow = ({ icon, iconBg, name, schedule, status, lastRun }) => (
    <div className="db-task-row">
        <div className="db-task-info">
            <div className="db-task-icon" style={{ background: iconBg }}>{icon}</div>
            <span className="db-task-name">{name}</span>
        </div>
        <span className="db-task-sched">{schedule}</span>
        <span className={`db-task-status status-${status.toLowerCase()}`}>{status}</span>
        <span className="db-task-lastrun">{lastRun}</span>
        <button className="db-task-more"><MoreHorizontal size={15} /></button>
    </div>
);

/* ═══════════ Activity Item ═══════════ */
const ActivityItem = ({ icon, iconBg, text, time }) => (
    <div className="db-activity-item">
        <div className="db-activity-dot" style={{ background: iconBg }}>{icon}</div>
        <div className="db-activity-info">
            <p className="db-activity-text" dangerouslySetInnerHTML={{ __html: text }} />
            <span className="db-activity-time">{time}</span>
        </div>
    </div>
);

/* ═══════════ Dashboard Page ═══════════ */
const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ totalTasks: 0, completedTasks: 0, pendingTasks: 0, highPriorityTasks: 0 });
    const [prompt, setPrompt] = useState('');
    const [realTasks, setRealTasks] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [showNotifs, setShowNotifs] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [genMsg, setGenMsg] = useState('');

    const fetchData = () => {
        axios.get('/api/dashboard').then(res => setStats(res.data)).catch(() => {});
        axios.get('/api/tasks').then(res => setRealTasks(Array.isArray(res.data) ? res.data.slice(0,5) : [])).catch(() => {});
        axios.get('/api/notifications/unread').then(res => setNotifications(Array.isArray(res.data) ? res.data : [])).catch(() => {});
    };

    useEffect(() => { fetchData(); }, []);

    const handleGenerate = async () => {
        if (!prompt.trim() || generating) return;
        setGenerating(true);
        setGenMsg('');
        try {
            await axios.post('/api/tasks', {
                title: prompt.trim(),
                description: `AI generated task: ${prompt.trim()}`,
                priority: 'Medium',
                status: 'Pending',
                deadline: new Date(Date.now() + 86400000).toISOString().slice(0, 19)
            });
            setGenMsg('✅ Task created: "' + prompt.trim() + '"');
            setPrompt('');
            setTimeout(() => { fetchData(); setGenMsg(''); }, 3000);
        } catch {
            setGenMsg('❌ Failed to create task. Please try again.');
            setTimeout(() => setGenMsg(''), 3000);
        } finally {
            setGenerating(false);
        }
    };

    const handleMarkAllRead = async () => {
        try { await axios.put('/api/notifications/read-all'); setNotifications([]); } catch {}
    };

    const handleMarkRead = async (id) => {
        try { await axios.put(`/api/notifications/${id}/read`); setNotifications(prev => prev.filter(n => n.id !== id)); } catch {}
    };

    const userEmail = localStorage.getItem('user_email') || 'user@example.com';
    const userName = userEmail.split('@')[0];
    const initials = userName.charAt(0).toUpperCase();

    const templates = [
        { icon: <AlarmClock size={14} />, iconBg: 'rgba(124,58,237,0.12)', name: 'Daily Standup Reminder', schedule: 'Runs daily at 09:00 AM', uses: '12.4K uses' },
        { icon: <Mail size={14} />, iconBg: 'rgba(59,130,246,0.12)', name: 'Weekly Report Email', schedule: 'Runs every Monday at 10:00 AM', uses: '8.7K uses' },
        { icon: <Database size={14} />, iconBg: 'rgba(16,185,129,0.12)', name: 'Database Backup', schedule: 'Runs daily at 02:00 AM', uses: '6.1K uses' },
        { icon: <Gift size={14} />, iconBg: 'rgba(245,158,11,0.12)', name: 'Birthday Wishes', schedule: 'Runs on event day at 09:00 AM', uses: '4.3K uses' },
    ];

    const tasks = [
        { icon: <AlarmClock size={14} />, iconBg: 'rgba(124,58,237,0.12)', name: 'Daily Standup Reminder', schedule: 'Every day, 09:00 AM', status: 'Completed', lastRun: 'Today, 09:00 AM' },
        { icon: <Mail size={14} />, iconBg: 'rgba(59,130,246,0.12)', name: 'Weekly Report Email', schedule: 'Every Mon, 10:00 AM', status: 'Completed', lastRun: 'Mon, 10:00 AM' },
        { icon: <Database size={14} />, iconBg: 'rgba(16,185,129,0.12)', name: 'Database Backup', schedule: 'Every day, 02:00 AM', status: 'Pending', lastRun: 'Today, 02:00 AM' },
        { icon: <Calendar size={14} />, iconBg: 'rgba(99,102,241,0.12)', name: 'Monthly Analytics Report', schedule: '1st of every month, 11:00 AM', status: 'Scheduled', lastRun: '–' },
        { icon: <Gift size={14} />, iconBg: 'rgba(245,158,11,0.12)', name: 'Birthday Wishes', schedule: 'On event day, 09:00 AM', status: 'Completed', lastRun: 'Today, 09:00 AM' },
    ];

    const activity = [
        { icon: <CheckCircle2 size={12} />, iconBg: '#10B981', text: 'Task <strong>"Daily Standup Reminder"</strong> completed', time: 'Today, 09:00 AM' },
        { icon: <Mail size={12} />, iconBg: '#3B82F6', text: 'Task <strong>"Weekly Report Email"</strong> completed', time: 'Mon, 10:00 AM' },
        { icon: <Database size={12} />, iconBg: '#F59E0B', text: 'Task <strong>"Database Backup"</strong> is pending', time: 'Today, 02:00 AM' },
        { icon: <Calendar size={12} />, iconBg: '#6366F1', text: 'Task <strong>"Monthly Analytics Report"</strong> scheduled', time: 'May 1, 11:00 AM' },
    ];

    const examples = ['Daily standup reminder', 'Weekly report generation', 'Backup database every night', 'Send birthday wishes'];

    return (
        <div className="db-page">

            {/* ── Top Bar ── */}
            <div className="db-topbar">
                <div className="db-topbar-left">
                    <h1 className="db-page-title">Dashboard</h1>
                    <p className="db-page-sub">Generate, manage and automate your tasks with ease.</p>
                </div>
                <div className="db-topbar-right">
                    <button className="db-create-btn" onClick={() => navigate('/tasks')}>
                        <Plus size={16} /> Create New
                    </button>
                    <div style={{ position: 'relative' }}>
                        <button className="db-icon-btn-top" onClick={() => setShowNotifs(v => !v)}>
                            <Bell size={17} />
                            {notifications.length > 0 && <span className="db-notif-dot" style={{ position:'absolute',top:4,right:4,background:'#ef4444',borderRadius:'50%',width:8,height:8 }} />}
                        </button>
                        <AnimatePresence>
                        {showNotifs && (
                            <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                                style={{ position:'absolute',right:0,top:'110%',width:300,background:'white',borderRadius:12,boxShadow:'0 8px 30px rgba(0,0,0,0.15)',zIndex:999,border:'1px solid #e2e8f0',overflow:'hidden' }}>
                                <div style={{ padding:'0.75rem 1rem',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                                    <span style={{fontWeight:700,fontSize:'0.9rem'}}>Notifications ({notifications.length})</span>
                                    {notifications.length > 0 && <button onClick={handleMarkAllRead} style={{fontSize:'0.75rem',color:'#8b5cf6',background:'none',border:'none',cursor:'pointer',fontWeight:600}}>Mark all read</button>}
                                </div>
                                <div style={{ maxHeight:260,overflowY:'auto' }}>
                                    {notifications.length === 0 ? (
                                        <div style={{padding:'1.5rem',textAlign:'center',color:'#64748b',fontSize:'0.85rem'}}>All caught up! 🎉</div>
                                    ) : notifications.map(n => (
                                        <div key={n.id} style={{padding:'0.75rem 1rem',borderBottom:'1px solid #f8fafc',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'0.5rem'}}>
                                            <div>
                                                <div style={{fontSize:'0.83rem',fontWeight:600,color:'#1e293b',marginBottom:'0.15rem'}}>{n.message}</div>
                                                <div style={{fontSize:'0.72rem',color:'#94a3b8'}}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Recently'}</div>
                                            </div>
                                            <button onClick={() => handleMarkRead(n.id)} style={{background:'none',border:'none',color:'#94a3b8',cursor:'pointer',flexShrink:0}}><X size={14}/></button>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>
                    <button className="db-icon-btn-top"><Settings size={17} /></button>
                </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="db-stat-grid">
                <StatCard title="Tasks Generated" value={stats.totalTasks ?? 0} trend="18.5%" trendUp icon={<BarChart3 size={18} />} iconBg="rgba(124,58,237,0.12)" sparkColor="#7c3aed" delay={0} />
                <StatCard title="Tasks Completed" value={stats.completedTasks ?? 0} trend="16.3%" trendUp icon={<CheckCircle2 size={18} />} iconBg="rgba(59,130,246,0.12)" sparkColor="#3b82f6" delay={0.06} />
                <StatCard title="Pending Tasks" value={stats.pendingTasks ?? 0} trend="8.7%" trendUp icon={<Clock size={18} />} iconBg="rgba(16,185,129,0.12)" sparkColor="#10b981" delay={0.12} />
                <StatCard title="Schedules Active" value={stats.highPriorityTasks ?? 0} trend="4.2%" trendUp icon={<Calendar size={18} />} iconBg="rgba(245,158,11,0.12)" sparkColor="#f59e0b" delay={0.18} />
            </div>

            {/* ── Middle Row ── */}
            <div className="db-mid-row">

                {/* Generate Tasks Panel */}
                <motion.div
                    className="db-generate-panel"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <div className="db-gen-header">
                        <div className="db-gen-icon"><Sparkles size={20} /></div>
                        <div>
                            <h3 className="db-gen-title">Generate Tasks Automatically</h3>
                            <p className="db-gen-sub">Describe what you want to automate and let AI create tasks for you.</p>
                        </div>
                    </div>
                    <div className="db-gen-input-row">
                        <input
                            className="db-gen-input"
                            type="text"
                            placeholder="Example: Create a task every Monday to send a progress report email"
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                        />
                        <button className="db-gen-btn" onClick={handleGenerate} disabled={generating || !prompt.trim()}>
                            <Sparkles size={14} /> {generating ? 'Creating...' : 'Generate'}
                        </button>
                    </div>
                    {genMsg && <p style={{ fontSize: '0.82rem', marginTop: '0.5rem', color: genMsg.startsWith('✅') ? '#10b981' : '#ef4444', fontWeight: 600 }}>{genMsg}</p>}
                    <p className="db-examples-label">Try these examples:</p>
                    <div className="db-examples-row">
                        {examples.map((ex, i) => (
                            <button key={i} className="db-example-chip" onClick={() => setPrompt(ex)}>
                                {ex}
                            </button>
                        ))}
                        <button className="db-example-chip db-more-chip"><MoreHorizontal size={14} /></button>
                    </div>
                </motion.div>

                {/* Popular Templates */}
                <motion.div
                    className="db-panel"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.25 }}
                >
                    <div className="db-panel-header">
                        <h3 className="db-panel-title">Popular Templates</h3>
                        <button className="db-view-all">View all</button>
                    </div>
                    <div className="db-tpl-list">
                        {templates.map((t, i) => <TemplateRow key={i} {...t} />)}
                    </div>
                </motion.div>
            </div>

            {/* ── Bottom Row ── */}
            <div className="db-bot-row">

                {/* Recent Tasks */}
                <motion.div
                    className="db-panel"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <div className="db-panel-header">
                        <h3 className="db-panel-title">Recent Tasks</h3>
                        <button className="db-view-all">View all</button>
                    </div>
                    <div className="db-tasks-table">
                        <div className="db-tasks-header">
                            <span>Task Name</span><span>Priority</span><span>Status</span><span>Created</span><span />
                        </div>
                        {realTasks.length === 0 ? (
                            <div style={{padding:'1.5rem',textAlign:'center',color:'#64748b',fontSize:'0.85rem'}}>No tasks yet. Use Generate above to create your first task!</div>
                        ) : realTasks.map((t, i) => (
                            <div key={t.id || i} className="db-task-row">
                                <div className="db-task-info">
                                    <div className="db-task-icon" style={{background:'rgba(139,92,246,0.1)'}}><CheckCircle2 size={14} color="#8b5cf6" /></div>
                                    <span className="db-task-name">{t.title}</span>
                                </div>
                                <span className="db-task-sched" style={{color: t.priority==='High'?'#ef4444': t.priority==='Low'?'#10b981':'#f59e0b', fontWeight:600}}>{t.priority || 'Medium'}</span>
                                <span className={`db-task-status status-${(t.status||'pending').toLowerCase()}`}>{t.status || 'Pending'}</span>
                                <span className="db-task-lastrun">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '-'}</span>
                                <button className="db-task-more"><MoreHorizontal size={15} /></button>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Activity Feed */}
                <motion.div
                    className="db-panel"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.35 }}
                >
                    <div className="db-panel-header">
                        <h3 className="db-panel-title">Activity Feed</h3>
                        <button className="db-view-all">View all</button>
                    </div>
                    <div className="db-activity-list">
                        {notifications.length === 0 && realTasks.length === 0 ? (
                            <div style={{padding:'1rem',textAlign:'center',color:'#64748b',fontSize:'0.85rem'}}>No recent activity yet.</div>
                        ) : [
                            ...notifications.slice(0,4).map((n, i) => (
                                <ActivityItem key={`n-${i}`} icon={<Bell size={12}/>} iconBg="#8b5cf6" text={n.message || 'New notification'} time={n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Recently'} />
                            )),
                            ...realTasks.slice(0, Math.max(0, 4 - notifications.slice(0,4).length)).map((t, i) => (
                                <ActivityItem key={`t-${i}`} icon={<CheckCircle2 size={12}/>} iconBg="#10b981" text={`Task <strong>${t.title}</strong> ${t.status === 'Completed' ? 'completed' : 'created'}`} time={t.createdAt ? new Date(t.createdAt).toLocaleString() : 'Recently'} />
                            ))
                        ]}
                    </div>
                </motion.div>
            </div>

            {/* ── Promo Banner ── */}
            <motion.div
                className="db-promo-banner"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
            >
                <div className="db-promo-bot-icon">
                    <Sparkles size={28} />
                </div>
                <div className="db-promo-text">
                    <h4>Automate more. Worry less.</h4>
                    <p>Let AutoTask handle the boring stuff so you can focus on what matters.</p>
                </div>
                <button className="db-promo-btn" onClick={() => navigate('/tasks')}>
                    <Play size={14} fill="currentColor" /> Explore Integrations
                </button>
            </motion.div>

        </div>
    );
};

export default Dashboard;
