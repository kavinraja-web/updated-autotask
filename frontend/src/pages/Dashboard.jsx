import React, { useState, useEffect } from 'react';
import {
    CheckCircle, Clock, AlertTriangle, Layers, Sun, Sunset, Moon, Coffee, Sparkles,
    Zap, Bell, Mail, ChevronRight, Target, TrendingUp, TrendingDown, Calendar,
    BarChart2, Star, Search, Plus, ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

/* ─── Stat Card ──────────────────────────────────── */
const StatCard = ({ title, value, icon, colorClass, trend, trendVal, trendUp, delay = '0s', unit }) => (
    <motion.div
        className={`stat-card ${colorClass}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: parseFloat(delay) }}
        whileHover={{ y: -4, scale: 1.02 }}
    >
        <div className="stat-card-top">
            <span className="stat-card-title">{title}</span>
            <div className="stat-card-icon">{icon}</div>
        </div>
        <div className="stat-card-value">
            {value}
            {unit && <span className="stat-unit">{unit}</span>}
        </div>
        <div className="stat-card-footer">
            {trendVal && (
                <span className={`stat-trend-pill ${trendUp ? 'trend-up' : 'trend-down'}`}>
                    {trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {trendVal}
                </span>
            )}
            {trend && <span className="stat-trend-label">{trend}</span>}
        </div>
    </motion.div>
);

/* ─── AI Recommendation Item ─────────────────────── */
const RecommendationItem = ({ icon, iconClass, title, subtitle, onClick }) => (
    <motion.div
        className={`rec-item ${iconClass}`}
        whileHover={{ x: 4 }}
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
        <div className={`rec-icon ${iconClass}`}>{icon}</div>
        <div className="rec-content">
            <div className="rec-title">{title}</div>
            <div className="rec-subtitle">{subtitle}</div>
        </div>
        <ChevronRight size={16} className="rec-arrow" />
    </motion.div>
);

/* ─── Schedule Item ──────────────────────────────── */
const ScheduleItem = ({ time, title, duration, type, dotColor }) => (
    <div className="schedule-row">
        <div className="schedule-time-col">{time}</div>
        <div className="schedule-dot-col">
            <div className="schedule-dot" style={{ background: dotColor }} />
        </div>
        <div className="schedule-info-col">
            <div className="schedule-title">{title}</div>
            <div className="schedule-meta">{duration} · {type}</div>
        </div>
    </div>
);

/* ─── Dashboard Page ─────────────────────────────── */
const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ totalTasks: 0, completedTasks: 0, pendingTasks: 0, highPriorityTasks: 0 });
    const [greeting, setGreeting] = useState('Good Morning');
    const [greetingEmoji, setGreetingEmoji] = useState('👋');
    const [userName, setUserName] = useState('Kavin');
    const [userEmail, setUserEmail] = useState('');
    const [recentTasks, setRecentTasks] = useState([]);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) { setGreeting('Good morning'); setGreetingEmoji('👋'); }
        else if (hour < 17) { setGreeting('Good afternoon'); setGreetingEmoji('☀️'); }
        else if (hour < 20) { setGreeting('Good evening'); setGreetingEmoji('🌅'); }
        else { setGreeting('Good night'); setGreetingEmoji('🌙'); }

        const email = localStorage.getItem('user_email') || '';
        setUserEmail(email);
        if (email) {
            const namePart = email.split('@')[0];
            setUserName(namePart.charAt(0).toUpperCase() + namePart.slice(1));
        }

        axios.get('/api/dashboard')
            .then(res => setStats(res.data))
            .catch(() => {});

        axios.get('/api/tasks')
            .then(res => setRecentTasks(res.data.slice(0, 3)))
            .catch(() => {});
    }, []);

    const timeSavedHours = (stats.completedTasks * 0.15).toFixed(1);

    return (
        <div className="dashboard-page">

            {/* ── Top Header Bar ── */}
            <motion.div
                className="dash-top-bar"
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <div className="dash-greeting-block">
                    <h1 className="dash-greeting-text">
                        {greeting}, {userName}! {greetingEmoji}
                    </h1>
                    <p className="dash-greeting-sub">Let's make today exceptionally productive.</p>
                </div>

                <div className="dash-topbar-right">
                    <div className="dash-search-bar">
                        <Search size={14} className="dash-search-icon" />
                        <input type="text" placeholder="Search tasks, emails…" className="dash-search-input" />
                        <span className="dash-search-kbd">⌘ K</span>
                    </div>
                    <div className="dash-user-chip">
                        <div className="dash-user-avatar">{userName.charAt(0).toUpperCase()}</div>
                        <div className="dash-user-info">
                            <span className="dash-user-name">{userEmail.split('@')[0] || userName}</span>
                            <span className="dash-user-status">
                                <span className="dash-status-dot" />
                                Gmail Connected
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── Hero Banner ── */}
            <motion.div
                className="dash-hero-banner"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
            >
                <div className="hero-content">
                    <div className="hero-text-block">
                        <h2 className="hero-title">AI that works while you focus.</h2>
                        <p className="hero-subtitle">
                            Smart suggestions, automated workflows,<br />
                            and zero inbox stress.
                        </p>
                        <div className="hero-actions">
                            <button className="hero-btn-primary" onClick={() => navigate('/emails')}>
                                <Sparkles size={16} />
                                Analyze Emails
                            </button>
                            <button className="hero-btn-secondary" onClick={() => navigate('/tasks')}>
                                <Plus size={16} />
                                Create Task
                            </button>
                        </div>
                    </div>

                    {/* Email envelope decorations */}
                    <div className="hero-decorations">
                        <div className="hero-envelope hero-envelope-1">
                            <Mail size={20} />
                        </div>
                        <div className="hero-envelope hero-envelope-2">
                            <Mail size={14} />
                        </div>
                        <div className="hero-paper-plane">✈</div>
                    </div>

                    {/* Animated Robot GIF */}
                    <div className="hero-robot-wrapper">
                        {/* Floating elements around the robot */}
                        <div className="robot-float-item float-mail-1"><Mail size={16} /></div>
                        <div className="robot-float-item float-sparkle-1"><Sparkles size={14} /></div>
                        <div className="robot-float-item float-bell-1"><Bell size={16} /></div>
                        
                        <div className="robot-glass-container">
                            <img
                                src="/animatedrobotic.gif"
                                alt="AI Robot Assistant"
                                className="hero-robot-gif"
                            />
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── Stat Cards Row ── */}
            <div className="dash-stats-grid">
                <StatCard
                    title="Total Tasks"
                    value={stats.totalTasks || 24}
                    icon={<Calendar size={20} />}
                    colorClass="stat-purple"
                    trendVal="+12%"
                    trendUp
                    trend="from yesterday"
                    delay="0s"
                />
                <StatCard
                    title="Completed"
                    value={stats.completedTasks || 16}
                    icon={<CheckCircle size={20} />}
                    colorClass="stat-green"
                    trendVal="+8%"
                    trendUp
                    trend="from yesterday"
                    delay="0.07s"
                />
                <StatCard
                    title="Pending"
                    value={stats.pendingTasks || 8}
                    icon={<Clock size={20} />}
                    colorClass="stat-orange"
                    trendVal="-3%"
                    trendUp={false}
                    trend="from yesterday"
                    delay="0.14s"
                />
                <StatCard
                    title="Time Saved"
                    value={timeSavedHours || '2.5'}
                    unit="h"
                    icon={<Target size={20} />}
                    colorClass="stat-blue"
                    trendVal="+15%"
                    trendUp
                    trend="this week"
                    delay="0.21s"
                />
            </div>

            {/* ── Main Two-Column Area ── */}
            <div className="dash-main-cols">

                {/* Left: AI Recommendations */}
                <motion.div
                    className="dash-panel"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <div className="dash-panel-header">
                        <div className="dash-panel-title">
                            <Zap size={18} className="panel-title-icon purple" />
                            <span>AI Recommendations</span>
                        </div>
                    </div>

                    <div className="rec-list">
                        <RecommendationItem
                            iconClass="rec-alert"
                            icon={<AlertTriangle size={16} />}
                            title="Focus on 3 high-priority tasks"
                            subtitle="You have 3 urgent tasks that need attention"
                            onClick={() => navigate('/tasks')}
                        />
                        <RecommendationItem
                            iconClass="rec-positive"
                            icon={<TrendingUp size={16} />}
                            title="Best time to focus"
                            subtitle="Your peak productivity is 2:00 PM - 4:00 PM"
                        />
                        <RecommendationItem
                            iconClass="rec-neutral"
                            icon={<Mail size={16} />}
                            title="Email overload detected"
                            subtitle="Consider batching emails to save time"
                            onClick={() => navigate('/emails')}
                        />
                    </div>

                    <button className="panel-view-all-link" onClick={() => navigate('/dashboard/insights')}>
                        View all insights <ArrowRight size={14} />
                    </button>
                </motion.div>

                {/* Right: Smart Schedule */}
                <motion.div
                    className="dash-panel"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.35 }}
                >
                    <div className="dash-panel-header">
                        <div className="dash-panel-title">
                            <Calendar size={18} className="panel-title-icon blue" />
                            <span>Smart Schedule</span>
                        </div>
                        <button className="panel-view-all-btn" onClick={() => navigate('/reminders')}>
                            View Calendar
                        </button>
                    </div>

                    <div className="schedule-list">
                        <ScheduleItem time="9:00 AM"  title="Team Standup"         duration="30 min" type="Meeting"    dotColor="#8B5CF6" />
                        <ScheduleItem time="11:00 AM" title="Project Review"       duration="1 hr"   type="Deep Work"  dotColor="#10B981" />
                        <ScheduleItem time="2:00 PM"  title="Client Follow-up"    duration="45 min" type="Important"  dotColor="#F59E0B" />
                        <ScheduleItem time="4:00 PM"  title="Email Batch Processing" duration="30 min" type="Focus Time" dotColor="#60A5FA" />
                    </div>

                    <div className="schedule-focus-hint">
                        <TrendingUp size={13} />
                        Optimal focus time: 2:00 PM - 4:00 PM
                    </div>
                </motion.div>
            </div>

            {/* ── Bottom Row: Productivity Insights + Recent Tasks ── */}
            <div className="dash-bottom-cols">

                {/* Productivity Insights */}
                <motion.div
                    className="dash-panel"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                >
                    <div className="dash-panel-header">
                        <div className="dash-panel-title">
                            <BarChart2 size={18} className="panel-title-icon purple" />
                            <span>Productivity Insights</span>
                        </div>
                        <select className="panel-period-select">
                            <option>This Week</option>
                            <option>Last Week</option>
                            <option>This Month</option>
                        </select>
                    </div>

                    {/* Mini wave chart SVG */}
                    <div className="productivity-wave-chart">
                        <svg viewBox="0 0 400 80" className="wave-svg" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.25" />
                                    <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path d="M0,50 C50,30 80,60 120,40 C160,20 190,55 240,35 C290,15 320,50 360,30 L400,20 L400,80 L0,80 Z"
                                fill="url(#waveGrad)" />
                            <path d="M0,50 C50,30 80,60 120,40 C160,20 190,55 240,35 C290,15 320,50 360,30 L400,20"
                                fill="none" stroke="#7C3AED" strokeWidth="2.5" />
                        </svg>
                    </div>

                    <div className="productivity-metrics">
                        <div className="prod-metric">
                            <TrendingUp size={18} className="prod-metric-icon green" />
                            <div className="prod-metric-value">85%</div>
                            <div className="prod-metric-label">Task Completion</div>
                        </div>
                        <div className="prod-metric">
                            <Mail size={18} className="prod-metric-icon blue" />
                            <div className="prod-metric-value">12</div>
                            <div className="prod-metric-label">Emails Processed</div>
                        </div>
                        <div className="prod-metric">
                            <Clock size={18} className="prod-metric-icon purple" />
                            <div className="prod-metric-value">3</div>
                            <div className="prod-metric-label">Hours Focused</div>
                        </div>
                        <div className="prod-metric">
                            <Star size={18} className="prod-metric-icon orange" />
                            <div className="prod-metric-value">7</div>
                            <div className="prod-metric-label">Day Streak</div>
                        </div>
                    </div>
                </motion.div>

                {/* Recent Tasks */}
                <motion.div
                    className="dash-panel"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.45 }}
                >
                    <div className="dash-panel-header">
                        <div className="dash-panel-title">
                            <CheckCircle size={18} className="panel-title-icon green" />
                            <span>Recent Tasks</span>
                        </div>
                        <button className="panel-view-all-btn" onClick={() => navigate('/tasks')}>View all</button>
                    </div>

                    <div className="recent-tasks-list">
                        {recentTasks.length > 0 ? recentTasks.map((task, i) => (
                            <div key={task.id || i} className="recent-task-row">
                                <input type="checkbox" className="task-checkbox" checked={task.status === 'COMPLETED'} readOnly />
                                <span className="recent-task-title">{task.title || task.subject}</span>
                                <span className={`task-priority-badge priority-${(task.priority || 'low').toLowerCase()}`}>
                                    {task.priority || 'Low'}
                                </span>
                                <span className="recent-task-date">Today</span>
                            </div>
                        )) : (
                            <>
                                <div className="recent-task-row">
                                    <input type="checkbox" className="task-checkbox" readOnly />
                                    <span className="recent-task-title">Review marketing proposal</span>
                                    <span className="task-priority-badge priority-high">High</span>
                                    <span className="recent-task-date">Today</span>
                                </div>
                                <div className="recent-task-row">
                                    <input type="checkbox" className="task-checkbox" readOnly />
                                    <span className="recent-task-title">Prepare Q4 presentation</span>
                                    <span className="task-priority-badge priority-medium">Medium</span>
                                    <span className="recent-task-date">Tomorrow</span>
                                </div>
                                <div className="recent-task-row">
                                    <input type="checkbox" className="task-checkbox" readOnly />
                                    <span className="recent-task-title">Update client documents</span>
                                    <span className="task-priority-badge priority-low">Low</span>
                                    <span className="recent-task-date">May 22</span>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Floating + Button */}
            <motion.button
                className="dash-fab"
                onClick={() => navigate('/tasks')}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, type: 'spring' }}
                title="Create Task"
            >
                <Plus size={24} />
            </motion.button>

        </div>
    );
};

export default Dashboard;
