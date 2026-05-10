import React, { useState, useEffect } from 'react';
import {
    Sparkles, Bell, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight,
    ArrowLeft, Search, Filter, Mail, Briefcase, Info, Users,
    ExternalLink, Edit3, Send, ZoomIn, ZoomOut, Maximize2, Trash2
} from 'lucide-react';
import axios from 'axios';
import './EmailAnalysis.css';

const EmailAnalysis = () => {
    const [emails, setEmails] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('summary');
    const [view, setView] = useState('list'); // mobile: 'list' | 'detail'
    const [analyzeStatus, setAnalyzeStatus] = useState('idle');
    const [taskStatus, setTaskStatus] = useState('idle');
    const [toast, setToast] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const mockEmails = [
        { id: 'mock-1', subject: 'GenAI Product at Best Price Today', sender: 'Parikh Jain <no-reply@propeers.in>', snippet: 'This is the body of the email. It contains details...', processedAt: new Date().toISOString(), aiStatus: 'ANALYZED', category: 'Promotional' },
        { id: 'mock-2', subject: 'Participate in Zerobreach CTF 2026 – Showcase...', sender: 'CSE Department', snippet: 'Dear Students, We are excited to inform you...', processedAt: new Date(Date.now() - 3600000).toISOString(), aiStatus: 'ANALYZED', category: 'Informational' },
        { id: 'mock-3', subject: 'Join the Hack-to-Skill Mega Hackathon', sender: 'CSE Department', snippet: 'Dear Students, We are pleased to share an...', processedAt: new Date(Date.now() - 7200000).toISOString(), aiStatus: 'ANALYZED', category: 'Informational' },
    ];

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchEmails = async () => {
        try {
            const res = await axios.get('/api/emails');
            if (res.data && res.data.length > 0) setEmails(res.data);
            else setEmails(mockEmails);
        } catch { setEmails(mockEmails); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchEmails(); }, []);

    const handleAnalyze = async () => {
        if (analyzeStatus === 'loading') return;
        setAnalyzeStatus('loading');
        try {
            const res = await axios.post('/api/emails/analyze');
            showToast(`✅ Analysis started! ${res.data.pendingEmails ?? 0} email(s) queued.`, 'success');
            setAnalyzeStatus('done');
            setTimeout(() => { fetchEmails(); setAnalyzeStatus('idle'); }, 4000);
        } catch (err) {
            showToast(`❌ ${err.response?.data?.error || 'Analysis failed. Check Gmail connection.'}`, 'error');
            setAnalyzeStatus('idle');
        }
    };

    const handleCreateTask = async () => {
        if (taskStatus === 'loading') return;
        setTaskStatus('loading');
        try {
            await axios.post('/api/tasks', {
                title: `Review: ${getSubject(activeEmail)}`,
                description: getBodyText(activeEmail).substring(0, 500),
                priority: 'Medium', status: 'Pending',
                emailSource: getSender(activeEmail),
                deadline: new Date(Date.now() + 86400000).toISOString().slice(0, 19)
            });
            showToast('✅ Task created from this email!', 'success');
            setTaskStatus('done');
            setTimeout(() => setTaskStatus('idle'), 4000);
        } catch {
            showToast('❌ Failed to create task.', 'error');
            setTaskStatus('idle');
        }
    };

    const getSubject = (e) => e?.subject || 'No Subject';
    const getSender = (e) => e?.sender || 'Unknown Sender';
    const getSenderInitials = (e) => {
        const name = getSender(e).split('<')[0].trim();
        return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'EM';
    };
    const getDate = (e) => {
        if (!e?.processedAt) return 'Recently';
        return new Date(e.processedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    };
    const getTime = (e) => {
        if (!e?.processedAt) return '';
        return new Date(e.processedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };
    const getBodyText = (e) => {
        if (!e?.body) return e?.snippet || 'No Content';
        const stripped = e.body.replace(/<[^>]*>?/gm, '');
        return stripped.trim() || e.snippet || 'No Content';
    };

    const displayEmails = emails.length > 0 ? emails : mockEmails;
    const filtered = displayEmails.filter(e =>
        getSubject(e).toLowerCase().includes(searchQuery.toLowerCase()) ||
        getSender(e).toLowerCase().includes(searchQuery.toLowerCase())
    );
    const activeEmail = filtered[selectedIndex] || filtered[0] || mockEmails[0];

    const categoryColor = (cat) => {
        const map = { 'Promotional': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' }, 'Informational': { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' }, 'ANALYZED': { bg: 'rgba(16,185,129,0.12)', color: '#10b981' } };
        return map[cat] || { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' };
    };

    const avatarColors = ['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#06b6d4'];
    const getAvatarColor = (index) => avatarColors[index % avatarColors.length];

    const tabs = [
        { id: 'summary', label: 'AI Summary' },
        { id: 'details', label: 'Key Details' },
        { id: 'actions', label: 'Suggested Actions' },
        { id: 'reply', label: 'Smart Reply' },
        { id: 'classification', label: 'Classification' },
    ];

    return (
        <div className="ea-page">
            {/* Header */}
            <div className="ea-header">
                <div className="ea-header-left">
                    <div className="ea-title-row">
                        <Sparkles className="ea-title-icon" size={22} />
                        <h1 className="ea-title">Email Analysis</h1>
                    </div>
                    <p className="ea-subtitle">Analyze incoming emails using AI and get smart insights, summaries, and action suggestions.</p>
                </div>
                <div className="ea-header-right">
                    <button className="ea-btn-analyze" onClick={handleAnalyze} disabled={analyzeStatus === 'loading'}>
                        {analyzeStatus === 'loading'
                            ? <><Clock size={15} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...</>
                            : <><CheckCircle2 size={15} /> Analyze New Email</>}
                    </button>
                    <div className="ea-bell-wrapper"><Bell size={20} /><div className="ea-bell-badge">3</div></div>
                </div>
            </div>

            {/* Stats */}
            <div className="ea-stats-row">
                {[
                    { icon: <Mail size={18} />, label: 'Emails Analyzed', value: displayEmails.length || 78, trend: '+18.2%', up: true, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
                    { icon: <Briefcase size={18} />, label: 'Action Required', value: 42, trend: '+12.4%', up: true, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                    { icon: <Info size={18} />, label: 'Informational', value: 28, trend: '+8.6%', up: true, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
                    { icon: <Users size={18} />, label: 'Promotional', value: 8, trend: '-5.1%', up: false, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                    { icon: <Clock size={18} />, label: 'Avg. Response Time', value: '2h 45m', trend: '+14.2%', up: false, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
                ].map((s, i) => (
                    <div className="ea-stat-card" key={i}>
                        <div className="ea-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                        <div className="ea-stat-body">
                            <div className="ea-stat-label">{s.label}</div>
                            <div className="ea-stat-val">{s.value}</div>
                            <div className={`ea-stat-trend ${s.up ? 'up' : 'down'}`}>
                                {s.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />} {s.trend} <span>This month</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main split layout */}
            <div className="ea-main">
                {/* Left Panel — Email List */}
                <div className={`ea-list-panel ${view === 'detail' ? 'ea-hidden-mobile' : ''}`}>
                    <div className="ea-list-header">
                        <h2 className="ea-list-title">Analyzed Emails</h2>
                        <div className="ea-list-controls">
                            <div className="ea-search-box">
                                <Search size={14} />
                                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search emails..." />
                            </div>
                            <button className="ea-filter-btn"><Filter size={14} /> Filter</button>
                        </div>
                    </div>

                    <div className="ea-email-list">
                        {loading ? (
                            <div className="ea-empty">Loading emails...</div>
                        ) : filtered.length === 0 ? (
                            <div className="ea-empty">No emails found.</div>
                        ) : filtered.map((email, i) => (
                            <div
                                key={email.id || i}
                                className={`ea-email-item ${selectedIndex === i ? 'selected' : ''}`}
                                onClick={() => { setSelectedIndex(i); setView('detail'); setActiveTab('summary'); }}
                            >
                                <div className="ea-avatar" style={{ background: getAvatarColor(i) }}>
                                    {getSenderInitials(email)}
                                </div>
                                <div className="ea-item-body">
                                    <div className="ea-item-top">
                                        <span className="ea-item-sender">{getSender(email).split('<')[0].trim()}</span>
                                        <span className="ea-item-time">{getTime(email)}</span>
                                    </div>
                                    <div className="ea-item-subject">{getSubject(email)}</div>
                                    <div className="ea-item-bottom">
                                        <span className="ea-item-snippet">{getBodyText(email).substring(0, 55)}...</span>
                                        <span className="ea-item-badge" style={categoryColor(email.category || email.aiStatus)}>
                                            {email.category || 'Analyzed'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="ea-list-footer">
                        Showing 1 to {Math.min(filtered.length, 5)} of {filtered.length} emails
                    </div>
                </div>

                {/* Right Panel — Detail */}
                <div className={`ea-detail-panel ${view === 'list' ? 'ea-hidden-mobile' : ''}`}>
                    {/* Mobile back button */}
                    <button className="ea-back-btn" onClick={() => setView('list')}>
                        <ArrowLeft size={16} /> Back to Emails
                    </button>

                    {/* Detail Header */}
                    <div className="ea-detail-head">
                        <div className="ea-detail-title-row">
                            <div className="ea-detail-title">
                                {getSubject(activeEmail)}
                                <span className="ea-analyzed-badge">Analyzed</span>
                            </div>
                            <div className="ea-detail-icons">
                                <ZoomIn size={16} /><ZoomOut size={16} /><Maximize2 size={16} /><Trash2 size={16} />
                            </div>
                        </div>
                        <div className="ea-detail-meta">
                            <div className="ea-meta-info">
                                <span><strong>From:</strong> {getSender(activeEmail)}</span>
                                <span><strong>To:</strong> you@example.com</span>
                            </div>
                            <span className="ea-meta-date">{getDate(activeEmail)}</span>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="ea-tabs-row">
                        {tabs.map(t => (
                            <button key={t.id} className={`ea-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                                {t.id === 'summary' && <Sparkles size={13} />}
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="ea-tab-content">
                        {activeTab === 'summary' && (
                            <div className="ea-section">
                                <div className="ea-section-title"><div className="ea-dot purple" /><Sparkles size={15} /> AI Summary</div>
                                <p className="ea-section-body">
                                    {getSender(activeEmail).split('<')[0].trim()} sent an email regarding "{getSubject(activeEmail)}".
                                    {' '}{getBodyText(activeEmail).substring(0, 200)}
                                </p>
                                <button className="ea-view-original" onClick={() => setActiveTab('details')}>
                                    View Original Email <ExternalLink size={13} />
                                </button>
                            </div>
                        )}

                        {activeTab === 'details' && (
                            <div className="ea-section">
                                <div className="ea-section-title"><div className="ea-dot blue" /><Info size={15} /> Key Details</div>
                                <div className="ea-details-grid">
                                    <div className="ea-detail-row"><span className="ea-detail-key">Sender:</span><span className="ea-detail-val">{getSender(activeEmail)}</span></div>
                                    <div className="ea-detail-row"><span className="ea-detail-key">Subject:</span><span className="ea-detail-val">{getSubject(activeEmail)}</span></div>
                                    <div className="ea-detail-row"><span className="ea-detail-key">Type:</span><span className="ea-detail-val">{activeEmail?.category || 'General'}</span></div>
                                    <div className="ea-detail-row"><span className="ea-detail-key">Received:</span><span className="ea-detail-val">{getDate(activeEmail)}</span></div>
                                    <div className="ea-detail-row"><span className="ea-detail-key">Importance:</span><span className="ea-detail-val">Medium</span></div>
                                </div>
                                <div className="ea-body-preview">
                                    <div className="ea-body-label">Email Body</div>
                                    <div className="ea-body-text">{getBodyText(activeEmail)}</div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'actions' && (
                            <div className="ea-section">
                                <div className="ea-section-header">
                                    <div className="ea-section-title"><div className="ea-dot green" /><CheckCircle2 size={15} /> Suggested Actions</div>
                                    <span className="ea-badge-action">Action Required</span>
                                </div>
                                <ul className="ea-action-list">
                                    <li>Review the email content carefully</li>
                                    <li>Check pricing and offers mentioned</li>
                                    <li>Compare with current solutions</li>
                                    <li>Reply if interested</li>
                                </ul>
                                <button
                                    className="ea-create-task-btn"
                                    onClick={handleCreateTask}
                                    disabled={taskStatus === 'loading'}
                                >
                                    {taskStatus === 'loading' ? <><Clock size={14} /> Creating...</>
                                        : taskStatus === 'done' ? <><CheckCircle2 size={14} /> Task Created!</>
                                        : <><Briefcase size={14} /> Create Task</>}
                                </button>
                            </div>
                        )}

                        {activeTab === 'reply' && (
                            <div className="ea-section">
                                <div className="ea-section-title"><div className="ea-dot purple" /><Sparkles size={15} /> Smart Reply (AI Generated)</div>
                                <div className="ea-reply-box">
                                    Hi {getSender(activeEmail).split('<')[0].split(' ')[0]},
                                    {'\n\n'}Thank you for sharing the details about the {getSubject(activeEmail).toLowerCase()}.
                                    Could you please provide more information on pricing plans and integration with our existing systems?
                                    {'\n\n'}Best regards,{'\n'}Kavinraja
                                </div>
                                <div className="ea-reply-actions">
                                    <button className="ea-use-reply-btn" onClick={() => showToast('✅ Reply copied!', 'success')}><Send size={14} /> Use Reply</button>
                                    <button className="ea-edit-reply-btn"><Edit3 size={14} /> Edit Reply</button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'classification' && (
                            <div className="ea-section">
                                <div className="ea-section-title"><div className="ea-dot orange" /><Info size={15} /> Classification</div>
                                <div className="ea-class-row">
                                    <span className="ea-class-tag" style={categoryColor(activeEmail?.category)}>
                                        {activeEmail?.category || 'General'}
                                    </span>
                                </div>
                                <div className="ea-conf-block">
                                    <div className="ea-conf-label">Confidence Score</div>
                                    <div className="ea-conf-bar-wrap">
                                        <div className="ea-conf-bar"><div className="ea-conf-fill" style={{ width: '86%' }} /></div>
                                        <span className="ea-conf-pct">86%</span>
                                    </div>
                                </div>
                                <div className="ea-class-meta">
                                    <div className="ea-detail-row"><span className="ea-detail-key">Type:</span><span className="ea-badge-action">Action Required</span></div>
                                    <div className="ea-detail-row"><span className="ea-detail-key">Priority:</span><span className="ea-badge-medium">Medium</span></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`ea-toast ${toast.type}`}>{toast.msg}</div>
            )}
        </div>
    );
};

export default EmailAnalysis;
