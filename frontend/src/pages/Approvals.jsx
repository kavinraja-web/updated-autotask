import React, { useState, useEffect } from 'react';
import {
    Search, Filter, Bell, CheckCircle2, Clock, XCircle, Briefcase,
    ChevronDown, ChevronLeft, ChevronRight, Maximize2, MoreVertical,
    Sparkles, Copy, X, Edit3, Send
} from 'lucide-react';
import axios from 'axios';
import './Approvals.css';

const mockApprovals = [
    {
        id: "mock-1",
        subject: "Client Inquiry - Project Update",
        from: "john.doe@example.com",
        to: "you@example.com",
        priority: "High",
        timeAgo: "2m ago",
        receivedDate: "May 16, 2024, 10:24 AM",
        snippet: "Hi, could you please provide an update on the current...",
        replyDraft: "Hi John,\n\nThank you for reaching out. The project is progressing as planned. We have completed the initial phase and are currently working on the development stage. We expect to share a detailed update by the end of this week.\n\nPlease let me know if you need any specific information in the meantime.\n\nBest regards,\nYour Name\nYour Company",
        originalEmailText: "Hi, could you please provide an update on the current project status? Thanks, John.",
        confidence: 92,
        unread: true,
        status: "PENDING"
    },
    {
        id: "mock-2",
        subject: "Meeting Reschedule Request",
        from: "sarah.wilson@example.com",
        to: "you@example.com",
        priority: "Medium",
        timeAgo: "15m ago",
        receivedDate: "May 16, 2024, 10:11 AM",
        snippet: "Hello, I'd like to reschedule our meeting to next week...",
        replyDraft: "Hi Sarah,\n\nCertainly, I am available next Tuesday or Wednesday afternoon. Let me know what works best for you.",
        originalEmailText: "Hello, I'd like to reschedule our meeting to next week as something came up. Let me know. - Sarah",
        confidence: 85,
        unread: true,
        status: "PENDING"
    }
];

const Approvals = () => {
    const [approvals, setApprovals] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [detailTab, setDetailTab] = useState('reply');
    const [loading, setLoading] = useState(true);
    const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'

    useEffect(() => {
        const fetchDrafts = async () => {
            try {
                const res = await axios.get('/api/email-drafts');
                if (res.data && res.data.length > 0) {
                    const mapped = res.data.map(draft => ({
                        id: draft.id,
                        subject: draft.subject || "No Subject",
                        from: draft.sender || "Unknown",
                        to: "you@example.com",
                        priority: "High", // Dynamic Priority based on urgency could go here
                        timeAgo: draft.createdAt ? new Date(draft.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Recently",
                        receivedDate: draft.createdAt ? new Date(draft.createdAt).toLocaleString() : "Recently",
                        snippet: draft.originalEmailText ? draft.originalEmailText.substring(0, 60) + "..." : "No content",
                        replyDraft: draft.generatedReply || "No generated reply available.",
                        originalEmailText: draft.originalEmailText || "No original text available.",
                        confidence: 95, // mock AI confidence
                        unread: draft.status === 'PENDING',
                        status: draft.status
                    }));
                    setApprovals(mapped);
                    if (mapped.length > 0) setSelectedId(mapped[0].id);
                }
            } catch (error) {
                console.error("Failed to fetch email approvals from n8n", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDrafts();
    }, []);

    const selectedApp = approvals.find(a => a.id === selectedId);

    const handleApprove = async () => {
        if (!selectedApp) return;
        if (selectedApp.id.toString().startsWith("mock")) {
            // just update UI for mocks
            setApprovals(prev => prev.map(a => a.id === selectedApp.id ? { ...a, status: 'APPROVED', unread: false } : a));
            return;
        }
        
        try {
            await axios.post(`/api/email-drafts/${selectedApp.id}/approve`);
            setApprovals(prev => prev.map(a => a.id === selectedApp.id ? { ...a, status: 'APPROVED', unread: false } : a));
        } catch (error) {
            console.error("Failed to approve", error);
            alert("Failed to approve. Is the backend or n8n webhook running?");
        }
    };

    const handleReject = async () => {
        if (!selectedApp) return;
        if (selectedApp.id.toString().startsWith("mock")) {
            setApprovals(prev => prev.map(a => a.id === selectedApp.id ? { ...a, status: 'REJECTED', unread: false } : a));
            return;
        }

        try {
            await axios.post(`/api/email-drafts/${selectedApp.id}/reject`);
            setApprovals(prev => prev.map(a => a.id === selectedApp.id ? { ...a, status: 'REJECTED', unread: false } : a));
        } catch (error) {
            console.error("Failed to reject", error);
        }
    };

    const stats = {
        pending: approvals.filter(a => a.status === 'PENDING').length,
        approved: approvals.filter(a => a.status === 'APPROVED').length,
        auto: 18, // static for UI parity
        rejected: approvals.filter(a => a.status === 'REJECTED').length,
        total: approvals.length + 18
    };

    return (
        <div className="ap-page">
            {/* Header */}
            <div className="ap-header">
                <div className="ap-header-left">
                    <div className="ap-title-row">
                        <CheckCircle2 className="ap-title-icon" size={24} />
                        <h1 className="ap-title">Approvals</h1>
                    </div>
                    <p className="ap-subtitle">Review and approve AI-generated email replies before they are sent.</p>
                </div>
                <div className="ap-header-right">
                    <div className="ap-search-box">
                        <Search size={16} />
                        <input type="text" placeholder="Search approvals..." />
                    </div>
                    <button className="ap-btn-filter">
                        <Filter size={16} /> Filters
                    </button>
                    <div className="ap-bell-wrapper">
                        <Bell size={20} />
                        <div className="ap-bell-badge">3</div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="ap-stats-container">
                <div className="ap-stat-card">
                    <div className="ap-stat-icon-wrap" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                        <Briefcase size={20} />
                    </div>
                    <div className="ap-stat-info">
                        <div className="ap-stat-title">Pending Approval</div>
                        <div className="ap-stat-value">{stats.pending}</div>
                        <div className="ap-stat-sub">Requires your review</div>
                    </div>
                </div>
                <div className="ap-stat-card">
                    <div className="ap-stat-icon-wrap" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="ap-stat-info">
                        <div className="ap-stat-title">Approved</div>
                        <div className="ap-stat-value">{stats.approved}</div>
                        <div className="ap-stat-sub">Approved by you</div>
                    </div>
                </div>
                <div className="ap-stat-card">
                    <div className="ap-stat-icon-wrap" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                        <Clock size={20} />
                    </div>
                    <div className="ap-stat-info">
                        <div className="ap-stat-title">Auto-approved</div>
                        <div className="ap-stat-value">{stats.auto}</div>
                        <div className="ap-stat-sub">Approved automatically</div>
                    </div>
                </div>
                <div className="ap-stat-card">
                    <div className="ap-stat-icon-wrap" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                        <XCircle size={20} />
                    </div>
                    <div className="ap-stat-info">
                        <div className="ap-stat-title">Rejected</div>
                        <div className="ap-stat-value">{stats.rejected}</div>
                        <div className="ap-stat-sub">Rejected by you</div>
                    </div>
                </div>
                <div className="ap-stat-card">
                    <div className="ap-stat-icon-wrap" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                        <Briefcase size={20} />
                    </div>
                    <div className="ap-stat-info">
                        <div className="ap-stat-title">Total</div>
                        <div className="ap-stat-value">{stats.total}</div>
                        <div className="ap-stat-sub">All email replies</div>
                    </div>
                </div>
            </div>

            {/* Layout Main */}
            <div className="ap-layout">
                {/* Left Pane: List */}
                <div className={`ap-list-pane ${mobileView === 'detail' ? 'ap-mobile-hidden' : ''}`}>
                    <div className="ap-list-controls">
                        <div className="ap-list-tabs">
                            <button className="ap-list-tab active">All ({approvals.length})</button>
                            <button className="ap-list-tab">High Priority</button>
                            <button className="ap-list-tab">Medium</button>
                            <button className="ap-list-tab">Low</button>
                        </div>
                        <button className="ap-sort-btn">
                            Sort: Newest <ChevronDown size={14} />
                        </button>
                    </div>
                    
                    <div className="ap-list">
                        {approvals.map(item => (
                            <div 
                                key={item.id} 
                                className={`ap-list-item ${selectedId === item.id ? 'selected' : ''}`}
                                onClick={() => {
                                    setSelectedId(item.id);
                                    setMobileView('detail');
                                    if(item.unread) {
                                        setApprovals(prev => prev.map(a => a.id === item.id ? {...a, unread: false} : a));
                                    }
                                }}
                            >
                                <input type="checkbox" className="ap-item-checkbox" />
                                <div className="ap-item-icon">M</div>
                                <div className="ap-item-content">
                                    <div className="ap-item-title-row">
                                        <div className="ap-item-title" style={{ textDecoration: item.status === 'REJECTED' ? 'line-through' : 'none' }}>
                                            {item.subject}
                                        </div>
                                    </div>
                                    <div className="ap-item-sender">From: {item.from}</div>
                                    <div className="ap-item-snippet">{item.snippet}</div>
                                </div>
                                <div className="ap-item-time">
                                    <span className={`ap-priority-badge ${item.priority.toLowerCase()}`}>
                                        <Briefcase size={10} /> {item.priority}
                                    </span>
                                    <span>{item.timeAgo}</span>
                                    {item.unread && item.status === 'PENDING' && <div className="ap-unread-dot"></div>}
                                </div>
                            </div>
                        ))}
                        {approvals.length === 0 && !loading && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                No approvals found.
                            </div>
                        )}
                    </div>

                    <div className="ap-list-footer">
                        <span>Showing 1 to {approvals.length} of {approvals.length} approvals</span>
                        <div className="ap-pagination-controls">
                            <button className="ap-page-btn"><ChevronLeft size={14} /></button>
                            <button className="ap-page-btn active">1</button>
                            <button className="ap-page-btn">2</button>
                            <button className="ap-page-btn"><ChevronRight size={14} /></button>
                        </div>
                    </div>
                </div>

                {/* Right Pane: Detail */}
                {selectedApp ? (
                    <div className={`ap-detail-pane ${mobileView === 'list' ? 'ap-mobile-hidden' : ''}`}>
                        <button className="ap-back-btn" onClick={() => setMobileView('list')}>
                            ← Back to Approvals
                        </button>
                        <div className="ap-detail-header">
                            <div className="ap-detail-title-row">
                                <div className="ap-detail-title">
                                    {selectedApp.subject} 
                                    <span className={`ap-priority-badge ${selectedApp.priority.toLowerCase()}`}>
                                        <Briefcase size={10} /> {selectedApp.priority} Priority
                                    </span>
                                </div>
                                <div className="ap-detail-actions">
                                    <button className="ap-action-icon"><Maximize2 size={16} /></button>
                                    <button className="ap-action-icon"><MoreVertical size={16} /></button>
                                </div>
                            </div>
                            <div className="ap-detail-meta">
                                <div className="ap-meta-left">
                                    <span><span className="ap-meta-label">From:</span> {selectedApp.from}</span>
                                    <span><span className="ap-meta-label">To:</span> {selectedApp.to}</span>
                                </div>
                                <div className="ap-meta-right">
                                    Received: {selectedApp.receivedDate}
                                </div>
                            </div>
                        </div>

                        <div className="ap-detail-tabs">
                            <div 
                                className={`ap-detail-tab ${detailTab === 'reply' ? 'active' : ''}`}
                                onClick={() => setDetailTab('reply')}
                            >
                                <Sparkles size={16} /> AI Generated Reply
                            </div>
                            <div 
                                className={`ap-detail-tab ${detailTab === 'original' ? 'active' : ''}`}
                                onClick={() => setDetailTab('original')}
                            >
                                Original Email
                            </div>
                        </div>

                        <div className="ap-detail-body">
                            {detailTab === 'reply' ? (
                                selectedApp.replyDraft.split('\n').map((line, i) => (
                                    <React.Fragment key={i}>
                                        {line}<br/>
                                    </React.Fragment>
                                ))
                            ) : (
                                selectedApp.originalEmailText.split('\n').map((line, i) => (
                                    <React.Fragment key={i}>
                                        {line}<br/>
                                    </React.Fragment>
                                ))
                            )}

                            <div className="ap-detail-body-footer">
                                <span>Generated at: {selectedApp.receivedDate}</span>
                                <button className="ap-copy-btn">
                                    <Copy size={14} /> Copy
                                </button>
                            </div>
                        </div>

                        <div className="ap-confidence">
                            <div className="ap-conf-text">
                                <div className="ap-conf-title">
                                    AI Confidence Score <Briefcase size={14} color="#a8a29e" />
                                </div>
                                <div className="ap-conf-sub">This reply is relevant and safe to send.</div>
                            </div>
                            <div className="ap-conf-circle">
                                {selectedApp.confidence}%
                            </div>
                        </div>

                        <div className="ap-detail-footer">
                            <button className="ap-btn-reject" onClick={handleReject} disabled={selectedApp.status !== 'PENDING'}>
                                <X size={16} /> {selectedApp.status === 'REJECTED' ? 'Rejected' : 'Reject'}
                            </button>
                            <div className="ap-footer-right">
                                <button className="ap-btn-edit">
                                    <Edit3 size={16} /> Edit Reply
                                </button>
                                <button 
                                    className="ap-btn-approve" 
                                    onClick={handleApprove}
                                    disabled={selectedApp.status !== 'PENDING'}
                                    style={{ background: selectedApp.status === 'APPROVED' ? '#10b981' : '' }}
                                >
                                    {selectedApp.status === 'APPROVED' ? <CheckCircle2 size={16} /> : <Send size={16} />}
                                    {selectedApp.status === 'APPROVED' ? 'Approved & Sent' : 'Approve & Send'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="ap-detail-pane" style={{ alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                        Select an approval request to view details.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Approvals;
