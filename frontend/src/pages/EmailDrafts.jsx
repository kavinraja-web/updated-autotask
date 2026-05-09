import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Mail, Check, X, Clock, RefreshCw, MessageSquare, ArrowRight } from 'lucide-react';
import './EmailDrafts.css';

const EmailDrafts = () => {
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);

    const fetchDrafts = useCallback(() => {
        setLoading(true);
        axios.get('/api/email-drafts?status=PENDING')
            .then(res => setDrafts(res.data))
            .catch(err => {
                console.error('Failed to fetch drafts:', err);
                setError('Could not connect to fetch drafts.');
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchDrafts();
    }, [fetchDrafts]);

    const handleApprove = (id) => {
        setActionLoading(id);
        axios.post(`/api/email-drafts/${id}/approve`)
            .then(() => {
                setDrafts(drafts.filter(d => d.id !== id));
            })
            .catch(err => {
                console.error('Failed to approve draft:', err);
                alert('Failed to approve draft');
            })
            .finally(() => setActionLoading(null));
    };

    const handleReject = (id) => {
        setActionLoading(id);
        axios.post(`/api/email-drafts/${id}/reject`)
            .then(() => {
                setDrafts(drafts.filter(d => d.id !== id));
            })
            .catch(err => {
                console.error('Failed to reject draft:', err);
                alert('Failed to reject draft');
            })
            .finally(() => setActionLoading(null));
    };

    return (
        <div className="page-container drafts-page">
            <header className="page-header flex-header">
                <div>
                    <h1>Email Approvals</h1>
                    <p>Approve or reject AI-generated replies from n8n workflows</p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn-secondary sync-btn"
                        onClick={fetchDrafts}
                        disabled={loading}
                    >
                        <RefreshCw size={16} className={loading ? 'spin' : ''} />
                        Refresh
                    </button>
                </div>
            </header>

            {error && (
                <div className="glass-panel error-panel">
                    ⚠️ {error}
                </div>
            )}

            <div className="drafts-grid">
                {loading ? (
                    <div className="empty-state">Loading pending approvals...</div>
                ) : drafts.length === 0 ? (
                    <div className="empty-state">
                        <Check size={48} color="var(--success)" style={{ opacity: 0.5, marginBottom: '1rem' }} />
                        <h3>All caught up!</h3>
                        <p>No pending email replies waiting for approval.</p>
                    </div>
                ) : (
                    drafts.map(draft => (
                        <div key={draft.id} className="draft-card glass-panel">
                            <div className="draft-header">
                                <div className="draft-subject">
                                    <Mail size={16} />
                                    <span>{draft.subject || '(No Subject)'}</span>
                                </div>
                                <div className="draft-time">
                                    <Clock size={12} />
                                    {new Date(draft.createdAt).toLocaleString()}
                                </div>
                            </div>
                            
                            <div className="draft-participants">
                                <div className="participant">
                                    <span className="label">From:</span> {draft.sender}
                                </div>
                            </div>

                            <div className="draft-body-preview">
                                <div className="reply-label">
                                    <MessageSquare size={14} /> Generated Reply
                                </div>
                                <div className="reply-content">
                                    {draft.generatedReply}
                                </div>
                            </div>

                            <div className="draft-actions">
                                <button 
                                    className="btn-reject" 
                                    onClick={() => handleReject(draft.id)}
                                    disabled={actionLoading === draft.id}
                                >
                                    <X size={16} /> Reject
                                </button>
                                <button 
                                    className="btn-approve" 
                                    onClick={() => handleApprove(draft.id)}
                                    disabled={actionLoading === draft.id}
                                >
                                    <Check size={16} /> {actionLoading === draft.id ? 'Approving...' : 'Approve & Send'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default EmailDrafts;
