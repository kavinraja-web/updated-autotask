import React, { useState, useEffect, useCallback } from 'react';
import { Mail, RefreshCw, Cpu, X, FileText, ChevronRight, ExternalLink, Clock, CheckCircle, MinusCircle } from 'lucide-react';
import axios from 'axios';
import './EmailAnalysis.css';

const STATUS_LABELS = {
    PENDING:  { label: 'Pending AI',  icon: Clock,        cls: 'pending'  },
    ANALYZED: { label: 'Analyzed',    icon: CheckCircle,  cls: 'analyzed' },
    IGNORED:  { label: 'Ignored',     icon: MinusCircle,  cls: 'ignored'  },
};

const EmailAnalysis = () => {
    const [emails, setEmails]             = useState([]);
    const [isSyncing, setIsSyncing]       = useState(false);
    const [isAnalyzing, setIsAnalyzing]   = useState(false);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState(null);
    const [errorType, setErrorType]       = useState(null); // 'auth' | 'server' | null
    const [syncInfo, setSyncInfo]         = useState(null);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError]   = useState(null);

    // ─── Fetch stored emails from DB ────────────────────────────────────────────
    const fetchEmails = useCallback(() => {
        setLoading(true);
        setError(null);
        setErrorType(null);
        axios.get('/api/emails')
            .then(res => setEmails(res.data))
            .catch(err => {
                console.error('Failed to fetch emails:', err);
                if (err.response?.status === 401) {
                    setErrorType('auth');
                    setError('Gmail session expired. Please log out and sign in with Google again.');
                } else {
                    setErrorType('server');
                    setError('Could not connect to backend. Make sure Spring Boot is running on port 8081.');
                }
            })
            .finally(() => setLoading(false));
    }, []);

    // ─── Phase 1: sync Gmail → DB (fast, no AI) ─────────────────────────────────
    const syncInbox = useCallback(() => {
        setIsSyncing(true);
        setError(null);
        setErrorType(null);
        setSyncInfo(null);
        return axios.post('/api/emails/sync-inbox')
            .then(res => {
                setSyncInfo(res.data);
                fetchEmails();
            })
            .catch(err => {
                console.error('Sync failed:', err);
                const msg = err.response?.data?.error || 'Failed to sync inbox. Check backend logs.';
                if (err.response?.status === 401) {
                    setErrorType('auth');
                } else {
                    setErrorType('server');
                }
                setError(msg);
            })
            .finally(() => setIsSyncing(false));
    }, [fetchEmails]);

    // ─── Phase 2: trigger background AI analysis ─────────────────────────────────
    const triggerAiAnalysis = useCallback(() => {
        setIsAnalyzing(true);
        setError(null);
        setErrorType(null);
        axios.post('/api/emails/analyze')
            .then(res => {
                console.log('AI analysis started:', res.data);
                let attempts = 0;
                const poll = setInterval(() => {
                    attempts++;
                    fetchEmails();
                    if (attempts >= 36) {
                        clearInterval(poll);
                        setIsAnalyzing(false);
                    }
                }, 5000);
            })
            .catch(err => {
                console.error('AI analysis trigger failed:', err);
                const msg = err.response?.data?.error || 'Failed to start AI analysis.';
                if (err.response?.status === 401) setErrorType('auth');
                setError(msg);
                setIsAnalyzing(false);
            });
    }, [fetchEmails]);

    // Load stored emails on page open (no Gmail sync — user clicks Sync manually)
    useEffect(() => {
        fetchEmails();
    }, [fetchEmails]);

    // Escape key closes modal
    useEffect(() => {
        const handleKey = e => { if (e.key === 'Escape') closeModal(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);

    const handleEmailClick = email => {
        setSelectedEmail(null);
        setDetailError(null);
        setDetailLoading(true);
        document.body.style.overflow = 'hidden';
        window.scrollTo({ top: 0, behavior: 'instant' });
        axios.get(`/api/emails/${email.id}`)
            .then(res => setSelectedEmail(res.data))
            .catch(() => {
                setSelectedEmail(email);
                setDetailError('Could not load full body. Showing available info.');
            })
            .finally(() => setDetailLoading(false));
    };

    const closeModal = () => {
        setSelectedEmail(null);
        setDetailLoading(false);
        setDetailError(null);
        document.body.style.overflow = '';
    };

    const formatDate = dateStr => {
        if (!dateStr) return 'Unknown';
        try { return new Date(dateStr).toLocaleString(); } catch { return dateStr; }
    };

    const getStatusMeta = status => STATUS_LABELS[status] || STATUS_LABELS.PENDING;

    const pendingCount = emails.filter(e => e.aiStatus === 'PENDING').length;

    return (
        <div className="page-container email-page">
            <header className="page-header flex-header">
                <div>
                    <h1>Email Analysis Inbox</h1>
                    <p>
                        All Gmail from the last 48 hours — {emails.length} email{emails.length !== 1 ? 's' : ''} loaded
                        {pendingCount > 0 && <span className="pending-badge"> · {pendingCount} pending AI</span>}
                    </p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn-secondary sync-btn"
                        onClick={syncInbox}
                        disabled={isSyncing || isAnalyzing}
                        title="Re-sync inbox from Gmail"
                    >
                        <RefreshCw size={16} className={isSyncing ? 'spin' : ''} />
                        {isSyncing ? 'Syncing...' : 'Sync Inbox'}
                    </button>
                    <button
                        className="btn-primary analyze-btn"
                        onClick={triggerAiAnalysis}
                        disabled={isSyncing || isAnalyzing || pendingCount === 0}
                        title={pendingCount === 0 ? 'All emails analyzed' : `Run AI on ${pendingCount} pending emails`}
                    >
                        <Cpu size={16} className={isAnalyzing ? 'spin' : ''} />
                        {isAnalyzing ? 'Analyzing...' : `Run AI (${pendingCount})`}
                    </button>
                </div>
            </header>

            {syncInfo && (syncInfo.newEmailsSaved > 0) && (
                <div className="sync-banner">
                    ✅ Synced {syncInfo.newEmailsSaved} new email{syncInfo.newEmailsSaved !== 1 ? 's' : ''} from Gmail.
                    {syncInfo.pendingAiAnalysis > 0 && ` ${syncInfo.pendingAiAnalysis} ready for AI analysis — click "Run AI" to process.`}
                </div>
            )}

            {error && (
                <div className="glass-panel" style={{
                    padding: '1rem 1.25rem',
                    marginBottom: '1rem',
                    borderColor: errorType === 'auth' ? 'rgba(251,146,60,0.4)' : 'rgba(239,68,68,0.3)',
                    background: errorType === 'auth' ? 'rgba(254,243,199,0.6)' : 'rgba(254,226,226,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem'
                }}>
                    <span style={{ color: errorType === 'auth' ? '#92400e' : '#991b1b' }}>
                        {errorType === 'auth' ? '🔑' : '⚠️'} {error}
                    </span>
                    {errorType === 'auth' && (
                        <button
                            onClick={() => { localStorage.clear(); window.location.reload(); }}
                            style={{
                                background: '#f59e0b', color: 'white', border: 'none',
                                borderRadius: '6px', padding: '0.4rem 1rem',
                                fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
                            }}
                        >
                            Re-login with Google
                        </button>
                    )}
                </div>
            )}

            {isAnalyzing && (
                <div className="sync-banner analyzing-banner">
                    🤖 AI is analyzing {pendingCount} emails in the background. Results will update automatically...
                </div>
            )}

            <div className="email-list glass-panel">
                <div className="list-header">
                    <div className="col-subject">Subject &amp; Snippet</div>
                    <div className="col-status">AI Status</div>
                    <div className="col-time">Received</div>
                    <div className="col-arrow"></div>
                </div>

                <div className="list-body">
                    {loading || isSyncing ? (
                        <div className="email-row" style={{ justifyContent: 'center', color: '#a0aec0' }}>
                            {isSyncing ? '📥 Syncing your Gmail inbox (last 48h)...' : 'Loading emails...'}
                        </div>
                    ) : emails.length === 0 ? (
                        <div className="email-row" style={{ justifyContent: 'center', color: '#a0aec0' }}>
                            No emails found in the last 48 hours. Try re-logging in to refresh your Google token.
                        </div>
                    ) : (
                        emails.map(email => {
                            const meta = getStatusMeta(email.aiStatus);
                            const StatusIcon = meta.icon;
                            return (
                                <div
                                    key={email.id}
                                    className="email-row email-row-clickable"
                                    onClick={() => handleEmailClick(email)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={e => e.key === 'Enter' && handleEmailClick(email)}
                                >
                                    <div className="col-subject">
                                        <div className="email-icon">
                                            <Mail size={18} />
                                        </div>
                                        <div className="email-content">
                                            <h4>{email.subject}</h4>
                                            <p>{email.snippet}</p>
                                        </div>
                                    </div>
                                    <div className="col-status">
                                        <span className={`status-badge ${meta.cls}`}>
                                            <StatusIcon size={14} />
                                            {meta.label}
                                        </span>
                                    </div>
                                    <div className="col-time text-secondary">{formatDate(email.processedAt)}</div>
                                    <div className="col-arrow">
                                        <ChevronRight size={16} className="row-chevron" />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Email Detail Modal */}
            {(detailLoading || selectedEmail) && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-panel" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title-area">
                                <div className="modal-icon">
                                    <Mail size={22} />
                                </div>
                                <div className="modal-title-info">
                                    <h2 className="modal-title">
                                        {detailLoading ? 'Loading…' : selectedEmail?.subject || '(No Subject)'}
                                    </h2>
                                    {!detailLoading && (
                                        <div className="modal-subtitle">
                                            {selectedEmail?.sender} • {formatDate(selectedEmail?.processedAt)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-actions">
                                {selectedEmail?.messageId && (
                                    <a
                                        href={`https://mail.google.com/mail/u/0/#inbox/${selectedEmail.messageId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-gmail-link"
                                        title="Open in Gmail"
                                    >
                                        <ExternalLink size={16} />
                                        <span>View in Gmail</span>
                                    </a>
                                )}
                                <button className="modal-close" onClick={closeModal} aria-label="Close">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {detailLoading ? (
                            <div className="modal-loading">
                                <div className="loading-spinner"></div>
                                <span>Fetching full email…</span>
                            </div>
                        ) : !selectedEmail ? (
                            <div className="modal-error">No email data found.</div>
                        ) : (
                            <div className="modal-body-container">
                                {selectedEmail.snippet && (
                                    <div className="modal-section ai-section">
                                        <div className="section-label">
                                            <Cpu size={14} />
                                            AI Summary &amp; Analysis
                                        </div>
                                        <div className="modal-snippet">{selectedEmail.snippet}</div>
                                    </div>
                                )}
                                <div className="modal-section full-content-section">
                                    <div className="section-label">
                                        <FileText size={14} />
                                        Original Email Body
                                    </div>
                                    <div className="email-body-scroll">
                                        {selectedEmail.body ? (
                                            <div
                                                className="email-rendered-body"
                                                dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                                            />
                                        ) : (
                                            <div className="modal-body-content">(No body content available)</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailAnalysis;
