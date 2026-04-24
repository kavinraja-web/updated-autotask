import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Search, Calendar, Trash2, Loader2, PenLine } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './AutoTaskList.css';

const PRIORITY_COLORS = {
    high: '#c0392b',
    medium: '#d35400',
    low: '#27ae60',
};

const TaskCard = ({ task, onComplete, onDelete }) => {
    const [isCompleting, setIsCompleting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [isChecked, setIsChecked] = useState(false);

    const handleCompleteClick = async () => {
        if (isCompleting || isCompleted) return;
        setIsChecked(true);
        setIsCompleting(true);
        if (navigator.vibrate) navigator.vibrate(40);

        try {
            await axios.put(`/api/tasks/${task.id}/complete`);
        } catch (e) {
            console.error(e);
        }

        setTimeout(() => {
            setIsCompleting(false);
            setIsCompleted(true);
            confetti({
                particleCount: 60,
                spread: 65,
                origin: { y: 0.6 },
                colors: ['#27ae60', '#2980b9', '#8e44ad'],
            });
            if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
            setTimeout(() => onComplete(task.id), 1000);
        }, 700);
    };

    const handleDeleteClick = () => {
        setIsCompleting(true);
        onDelete(task.id);
    };

    const formatDeadline = (dl) => {
        if (!dl) return 'No deadline';
        try {
            return new Date(dl).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
            });
        } catch { return dl; }
    };

    const priorityColor = PRIORITY_COLORS[task.priority?.toLowerCase()] || PRIORITY_COLORS.medium;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40, filter: 'blur(3px)' }}
            transition={{ duration: 0.3 }}
            className={`task-paper-item ${isCompleted ? 'is-done' : ''} ${isCompleting ? 'is-processing' : ''}`}
        >
            {isCompleted ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
                    animate={{ opacity: 1, scale: 1, rotate: -2 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 14 }}
                    className="completed-stamp"
                >
                    <div className="stamp-inner">✓ Done!</div>
                </motion.div>
            ) : (
                <div className="paper-item-inner">
                    <div className="paper-checkbox-row">
                        <button
                            className={`paper-checkbox ${isChecked ? 'checked' : ''}`}
                            onClick={handleCompleteClick}
                            disabled={isCompleting}
                        >
                            {isCompleting ? (
                                <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, ease: 'linear', duration: 0.8 }}
                                    style={{ display: 'flex' }}
                                >
                                    <Loader2 size={13} />
                                </motion.span>
                            ) : isChecked ? '✓' : ''}
                        </button>

                        <h3 className={`paper-task-title ${isChecked ? 'strike' : ''}`}>
                            {task.title}
                        </h3>

                        <button className="paper-del-btn" onClick={handleDeleteClick} disabled={isCompleting}>
                            <Trash2 size={14} />
                        </button>
                    </div>

                    <div className="paper-meta-row">
                        <span className="paper-priority-tag" style={{ color: priorityColor }}>
                            ★ {task.priority || 'Medium'}
                        </span>
                        {task.emailSource && (
                            <span className="paper-source">from: {task.emailSource}</span>
                        )}
                        <span className="paper-date">
                            <Calendar size={12} />
                            {formatDeadline(task.deadline)}
                        </span>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

const AutoTaskList = () => {
    const [tasks, setTasks] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchTasks = () => {
        setLoading(true);
        axios.get('/api/tasks')
            .then((res) => setTasks(res.data))
            .catch((err) => console.error('Failed to load tasks:', err))
            .finally(() => setLoading(false));
    };

    useEffect(() => fetchTasks(), []);

    const handleTaskComplete = (id) => setTasks((prev) => prev.filter((t) => t.id !== id));

    const handleTaskDelete = (id) => {
        setTimeout(() => {
            axios.delete(`/api/tasks/${id}`)
                .then(() => setTasks((prev) => prev.filter((t) => t.id !== id)))
                .catch((err) => console.error(err));
        }, 300);
    };

    const filteredTasks = tasks.filter(
        (task) =>
            task.title &&
            task.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
            (task.status === null || task.status === undefined || task.status.toLowerCase() === 'pending')
    );

    return (
        <div className="exam-pad-page">
            {/* Spiral binding on the left */}
            <div className="spiral-binding">
                {Array.from({ length: 14 }).map((_, i) => (
                    <div key={i} className="spiral-hole" />
                ))}
            </div>

            {/* Ruled paper content area */}
            <div className="pad-content">

                {/* Header */}
                <header className="pad-header">
                    <div className="pad-title-area">
                        <div className="pen-icon-wrap">
                            <PenLine size={28} />
                        </div>
                        <div>
                            <h1 className="pad-title">Auto-Generated Tasks</h1>
                            <p className="pad-subtitle">✦ Intelligently extracted from your Gmail inbox ✦</p>
                        </div>
                    </div>

                    <div className="pad-search">
                        <Search size={16} className="search-ink-icon" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </header>

                {/* Task count line */}
                <div className="task-counter-line">
                    {loading ? 'Loading...' : `${filteredTasks.length} task${filteredTasks.length !== 1 ? 's' : ''} pending`}
                </div>

                {/* Task items */}
                <div className="pad-task-list">
                    <AnimatePresence>
                        {loading ? (
                            <motion.div
                                key="loader"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="pad-empty"
                            >
                                <Loader2 size={36} className="spin-icon" />
                                <p>Loading your tasks...</p>
                            </motion.div>
                        ) : filteredTasks.length === 0 ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="pad-empty"
                            >
                                <span className="empty-checkmark">✓</span>
                                <h2>All caught up!</h2>
                                <p>No pending tasks — enjoy your day!</p>
                            </motion.div>
                        ) : (
                            filteredTasks.map((task) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onComplete={handleTaskComplete}
                                    onDelete={handleTaskDelete}
                                />
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default AutoTaskList;
