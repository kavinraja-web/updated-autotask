import React, { useState, useEffect, useCallback } from 'react';
import {
    Mail, RefreshCw, Cpu, Search, Bell, ChevronDown, Filter,
    ChevronLeft, ChevronRight, Star, Archive, MoreHorizontal, Calendar, Inbox,
    CheckCircle, Tag, Zap, Plus, FileText, Download, MessageSquare
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import axios from 'axios';
import './EmailAnalysis.css';

const EmailAnalysis = () => {
    const [emails, setEmails] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All');
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    
    // AI Reply state
    const [aiReplyDraft, setAiReplyDraft] = useState('');
    const [isGeneratingReply, setIsGeneratingReply] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);

    const userEmail = localStorage.getItem('user_email') || 'kavinraja.250194@gmail.com';
    const userName = userEmail.split('@')[0];
    const initials = userName.charAt(0).toUpperCase();

    // ─── Fetch emails ────────────────────────────────────────────
    const fetchEmails = useCallback(() => {
        setLoading(true);
        axios.get('/api/emails')
            .then(res => setEmails(res.data))
            .catch(err => console.error('Failed to fetch emails:', err))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchEmails();
    }, [fetchEmails]);

    // ─── Sync & Analyze ─────────────────────────────────────────
    const syncInbox = () => {
        setIsSyncing(true);
        axios.post('/api/emails/sync-inbox')
            .then(() => fetchEmails())
            .catch(err => console.error('Sync failed:', err))
            .finally(() => setIsSyncing(false));
    };

    const triggerAiAnalysis = () => {
        setIsAnalyzing(true);
        axios.post('/api/emails/analyze')
            .then(() => {
                let attempts = 0;
                const poll = setInterval(() => {
                    attempts++;
                    fetchEmails();
                    if (attempts >= 10) {
                        clearInterval(poll);
                        setIsAnalyzing(false);
                    }
                }, 5000);
            })
            .catch(err => {
                console.error('AI analysis trigger failed:', err);
                setIsAnalyzing(false);
            });
    };

    // ─── Select Email ───────────────────────────────────────────
    const handleEmailClick = (email) => {
        setSelectedEmail(email); // Set optimistic
        setDetailLoading(true);
        setAiReplyDraft('');
        
        axios.get(`/api/emails/${email.id}`)
            .then(res => setSelectedEmail(res.data))
            .catch(err => console.error('Failed to load body', err))
            .finally(() => setDetailLoading(false));
    };

    // ─── AI Reply Logic ─────────────────────────────────────────
    const handleGenerateReply = () => {
        if (!selectedEmail) return;
        setIsGeneratingReply(true);
        setSendSuccess(false);
        axios.post('/api/agent/generate-reply', {
            subject: selectedEmail.subject,
            body: selectedEmail.body || selectedEmail.snippet || ''
        }).then(res => {
            setAiReplyDraft(res.data.reply);
        }).catch(err => {
            console.error('Failed to generate reply:', err);
            setAiReplyDraft('Failed to generate reply.');
        }).finally(() => {
            setIsGeneratingReply(false);
        });
    };

    const handleSendDirectly = () => {
        if (!selectedEmail || !aiReplyDraft) return;
        setIsSending(true);
        setSendSuccess(false);
        const to = extractEmailAddress(selectedEmail.sender);
        axios.post('/api/agent/execute', {
            action: 'send_email',
            data: { to, subject: `Re: ${selectedEmail.subject.replace(/^Re:\s*/i, '')}`, body: aiReplyDraft }
        }).then(() => {
            setSendSuccess(true);
            setTimeout(() => setSendSuccess(false), 3000);
        }).catch(err => {
            console.error('Failed to send email:', err);
            alert('Failed to send email.');
        }).finally(() => setIsSending(false));
    };

    const extractEmailAddress = (senderStr) => {
        if (!senderStr) return '';
        const match = senderStr.match(/<(.+)>/);
        return match ? match[1] : senderStr;
    };

    // ─── Download Report ────────────────────────────────────────
    const handleDownloadReport = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Email Analysis Report', 14, 22);
        
        const tableColumn = ["Subject", "Summary", "Date"];
        const tableRows = emails.slice(0, 50).map(email => [
            email.subject || '(No Subject)',
            email.snippet || 'No summary',
            new Date(email.processedAt).toLocaleDateString()
        ]);

        doc.autoTable({
            startY: 35,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [124, 58, 237] },
            styles: { fontSize: 9 }
        });
        doc.save('Email_Analysis_Report.pdf');
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    };

    const getSenderName = (sender) => {
        if (!sender) return 'Unknown Sender';
        const match = sender.match(/^([^<]+)/);
        return match ? match[1].trim() : sender;
    };

    // Filter emails
    const filteredEmails = emails.filter(e => {
        if (searchTerm) {
            const subjMatch = e.subject ? e.subject.toLowerCase().includes(searchTerm.toLowerCase()) : false;
            const senderMatch = e.sender ? e.sender.toLowerCase().includes(searchTerm.toLowerCase()) : false;
            if (!subjMatch && !senderMatch) return false;
        }
        if (activeTab === 'Unread' && e.aiStatus !== 'PENDING') return false; // Mocking unread as pending
        if (activeTab === 'Important' && (!e.subject || !e.subject.toLowerCase().includes('important'))) return false;
        return true;
    });

    const pendingCount = emails.filter(e => e.aiStatus === 'PENDING').length;

    // Helper for random colored initial icons for senders
    const getInitialsColor = (name) => {
        const colors = ['#8B5CF6', '#10B981', '#F59E0B', '#3B82F6', '#EC4899'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div className="email-analysis-page">
            
            {/* TOP BAR */}
            <header className="ea-header">
                <div className="ea-title-block">
                    <div className="ea-title-icon-wrapper">
                        <Zap size={22} className="ea-title-icon" />
                    </div>
                    <div>
                        <h1 className="ea-title">Email Analysis</h1>
                        <p className="ea-subtitle">AI-powered insights from your inbox</p>
                    </div>
                </div>

                <div className="ea-topbar-right">
                    <div className="ea-search-bar">
                        <Search size={16} className="ea-search-icon" />
                        <input
                            type="text"
                            placeholder="Search emails, senders, keywords..."
                            className="ea-search-input"
                        />
                        <span className="ea-search-kbd">⌘ K</span>
                    </div>

                    <div className="ea-user-chip">
                        <div className="ea-user-avatar">{initials}</div>
                        <div className="ea-user-info">
                            <span className="ea-user-name">{userName}</span>
                            <span className="ea-user-status">Gmail Connected</span>
                        </div>
                        <ChevronDown size={14} className="ea-user-chevron" />
                    </div>
                </div>
            </header>

            {/* MAIN SPLIT CONTENT */}
            <div className="ea-main-content">
                
                {/* LEFT LIST COLUMN */}
                <div className={`ea-list-col ${selectedEmail ? 'hide-on-mobile' : ''}`}>
                    {/* Controls */}
                    <div className="eal-controls">
                        <div className="eal-search-box">
                            <Search size={14} className="eal-icon" />
                            <input 
                                type="text" 
                                placeholder="Search emails..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        <div className="eal-action-row" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                            <button 
                                className="eal-btn primary" 
                                onClick={triggerAiAnalysis} 
                                disabled={isAnalyzing}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.5rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: 'none', background: '#7C3AED', color: '#FFF' }}
                            >
                                <Cpu size={14} className={isAnalyzing ? 'spin' : ''} />
                                {isAnalyzing ? 'Analyzing...' : 'Run AI Analysis'}
                            </button>
                            <button 
                                className="eal-btn secondary" 
                                onClick={syncInbox} 
                                disabled={isSyncing}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.5rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#4B5563' }}
                            >
                                <RefreshCw size={14} className={isSyncing ? 'spin' : ''} />
                                {isSyncing ? 'Syncing...' : 'Sync Inbox'}
                            </button>
                        </div>
                        
                        <div className="eal-tabs" style={{ marginTop: '0.75rem' }}>
                            {['All', 'Unread', 'Important', 'AI Alerts'].map(tab => (
                                <button 
                                    key={tab} 
                                    className={`eal-tab ${activeTab === tab ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab} {tab === 'All' && <span className="tab-count">({emails.length})</span>}
                                    {tab === 'Unread' && <span className="tab-count">({pendingCount})</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Email List */}
                    <div className="eal-list">
                        {loading && <div className="eal-empty">Loading emails...</div>}
                        {!loading && filteredEmails.length === 0 && <div className="eal-empty">No emails found.</div>}
                        
                        {filteredEmails.map(email => {
                            const senderName = getSenderName(email.sender);
                            const senderInitials = senderName.substring(0, 2).toUpperCase();
                            const isUnread = email.aiStatus === 'PENDING';
                            const isSelected = selectedEmail?.id === email.id;

                            return (
                                <div 
                                    key={email.id} 
                                    className={`eal-item ${isSelected ? 'selected' : ''} ${isUnread ? 'unread' : ''}`}
                                    onClick={() => handleEmailClick(email)}
                                >
                                    <div className="eal-item-header">
                                        <div className="eal-sender-info">
                                            <div className="eal-avatar" style={{ backgroundColor: getInitialsColor(senderName) }}>
                                                {senderInitials}
                                            </div>
                                            <span className="eal-sender-name">{senderName}</span>
                                            {isUnread && <span className="eal-badge badge-purple">Pending AI</span>}
                                        </div>
                                        <span className="eal-time">
                                            {new Date(email.processedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="eal-subject">{email.subject || '(No Subject)'}</div>
                                    <div className="eal-snippet">{email.snippet || 'No preview available.'}</div>
                                    {isUnread && <div className="eal-unread-dot"></div>}
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Pagination */}
                    <div className="eal-pagination">
                        <button><ChevronLeft size={14}/></button>
                        <button className="active">1</button>
                        <button>2</button>
                        <button>3</button>
                        <span>...</span>
                        <button><ChevronRight size={14}/></button>
                    </div>
                </div>

                {/* RIGHT DETAIL COLUMN */}
                {selectedEmail ? (
                    <div className="ea-detail-col">
                        
                        {/* Detail Top Bar */}
                        <div className="ead-top-bar">
                            <button className="ead-back-btn" onClick={() => setSelectedEmail(null)}>
                                <ChevronLeft size={16} /> Back to emails
                            </button>
                            <div className="ead-actions">
                                <button><CheckCircle size={14} /> Mark as Unread</button>
                                <button><Star size={14} /> Star</button>
                                <button><Archive size={14} /> Archive</button>
                                <button><MoreHorizontal size={14} /> More</button>
                            </div>
                        </div>

                        {/* Detail Scrollable Content */}
                        <div className="ead-scroll-area">
                            
                            {/* Email Header Card */}
                            <div className="ead-header-card">
                                <div className="ead-header-top">
                                    <div className="ead-sender-avatar">
                                        <Mail size={20} color="#7C3AED" />
                                    </div>
                                    <div className="ead-title-info">
                                        <h2 className="ead-subject">{selectedEmail.subject}</h2>
                                        <div className="ead-sender-line">
                                            <strong>{getSenderName(selectedEmail.sender)}</strong> 
                                            <span className="ead-email-address">&lt;{extractEmailAddress(selectedEmail.sender)}&gt;</span>
                                            <span className="ead-to-me">to me <ChevronDown size={12}/></span>
                                        </div>
                                    </div>
                                    <div className="ead-date-info">
                                        <div className="ead-time">{new Date(selectedEmail.processedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                                        <div className="ead-date">{new Date(selectedEmail.processedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                        <span className="ead-badge">Important</span>
                                    </div>
                                </div>

                                <div className="ead-meta-row">
                                    <div className="ead-meta-item"><Calendar size={13}/> {formatDate(selectedEmail.processedAt)}</div>
                                    <div className="ead-meta-item"><Inbox size={13}/> Received in Inbox</div>
                                    <div className="ead-meta-item"><Tag size={13}/> Related to Events</div>
                                    <div className="ead-meta-confidence">
                                        <Zap size={13}/> AI Confidence: 99%
                                        <div className="ead-progress-bar"><div className="ead-progress-fill"></div></div>
                                    </div>
                                </div>
                            </div>

                            {/* Two Column Split: AI Insights vs Original Body */}
                            <div className="ead-content-split">
                                
                                {/* Inner Left: AI Summary */}
                                <div className="ead-ai-col">
                                    <div className="ead-card">
                                        <h3 className="ead-card-title"><Zap size={16} color="#7C3AED" /> AI Summary</h3>
                                        <p className="ead-summary-text">
                                            {selectedEmail.snippet || "The AI has analyzed this email to extract key information. Review the summary below."}
                                        </p>
                                        <div className="ead-key-values">
                                            <div className="ead-kv">
                                                <span className="ead-k"><Calendar size={12}/> Date</span>
                                                <span className="ead-v">{new Date(selectedEmail.processedAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="ead-kv">
                                                <span className="ead-k"><Mail size={12}/> Source</span>
                                                <span className="ead-v">{extractEmailAddress(selectedEmail.sender)}</span>
                                            </div>
                                            <div className="ead-kv">
                                                <span className="ead-k"><CheckCircle size={12}/> AI Status</span>
                                                <span className="ead-v">{selectedEmail.aiStatus}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Suggested Actions */}
                                    <div className="ead-card">
                                        <h3 className="ead-card-title"><Zap size={16} color="#7C3AED" /> AI Suggested Actions</h3>
                                        <div className="ead-actions-grid">
                                            <button className="ead-action-btn">
                                                <div className="ead-ab-icon purple"><CheckCircle size={16}/></div>
                                                <div className="ead-ab-text">
                                                    <strong>Create Task</strong>
                                                    <span>Create a task from this email</span>
                                                </div>
                                                <Plus size={16} className="ead-ab-plus" />
                                            </button>
                                            <button className="ead-action-btn">
                                                <div className="ead-ab-icon blue"><Bell size={16}/></div>
                                                <div className="ead-ab-text">
                                                    <strong>Add Reminder</strong>
                                                    <span>Set reminder to follow up</span>
                                                </div>
                                                <Plus size={16} className="ead-ab-plus" />
                                            </button>
                                            <button className="ead-action-btn" onClick={handleGenerateReply}>
                                                <div className="ead-ab-icon orange"><MessageSquare size={16}/></div>
                                                <div className="ead-ab-text">
                                                    <strong>Draft AI Reply</strong>
                                                    <span>Generate a smart response</span>
                                                </div>
                                                <Plus size={16} className="ead-ab-plus" />
                                            </button>
                                        </div>

                                        {/* AI Reply Inline Editor */}
                                        {aiReplyDraft && (
                                            <div className="ead-reply-editor">
                                                <textarea 
                                                    value={aiReplyDraft} 
                                                    onChange={(e) => setAiReplyDraft(e.target.value)}
                                                    rows={4}
                                                />
                                                <div className="ead-reply-actions">
                                                    <button className="btn-cancel" onClick={() => setAiReplyDraft('')}>Discard</button>
                                                    <button className="btn-send" onClick={handleSendDirectly} disabled={isSending}>
                                                        {isSending ? 'Sending...' : sendSuccess ? 'Sent!' : 'Send Reply'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Inner Right: Original Email */}
                                <div className="ead-original-col">
                                    <div className="ead-card ead-original-card">
                                        <div className="ead-card-header">
                                            <h3 className="ead-card-title"><FileText size={16} color="#7C3AED"/> Original Email</h3>
                                            {selectedEmail.messageId && (
                                                <a 
                                                    href={`https://mail.google.com/mail/u/0/#inbox/${selectedEmail.messageId}`}
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="ead-link-btn" 
                                                    style={{ textDecoration: 'none' }}
                                                >
                                                    Open in Gmail
                                                </a>
                                            )}
                                        </div>
                                        <div className="ead-original-body">
                                            {detailLoading ? (
                                                <div style={{ color: '#9CA3AF' }}>Loading full body...</div>
                                            ) : selectedEmail.body ? (
                                                <div dangerouslySetInnerHTML={{ __html: selectedEmail.body }} />
                                            ) : (
                                                <div style={{ color: '#9CA3AF' }}>No detailed body available.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="ea-detail-empty hide-on-mobile">
                        <div className="eae-icon">
                            <Mail size={48} />
                        </div>
                        <h2>Select an email</h2>
                        <p>Click on an email from the list to view its AI-powered analysis and suggested actions.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmailAnalysis;
