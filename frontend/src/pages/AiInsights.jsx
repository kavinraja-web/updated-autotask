import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, TrendingUp, Mic, Zap, Calendar, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import './Dashboard.css';

const AISuggestion = ({ icon, title, desc, type }) => (
    <motion.div
        className={`ai-insight-card ${type}`}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
    >
        <div className="ai-insight-icon">{icon}</div>
        <div>
            <strong>{title}</strong>
            <p>{desc}</p>
        </div>
    </motion.div>
);

const ScheduleItem = ({ time, task, priority }) => {
    const colors = { high: '#DC2626', medium: '#D97706', low: '#059669' };
    return (
        <div className="schedule-item">
            <div className="schedule-time">{time}</div>
            <div className="schedule-dot" style={{ background: colors[priority] || colors.medium }} />
            <div className="schedule-task">{task}</div>
            <div className={`schedule-badge ${priority}`}>{priority}</div>
        </div>
    );
};

const AiInsights = () => {
    const [stats, setStats] = useState({ totalTasks: 0, completedTasks: 0, pendingTasks: 0, highPriorityTasks: 0 });
    const [tasks, setTasks] = useState([]);

    useEffect(() => {
        axios.get('/api/dashboard').then(res => setStats(res.data)).catch(() => {});
        axios.get('/api/tasks').then(res => setTasks(res.data)).catch(() => {});
    }, []);

    const completionPct = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

    const smartSchedule = tasks
        .filter(t => t.status?.toLowerCase() !== 'completed' && t.status !== 'Completed')
        .slice(0, 5)
        .map((t, i) => ({
            time: `${(9 + i * 2) % 24}:00`,
            task: t.title,
            priority: t.priority?.toLowerCase() || 'medium',
        }));

    const aiSuggestions = [
        {
            icon: <AlertTriangle size={14} />, title: 'Action Needed',
            desc: `You have ${stats.highPriorityTasks || 0} urgent tasks. Focus on these first.`,
            type: 'alert',
        },
        {
            icon: <TrendingUp size={14} />, title: 'Momentum',
            desc: `Task completion rate is ${completionPct}%. Keep the streak going!`,
            type: 'positive',
        },
        {
            icon: <Clock size={14} />, title: 'Optimal Focus',
            desc: 'Your peak email replies happen between 2 PM and 4 PM based on history.',
            type: 'neutral',
        },
        {
            icon: <Mic size={14} />, title: 'Voice Assistant',
            desc: 'Try: "Show my tasks" or "How many emails" — click the mic button.',
            type: 'info',
        },
    ];

    return (
        <div className="page-container dashboard-page">
            <header className="page-header dash-hero">
                <div>
                    <h1 className="grad-text">AI Productivity Insights 🧠</h1>
                    <p>Smart suggestions and automated scheduling based on your routines.</p>
                </div>
            </header>

            <div className="dash-main-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
                <motion.div className="ai-insights-panel" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                    <div className="ai-insights-header">
                        <Zap size={18} fill="currentColor" className="ai-pulse-icon" />
                        <h3>AI Recommendations</h3>
                    </div>
                    <div className="ai-insights-grid">
                        {aiSuggestions.map((s, i) => <AISuggestion key={i} {...s} />)}
                    </div>
                </motion.div>

                <motion.div className="dashboard-panel" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                    <div className="panel-header-flex">
                        <h3><span className="panel-icon"><Calendar size={15} /></span> Smart Schedule Generator</h3>
                        <span className="smart-chip">Auto</span>
                    </div>
                    <div className="schedule-list" style={{ marginTop: '1.5rem' }}>
                        {smartSchedule.length === 0 ? (
                            <div className="empty-schedule">
                                <Star size={20} strokeOpacity={0.3} />
                                <p>No pending tasks. You're all caught up! 🎉</p>
                            </div>
                        ) : smartSchedule.map((s, i) => (
                            <ScheduleItem key={i} {...s} />
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default AiInsights;
