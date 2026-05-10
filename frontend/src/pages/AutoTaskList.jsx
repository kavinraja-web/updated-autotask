import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Search, Wand2, Calendar, Bell, Lightbulb, Server, Briefcase,
    Code, Star, Edit2, MoreHorizontal, ChevronDown, Filter, ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './AutoTaskList.css';

const CATEGORY_STYLES = {
    purple: { border: '#A78BFA', iconBg: '#F3E8FF', iconColor: '#7C3AED', icon: <Calendar size={18} /> },
    green:  { border: '#6EE7B7', iconBg: '#D1FAE5', iconColor: '#10B981', icon: <Bell size={18} /> },
    orange: { border: '#FDBA74', iconBg: '#FFEDD5', iconColor: '#F59E0B', icon: <Lightbulb size={18} /> },
    blue:   { border: '#93C5FD', iconBg: '#DBEAFE', iconColor: '#3B82F6', icon: <Server size={18} /> },
    indigo: { border: '#A5B4FC', iconBg: '#E0E7FF', iconColor: '#6366F1', icon: <Briefcase size={18} /> },
    pink:   { border: '#F9A8D4', iconBg: '#FCE7F3', iconColor: '#EC4899', icon: <Code size={18} /> },
};

const getRandomStyle = (index) => {
    const keys = Object.keys(CATEGORY_STYLES);
    return CATEGORY_STYLES[keys[index % keys.length]];
};

const TaskCard = ({ task, index, onComplete, onDelete }) => {
    const [isChecked, setIsChecked] = useState(false);
    const style = getRandomStyle(index);

    const handleCompleteClick = (e) => {
        e.stopPropagation();
        setIsChecked(true);
        setTimeout(() => {
            onComplete(task.id);
        }, 500);
    };

    const formatDeadline = (dl) => {
        if (!dl) return 'May 7, 2026 • 4:05 PM'; // Fallback to match image
        try {
            const date = new Date(dl);
            return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        } catch { return dl; }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, delay: (index % 20) * 0.05 }}
            className={`auto-task-card ${isChecked ? 'completing' : ''}`}
            style={{ borderColor: style.border }}
        >
            <div className="atc-header">
                <div className="atc-checkbox" onClick={handleCompleteClick}>
                    {isChecked && <div className="atc-check-mark">✓</div>}
                </div>
                <div className="atc-title-area">
                    <h3 className="atc-title">{task.title || 'Review: Generated Task'}</h3>
                    <div className="atc-source-pill">
                        <span className="atc-source-icon">✉</span>
                        from: {task.emailSource || 'System Notification'}
                    </div>
                    <div className="atc-priority">
                        <Star size={12} className={task.priority?.toLowerCase() === 'high' ? 'star-high' : 'star-medium'} />
                        {task.priority || 'Medium'} Priority
                    </div>
                </div>
                <div className="atc-icon-circle" style={{ backgroundColor: style.iconBg, color: style.iconColor }}>
                    {style.icon}
                </div>
            </div>

            <div className="atc-body">
                {task.description || 'Review and analyze the latest update to take necessary action.'}
            </div>

            <div className="atc-footer">
                <div className="atc-date">
                    <Calendar size={13} />
                    {formatDeadline(task.deadline)}
                </div>
                <div className="atc-actions">
                    <button className="atc-action-btn"><Edit2 size={14} /></button>
                    <button className="atc-action-btn"><MoreHorizontal size={14} /></button>
                </div>
            </div>
        </motion.div>
    );
};

const AutoTaskList = () => {
    const [tasks, setTasks] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All Tasks');
    const [currentPage, setCurrentPage] = useState(1);
    const tasksPerPage = 20;
    
    const userEmail = localStorage.getItem('user_email') || 'kavinraja.250194@gmail.com';
    const userName = userEmail.split('@')[0];
    const initials = userName.charAt(0).toUpperCase();

    const fetchTasks = () => {
        setLoading(true);
        axios.get('/api/tasks')
            .then((res) => setTasks(res.data))
            .catch((err) => console.error('Failed to load tasks:', err))
            .finally(() => setLoading(false));
    };

    useEffect(() => fetchTasks(), []);

    // Reset pagination when searching or changing tabs
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeTab]);

    const handleTaskComplete = (id) => {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        axios.put(`/api/tasks/${id}/complete`).catch(e => console.error(e));
    };

    const handleTaskDelete = (id) => {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        axios.delete(`/api/tasks/${id}`).catch(e => console.error(e));
    };

    const filteredTasks = tasks.filter(
        (task) =>
            task.title &&
            task.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
            (task.status === null || task.status === undefined || task.status.toLowerCase() === 'pending')
    );

    // Fallback dummy data if no tasks exist so UI isn't empty
    const displayTasks = filteredTasks.length > 0 ? filteredTasks : [
        { id: '1', title: 'Review: Today @ Campus', emailSource: 'Today @ Campus', priority: 'Medium', description: "Review and analyze today's campus activities and updates." },
        { id: '2', title: 'Review: Trial Plan Alert', emailSource: 'Trial Plan Alert', priority: 'Medium', description: 'Review trial plan alert and take necessary action.' },
        { id: '3', title: 'Review: Discover smarter ways to use Perplexity today', emailSource: 'Discover smarter ways...', priority: 'Medium', description: 'Explore and review new tips and features from Perplexity.' },
        { id: '4', title: 'Review: Upcoming sub-processor change: Supabase removal', emailSource: 'System Notification', priority: 'Medium', description: 'Review the upcoming sub-processor change and its impact.' },
        { id: '5', title: 'Review: Cisco Hiring Alert - Apply Now!', emailSource: 'Cisco Hiring Alert', priority: 'Medium', description: 'Check and apply for the latest Cisco hiring opportunities.' },
        { id: '6', title: 'Review: Add fallback models in one line', emailSource: 'Engineering Team', priority: 'Medium', description: 'Implement fallback models in one line as per the engineering update.' }
    ];

    const totalTasks = displayTasks.length;
    const totalPages = Math.max(1, Math.ceil(totalTasks / tasksPerPage));
    const startIndex = (currentPage - 1) * tasksPerPage;
    const currentVisibleTasks = displayTasks.slice(startIndex, startIndex + tasksPerPage);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const tabs = ['All Tasks', 'High Priority', 'Follow Ups', 'Updates'];

    return (
        <div className="auto-tasks-page">
            
            {/* Top Bar with Title, Search, and User */}
            <header className="at-header">
                <div className="at-title-block">
                    <div className="at-title-icon-wrapper">
                        <Wand2 size={24} className="at-title-icon" />
                    </div>
                    <div>
                        <h1 className="at-title">Auto-Generated Tasks</h1>
                        <p className="at-subtitle">Intelligently extracted from your Gmail inbox</p>
                    </div>
                </div>

                <div className="at-topbar-right">
                    <div className="at-search-bar">
                        <Search size={16} className="at-search-icon" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="at-search-input"
                        />
                        <span className="at-search-kbd">⌘ K</span>
                    </div>

                    <div className="at-user-chip">
                        <div className="at-user-avatar">{initials}</div>
                        <div className="at-user-info">
                            <span className="at-user-name">{userName}</span>
                            <span className="at-user-status">Gmail Connected</span>
                        </div>
                        <ChevronDown size={14} className="at-user-chevron" />
                    </div>
                </div>
            </header>

            {/* Filter and Sort Bar */}
            <div className="at-controls-bar">
                <div className="at-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            className={`at-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === 'All Tasks' && <span className="tab-icon purple">≡</span>}
                            {tab === 'High Priority' && <Star size={14} className="tab-icon" />}
                            {tab === 'Follow Ups' && <span className="tab-icon">⟳</span>}
                            {tab === 'Updates' && <span className="tab-icon">✧</span>}
                            {tab}
                        </button>
                    ))}
                </div>
                
                <div className="at-actions">
                    <button className="at-action-outline">
                        <span className="at-sort-icon">⇅</span>
                        Sort by: Latest
                        <ChevronDown size={14} />
                    </button>
                    <button className="at-action-outline">
                        <Filter size={14} />
                        Filter
                    </button>
                </div>
            </div>

            {/* Task Grid */}
            <div className="at-task-grid">
                <AnimatePresence>
                    {currentVisibleTasks.map((task, index) => (
                        <TaskCard
                            key={task.id || index}
                            task={task}
                            index={index}
                            onComplete={handleTaskComplete}
                            onDelete={handleTaskDelete}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Pagination Footer */}
            {totalTasks > 0 && (
                <div className="at-pagination-footer">
                    <div className="at-page-info">
                        Showing {startIndex + 1} to {Math.min(startIndex + tasksPerPage, totalTasks)} of {totalTasks} tasks
                    </div>
                    <div className="at-page-controls">
                        <button 
                            className="at-page-arrow" 
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        
                        {[...Array(totalPages)].map((_, i) => {
                            const page = i + 1;
                            if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                return (
                                    <button 
                                        key={page} 
                                        className={`at-page-num ${currentPage === page ? 'active' : ''}`}
                                        onClick={() => handlePageChange(page)}
                                    >
                                        {page}
                                    </button>
                                );
                            } else if (page === currentPage - 2 || page === currentPage + 2) {
                                return <span key={page} className="at-page-dots">...</span>;
                            }
                            return null;
                        })}

                        <button 
                            className="at-page-arrow" 
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                    <div className="at-page-size">
                        Show 
                        <button className="at-page-size-btn">
                            {tasksPerPage} <ChevronDown size={12} />
                        </button>
                        per page
                    </div>
                </div>
            )}

        </div>
    );
};

export default AutoTaskList;
