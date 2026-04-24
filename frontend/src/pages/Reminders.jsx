import React, { useState, useEffect, useCallback } from 'react';
import {
    Bell, RefreshCw, Clock, Mail, AlertTriangle,
    CheckCircle, AlertCircle, Calendar, ChevronRight, X, Cpu, FileText, ExternalLink
} from 'lucide-react';
import axios from 'axios';
import './Reminders.css';

// ─── Live countdown label ─────────────────────────────────────────────────────
const CountdownLabel = ({ daysUntil }) => {
    if (daysUntil < 0) {
        const abs = Math.abs(daysUntil);
        return <span className="cd-overdue">{abs} day{abs !== 1 ? 's' : ''} overdue</span>;
    }
    if (daysUntil === 0) return <span className="cd-today">Due Today!</span>;
    if (daysUntil === 1) return <span className="cd-tomorrow">Due Tomorrow</span>;
    return <span className="cd-days">{daysUntil} days left</span>;
};

// ─── Progress ring (SVG) ─────────────────────────────────────────────────────
const UrgencyRing = ({ daysUntil, urgency }) => {
    const radius = 22;
    const circ = 2 * Math.PI * radius;
    const max = 14;
    const clamped = Math.max(0, Math.min(daysUntil, max));
    const progress = daysUntil < 0 ? 1 : 1 - clamped / max;
    const dash = progress * circ;

    const colorMap = {
        Overdue:  '#ef4444',
        Today:    '#f97316',
        Tomorrow: '#f59e0b',
        Critical: '#fb923c',
        High:     '#facc15',
        Medium:   '#818cf8',
        Low:      '#34d399',
    };
    const color = colorMap[urgency] || '#818cf8';

    return (
        <svg width="56" height="56" viewBox="0 0 56 56" className="urgency-ring">
            <circle cx="28" cy="28" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
            <circle
                cx="28" cy="28" r={radius}
                fill="none"
                stroke={color}
                strokeWidth="4"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                transform="rotate(-90 28 28)"
                style={{ filter: `drop-shadow(0 0 4px ${color})` }}
            />
            <text x="28" y="33" textAnchor="middle" fill={color} fontSize="11" fontWeight="700">
                {daysUntil < 0 ? '!' : daysUntil <= 0 ? '0d' : daysUntil > 99 ? '99+' : `${daysUntil}d`}
            </text>
        </svg>
    );
};

// ─── Urgency Badge ────────────────────────────────────────────────────────────
const UrgencyBadge = ({ urgency }) => {
    const iconMap = {
        Overdue:  <AlertTriangle size={12} />,
        Today:    <AlertCircle  size={12} />,
        Tomorrow: <Clock        size={12} />,
        Critical: <AlertTriangle size={12} />,
        High:     <Bell         size={12} />,
        Medium:   <Calendar     size={12} />,
        Low:      <CheckCircle  size={12} />,
    };
    return (
        <span className={`urgency-badge urgency-${urgency?.toLowerCase()}`}>
            {iconMap[urgency]}
            {urgency}
        </span>
    );
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const ReminderModal = ({ reminder, onClose }) => {
    useEffect(() => {
        const fn = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', fn);
        document.body.style.overflow = 'hidden';
        window.scrollTo({ top: 0, behavior: 'instant' });
        return () => {
            window.removeEventListener('keydown', fn);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    if (!reminder) return null;
    const formatDate = (s) => s ? new Date(s).toLocaleString() : 'Unknown';

    return (
        <div className="r-modal-overlay" onClick={onClose}>
            <div className="r-modal-panel" onClick={(e) => e.stopPropagation()}>
                <div className="r-modal-header">
                    <div className="r-modal-title-row">
                        <UrgencyRing daysUntil={reminder.daysUntil} urgency={reminder.urgency} />
                        <div className="r-modal-title-text">
                            <h2>{reminder.subject || '(No Subject)'}</h2>
                            <div className="r-modal-meta">
                                <span><Mail size={13} /> {reminder.sender}</span>
                                <span><Clock size={13} /> Processed: {formatDate(reminder.processedAt)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="r-modal-actions">
                        {reminder.messageId && (
                            <a 
                                href={`https://mail.google.com/mail/u/0/#inbox/${reminder.messageId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-gmail-link"
                                title="Open in Gmail"
                            >
                                <ExternalLink size={14} />
                                <span>View in Gmail</span>
                            </a>
                        )}
                        <button className="r-modal-close" onClick={onClose}><X size={18} /></button>
                    </div>
                </div>

                <div className="r-modal-body">
                    {/* Deadline card */}
                    <div className="r-deadline-card">
                        <div className="r-deadline-left">
                            <div className="r-deadline-label">Detected Deadline</div>
                            <div className="r-deadline-date">{reminder.deadlineText || 'No text detected'}</div>
                            <div className="r-deadline-iso">
                                {reminder.deadlineDate 
                                    ? new Date(reminder.deadlineDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) 
                                    : 'No specific date detected'}
                            </div>
                        </div>
                        <div className="r-deadline-right">
                            <CountdownLabel daysUntil={reminder.daysUntil} />
                            <UrgencyBadge urgency={reminder.urgency} />
                        </div>
                    </div>

                    {/* Snippet */}
                    {reminder.snippet && (
                        <div className="r-section">
                            <div className="r-section-label"><Cpu size={13} /> AI Summary Analysis</div>
                            <p className="r-snippet">{reminder.snippet}</p>
                        </div>
                    )}

                    {/* Full Body Reader */}
                    <div className="r-section r-body-section">
                        <div className="r-section-label"><FileText size={13} /> Original Email Body</div>
                        <div className="r-body-scroll">
                            {reminder.body ? (
                                <div 
                                    className="r-rendered-body"
                                    dangerouslySetInnerHTML={{ __html: reminder.body }}
                                />
                            ) : (
                                <p className="r-snippet">Full content not available.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const Reminders = () => {
    const [reminders, setReminders]         = useState([]);
    const [loading, setLoading]             = useState(true);
    const [error, setError]                 = useState(null);
    const [selectedReminder, setSelected]   = useState(null);
    const [filter, setFilter]               = useState('All');

    const fetchReminders = useCallback(() => {
        setLoading(true);
        setError(null);
        axios.get('/api/reminders')
            .then((res) => setReminders(res.data))
            .catch((err) => {
                console.error('Failed to fetch reminders:', err);
                setError('Could not load reminders. Make sure the backend is running.');
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchReminders(); }, [fetchReminders]);

    const urgencyFilters = ['All', 'Overdue', 'Today', 'Tomorrow', 'Critical', 'High', 'Medium', 'Low'];
    const filtered = filter === 'All' ? reminders : reminders.filter(r => r.urgency === filter);

    // Summary counts
    const counts = {};
    reminders.forEach(r => { counts[r.urgency] = (counts[r.urgency] || 0) + 1; });
    const overdueCnt  = counts['Overdue']  || 0;
    const criticalCnt = (counts['Today'] || 0) + (counts['Tomorrow'] || 0) + (counts['Critical'] || 0);
    const upcomingCnt = (counts['High']   || 0) + (counts['Medium']  || 0) + (counts['Low']     || 0);
    const totalCnt    = reminders.length;

    const formatDate = (s) => { try { return new Date(s).toLocaleDateString(); } catch { return s; } };

    return (
        <div className="page-container reminders-page">
            {/* Header */}
            <header className="page-header rem-flex-header">
                <div>
                    <h1><Bell size={28} style={{ display:'inline', marginRight:'0.5rem', color:'#818cf8' }} />Smart Reminders</h1>
                    <p>Deadlines automatically detected from your email content by AI scanning.</p>
                </div>
                <button className="btn-primary rem-refresh-btn" onClick={fetchReminders} disabled={loading}>
                    <RefreshCw size={16} className={loading ? 'spin' : ''} />
                    {loading ? 'Loading…' : 'Refresh'}
                </button>
            </header>

            {/* Error */}
            {error && (
                <div className="rem-error-bar">⚠️ {error}</div>
            )}

            {/* Summary Cards */}
            {!loading && !error && (
                <div className="rem-summary-grid">
                    <div className="rem-summary-card overdue">
                        <div className="rem-summary-icon"><AlertTriangle size={22} /></div>
                        <div>
                            <div className="rem-summary-count">{overdueCnt}</div>
                            <div className="rem-summary-label">Overdue</div>
                        </div>
                    </div>
                    <div className="rem-summary-card critical">
                        <div className="rem-summary-icon"><AlertCircle size={22} /></div>
                        <div>
                            <div className="rem-summary-count">{criticalCnt}</div>
                            <div className="rem-summary-label">Due ≤ 3 days</div>
                        </div>
                    </div>
                    <div className="rem-summary-card upcoming">
                        <div className="rem-summary-icon"><Calendar size={22} /></div>
                        <div>
                            <div className="rem-summary-count">{upcomingCnt}</div>
                            <div className="rem-summary-label">Upcoming</div>
                        </div>
                    </div>
                    <div className="rem-summary-card total">
                        <div className="rem-summary-icon"><Bell size={22} /></div>
                        <div>
                            <div className="rem-summary-count">{totalCnt}</div>
                            <div className="rem-summary-label">Total Detected</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Chips */}
            {!loading && reminders.length > 0 && (
                <div className="rem-filter-bar">
                    {urgencyFilters.map(f => (
                        <button
                            key={f}
                            className={`rem-filter-chip ${filter === f ? 'active' : ''} chip-${f.toLowerCase()}`}
                            onClick={() => setFilter(f)}
                        >
                            {f}
                            {f !== 'All' && counts[f] ? <span className="chip-count">{counts[f]}</span> : null}
                            {f === 'All' && <span className="chip-count">{totalCnt}</span>}
                        </button>
                    ))}
                </div>
            )}

            {/* List */}
            <div className="glass-panel rem-list">
                {loading ? (
                    <div className="rem-empty-state">
                        <div className="rem-spinner" />
                        <p>Scanning emails for deadlines…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="rem-empty-state">
                        <Bell size={40} style={{ color: '#4a5568', marginBottom:'1rem' }} />
                        <p style={{ color:'#a0aec0' }}>
                            {reminders.length === 0
                                ? 'No deadline-containing emails found. Scan your inbox in Email Analysis first.'
                                : `No emails match the "${filter}" filter.`}
                        </p>
                    </div>
                ) : (
                    filtered.map((rem) => (
                        <div
                            key={`${rem.emailId}-${rem.deadlineDate}`}
                            className={`rem-row urgency-row-${rem.urgency?.toLowerCase()}`}
                            onClick={() => setSelected(rem)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && setSelected(rem)}
                        >
                            {/* Ring */}
                            <UrgencyRing daysUntil={rem.daysUntil} urgency={rem.urgency} />

                            {/* Content */}
                            <div className="rem-row-content">
                                <div className="rem-row-top">
                                    <h4 className="rem-subject">{rem.subject}</h4>
                                    <UrgencyBadge urgency={rem.urgency} />
                                </div>
                                <p className="rem-snippet">{rem.snippet}</p>
                                <div className="rem-row-meta">
                                    <span><Mail size={12} /> {rem.sender}</span>
                                    <span><Calendar size={12} /> Deadline: <strong>{rem.deadlineText}</strong> ({formatDate(rem.deadlineDate)})</span>
                                </div>
                            </div>

                            {/* Countdown */}
                            <div className="rem-row-countdown">
                                <CountdownLabel daysUntil={rem.daysUntil} />
                            </div>

                            <ChevronRight size={16} className="rem-chevron" />
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {selectedReminder && (
                <ReminderModal reminder={selectedReminder} onClose={() => setSelected(null)} />
            )}
        </div>
    );
};

export default Reminders;
