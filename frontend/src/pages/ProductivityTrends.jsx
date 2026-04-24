import React, { useState, useEffect } from 'react';
import { BarChart2, Mail, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import './Dashboard.css';

const productivityData = [
    { day: 'Mon', tasks: 4 }, { day: 'Tue', tasks: 7 }, { day: 'Wed', tasks: 5 },
    { day: 'Thu', tasks: 12 }, { day: 'Fri', tasks: 8 }, { day: 'Sat', tasks: 3 }, { day: 'Sun', tasks: 9 },
];
const emailCategoryData = [
    { category: 'Work', count: 45 }, { category: 'Updates', count: 30 },
    { category: 'Personal', count: 12 }, { category: 'Spam', count: 8 },
];
const PIE_COLORS = ['#7C3AED', '#10B981', '#F59E0B'];

const CircularProgress = ({ pct, color, size = 88, stroke = 7, label, value }) => {
    const r = (size - stroke * 2) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    return (
        <div className="circ-wrapper">
            <svg width={size} height={size}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(124,58,237,0.08)" strokeWidth={stroke} />
                <motion.circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none" stroke={color} strokeWidth={stroke}
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                />
                <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill={color} fontSize="14" fontWeight="800">
                    {value ?? `${pct}%`}
                </text>
            </svg>
            <div className="circ-label">{label}</div>
        </div>
    );
};

const ProductivityTrends = () => {
    const [stats, setStats] = useState({ totalTasks: 0, completedTasks: 0, pendingTasks: 0, highPriorityTasks: 0 });

    useEffect(() => {
        axios.get('/api/dashboard')
            .then(res => setStats(res.data))
            .catch(() => {});
    }, []);

    const completionPct = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
    const pendingPct = stats.totalTasks > 0 ? Math.round((stats.pendingTasks / stats.totalTasks) * 100) : 0;

    const pieData = [
        { name: 'Completed', value: stats.completedTasks },
        { name: 'Pending', value: stats.pendingTasks },
        { name: 'High Priority', value: stats.highPriorityTasks },
    ];

    return (
        <div className="page-container dashboard-page">
            <header className="page-header dash-hero">
                <div>
                    <h1 className="grad-text">Productivity Trends 📈</h1>
                    <p>Deep dive into your workflow and task completion patterns.</p>
                </div>
            </header>

            <div className="dash-main-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                <motion.div className="dashboard-panel chart-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <div className="panel-header-flex">
                        <h3><span className="panel-icon"><BarChart2 size={15} /></span> Productivity Trends</h3>
                        <span className="smart-chip">Weekly</span>
                    </div>
                    <p className="chart-insight">Productivity drops after 7 PM. Tackle hard tasks earlier.</p>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={productivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(124,58,237,0.1)" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-3)' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }} itemStyle={{ color: 'var(--purple)', fontWeight: 'bold' }} />
                                <Line type="monotone" dataKey="tasks" stroke="var(--purple)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, fill: 'var(--purple)' }} animationDuration={1500} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                <motion.div className="dashboard-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <div className="panel-header-flex">
                        <h3><span className="panel-icon"><Target size={15} /></span> Today's Score</h3>
                        <span className="smart-chip">Live</span>
                    </div>
                    <div className="circ-row" style={{ marginTop: '2rem' }}>
                        <CircularProgress pct={completionPct} color="#10B981" label="Completed" size={76} stroke={6} />
                        <CircularProgress pct={pendingPct} color="#F59E0B" label="Pending" size={76} stroke={6} />
                        <CircularProgress pct={stats.highPriorityTasks > 0 ? 100 : 0} color="#DC2626" label="Urgent" value={stats.highPriorityTasks} size={76} stroke={6} />
                    </div>

                    {stats.totalTasks > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                            <ResponsiveContainer width={150} height={150}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="pie-legend">
                                {pieData.map((d, i) => (
                                    <div key={i} className="pie-legend-item">
                                        <div className="pie-dot" style={{ background: PIE_COLORS[i] }} />
                                        <span>{d.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>

                <motion.div className="dashboard-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <div className="panel-header-flex">
                        <h3><span className="panel-icon"><Mail size={15} /></span> Email Categories</h3>
                    </div>
                    <div className="chart-container" style={{ marginTop: '2rem' }}>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={emailCategoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(124,58,237,0.1)" />
                                <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-3)' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                                <Tooltip cursor={{ fill: 'rgba(124,58,237,0.05)' }} contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }} />
                                <Bar dataKey="count" fill="var(--teal)" radius={[4, 4, 0, 0]} animationDuration={1500} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ProductivityTrends;
