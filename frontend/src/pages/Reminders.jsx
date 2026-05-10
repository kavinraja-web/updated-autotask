import React, { useState, useEffect } from 'react';
import {
    Search, Plus, Bell, ChevronDown, Calendar, ChevronLeft, ChevronRight,
    MoreVertical, Mail, FileText, Users, Send, Database, Gift, BarChart3,
    CheckCircle2, Clock, AlertCircle, List, PlayCircle, BellOff
} from 'lucide-react';
import axios from 'axios';
import './Reminders.css';

const initialMockReminders = [
    {
        id: 1, title: "Send Progress Report Email", desc: "Compose and send progress report email to the team.",
        iconType: "mail", iconColor: "purple", type: "Task Reminder", typeColor: "purple",
        scheduleDate: "May 16, 2024", scheduleTime: "10:00 AM", freq: "Every Monday", status: "Active", statusColor: "green"
    },
    {
        id: 2, title: "Prepare Progress Report", desc: "Collect and summarize the latest progress updates.",
        iconType: "file", iconColor: "blue", type: "Task Reminder", typeColor: "blue",
        scheduleDate: "May 16, 2024", scheduleTime: "9:30 AM", freq: "Every Monday", status: "Active", statusColor: "green"
    },
    {
        id: 3, title: "Review Report Content", desc: "Review the report for accuracy and completeness.",
        iconType: "users", iconColor: "green", type: "Task Reminder", typeColor: "green",
        scheduleDate: "May 16, 2024", scheduleTime: "9:45 AM", freq: "Every Monday", status: "Active", statusColor: "green"
    },
    {
        id: 4, title: "Follow Up on Responses", desc: "Check replies and follow up on any important feedback.",
        iconType: "send", iconColor: "orange", type: "Task Reminder", typeColor: "orange",
        scheduleDate: "May 16, 2024", scheduleTime: "11:00 AM", freq: "Every Monday", status: "Snoozed", statusColor: "orange"
    },
    {
        id: 5, title: "Database Backup", desc: "Backup the database to ensure data safety and prevent data loss.",
        iconType: "database", iconColor: "purple", type: "System Reminder", typeColor: "purple",
        scheduleDate: "May 15, 2024", scheduleTime: "2:00 AM", freq: "Every day", status: "Active", statusColor: "green"
    },
    {
        id: 6, title: "Birthday Wishes", desc: "Send birthday wishes to team members on their special day.",
        iconType: "gift", iconColor: "red", type: "Personal Reminder", typeColor: "red",
        scheduleDate: "May 14, 2024", scheduleTime: "9:00 AM", freq: "On event day", status: "Disabled", statusColor: "red"
    }
];

const Reminders = () => {
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', scheduleDate: '', scheduleTime: '' });
    const [saving, setSaving] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [showNotifs, setShowNotifs] = useState(false);
    const [toast, setToast] = useState('');

    useEffect(() => {
        const fetchReminders = async () => {
            try {
                const res = await axios.get('/api/reminders');
                if (res.data && res.data.length > 0) {
                    const mapped = res.data.map((rem, i) => ({
                        id: rem.emailId || `api-${i}`,
                        title: rem.subject || 'Smart Email Reminder',
                        desc: rem.snippet || 'Deadline detected from incoming mail.',
                        iconType: 'mail', iconColor: 'purple',
                        type: 'Smart Reminder', typeColor: 'purple',
                        scheduleDate: rem.deadlineDate ? new Date(rem.deadlineDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Soon',
                        scheduleTime: rem.deadlineText || 'Pending',
                        freq: 'Once',
                        status: rem.urgency === 'Overdue' ? 'Disabled' : 'Active',
                        statusColor: rem.urgency === 'Overdue' ? 'red' : 'green'
                    }));
                    setReminders(mapped);
                } else {
                    setReminders(initialMockReminders);
                }
            } catch { setReminders(initialMockReminders); }
            finally { setLoading(false); }
        };
        fetchReminders();
        axios.get('/api/notifications/unread').then(r => setNotifications(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    }, []);

    const handleCreateReminder = async () => {
        if (!form.title.trim()) { setToast('Please enter a reminder title.'); setTimeout(() => setToast(''), 3000); return; }
        setSaving(true);
        try {
            const dt = form.scheduleDate && form.scheduleTime
                ? `${form.scheduleDate}T${form.scheduleTime}:00`
                : new Date(Date.now() + 86400000).toISOString().slice(0, 19);
            await axios.post('/api/tasks', {
                title: form.title.trim(),
                description: form.description.trim() || 'Reminder',
                priority: 'Medium', status: 'Pending', deadline: dt
            });
            setToast('✅ Reminder created successfully!');
            setShowModal(false);
            setForm({ title: '', description: '', scheduleDate: '', scheduleTime: '' });
            setReminders(prev => [{
                id: Date.now(), title: form.title, desc: form.description || 'Reminder',
                iconType: 'bell', iconColor: 'purple', type: 'Task Reminder', typeColor: 'purple',
                scheduleDate: form.scheduleDate || 'Soon', scheduleTime: form.scheduleTime || '',
                freq: 'Once', status: 'Active', statusColor: 'green'
            }, ...prev]);
        } catch { setToast('❌ Failed to create reminder.'); }
        finally { setSaving(false); setTimeout(() => setToast(''), 4000); }
    };

    const getIcon = (type, size = 18) => {
        switch (type) {
            case 'mail': return <Mail size={size} />;
            case 'file': return <FileText size={size} />;
            case 'users': return <Users size={size} />;
            case 'send': return <Send size={size} />;
            case 'database': return <Database size={size} />;
            case 'gift': return <Gift size={size} />;
            case 'chart': return <BarChart3 size={size} />;
            default: return <Bell size={size} />;
        }
    };

    const toggleStatus = (id) => {
        setReminders(prev => prev.map(r => {
            if (r.id === id) {
                const newStatus = r.status === 'Active' ? 'Disabled' : 'Active';
                return { ...r, status: newStatus, statusColor: newStatus === 'Active' ? 'green' : 'red' };
            }
            return r;
        }));
    };

    const stats = {
        total: reminders.length,
        active: reminders.filter(r => r.status === 'Active').length,
        snoozed: reminders.filter(r => r.status === 'Snoozed').length,
        triggered: 7, // Mock static for visual parity
        disabled: reminders.filter(r => r.status === 'Disabled').length
    };

    return (
        <div className="rm-page">
            {/* Header */}
            <div className="rm-header">
                <div className="rm-header-left">
                    <div className="rm-title-row">
                        <Bell className="rm-title-icon" size={24} />
                        <h1 className="rm-title">Reminders</h1>
                    </div>
                    <p className="rm-subtitle">Create, manage, and customize reminders to stay on top of your tasks.</p>
                </div>
                <div className="rm-header-right">
                    <button className="rm-btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> Create Reminder
                    </button>
                    <div style={{position:'relative'}}>
                        <div className="rm-bell-wrapper" onClick={() => setShowNotifs(v => !v)} style={{cursor:'pointer'}}>
                            <Bell size={20} />
                            {notifications.length > 0 && <div className="rm-bell-badge">{notifications.length}</div>}
                        </div>
                        {showNotifs && (
                            <div style={{position:'absolute',right:0,top:'120%',width:280,background:'white',borderRadius:12,boxShadow:'0 8px 30px rgba(0,0,0,0.15)',zIndex:999,border:'1px solid #e2e8f0'}}>
                                <div style={{padding:'0.75rem 1rem',fontWeight:700,fontSize:'0.88rem',borderBottom:'1px solid #f1f5f9'}}>Notifications</div>
                                <div style={{maxHeight:220,overflowY:'auto'}}>
                                    {notifications.length === 0 ? <div style={{padding:'1rem',textAlign:'center',color:'#64748b',fontSize:'0.82rem'}}>All caught up! 🎉</div>
                                    : notifications.map(n => <div key={n.id} style={{padding:'0.65rem 1rem',borderBottom:'1px solid #f8fafc',fontSize:'0.82rem'}}>{n.message}</div>)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="rm-stats-container">
                <div className="rm-stat-card purple">
                    <div className="rm-stat-icon-wrap bg-purple c-purple">
                        <Bell size={20} />
                    </div>
                    <div className="rm-stat-info">
                        <div className="rm-stat-title">Total Reminders</div>
                        <div className="rm-stat-value">{stats.total}</div>
                        <div className="rm-stat-sub">All active reminders</div>
                    </div>
                </div>
                <div className="rm-stat-card green">
                    <div className="rm-stat-icon-wrap bg-green c-green">
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="rm-stat-info">
                        <div className="rm-stat-title">Active</div>
                        <div className="rm-stat-value">{stats.active}</div>
                        <div className="rm-stat-sub">Currently enabled</div>
                    </div>
                </div>
                <div className="rm-stat-card orange">
                    <div className="rm-stat-icon-wrap bg-orange c-orange">
                        <Clock size={20} />
                    </div>
                    <div className="rm-stat-info">
                        <div className="rm-stat-title">Snoozed</div>
                        <div className="rm-stat-value">{stats.snoozed}</div>
                        <div className="rm-stat-sub">Snoozed reminders</div>
                    </div>
                </div>
                <div className="rm-stat-card blue">
                    <div className="rm-stat-icon-wrap bg-blue c-blue">
                        <Calendar size={20} />
                    </div>
                    <div className="rm-stat-info">
                        <div className="rm-stat-title">Triggered Today</div>
                        <div className="rm-stat-value">{stats.triggered}</div>
                        <div className="rm-stat-sub">Sent reminders</div>
                    </div>
                </div>
                <div className="rm-stat-card red">
                    <div className="rm-stat-icon-wrap bg-red c-red">
                        <BellOff size={20} />
                    </div>
                    <div className="rm-stat-info">
                        <div className="rm-stat-title">Disabled</div>
                        <div className="rm-stat-value">{stats.disabled}</div>
                        <div className="rm-stat-sub">Currently disabled</div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="rm-controls-row">
                <div className="rm-search-box">
                    <Search size={16} />
                    <input type="text" placeholder="Search reminders..." />
                </div>
                <div className="rm-filters">
                    <button className="rm-dropdown-btn">
                        All Status <ChevronDown size={14} className="c-gray" />
                    </button>
                    <button className="rm-dropdown-btn">
                        All Types <ChevronDown size={14} className="c-gray" />
                    </button>
                    <button className="rm-dropdown-btn">
                        <Clock size={14} className="c-gray" /> Sort by: Next Reminder <ChevronDown size={14} className="c-gray" />
                    </button>
                    <div className="rm-view-toggles">
                        <button className="rm-view-btn active"><List size={16} /></button>
                        <button className="rm-view-btn"><Calendar size={16} /></button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rm-table-container">
                <table className="rm-table">
                    <thead>
                        <tr>
                            <th>Reminder</th>
                            <th>Type</th>
                            <th>Next Reminder</th>
                            <th>Frequency</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reminders.map(rem => (
                            <tr key={rem.id}>
                                <td>
                                    <div className="rm-td-task">
                                        <div className={`rm-task-icon-box bg-${rem.iconColor} c-${rem.iconColor}`}>
                                            {getIcon(rem.iconType)}
                                        </div>
                                        <div className="rm-task-texts">
                                            <span className="rm-task-title-text">{rem.title}</span>
                                            <span className="rm-task-desc-text">{rem.desc}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span className={`rm-pill bg-${rem.typeColor} c-${rem.typeColor}`}>
                                        {rem.type}
                                    </span>
                                </td>
                                <td>
                                    <div className="rm-stacked-text">
                                        <span className="rm-stacked-main"><Calendar size={14} /> {rem.scheduleDate}</span>
                                        <span>{rem.scheduleTime}</span>
                                    </div>
                                </td>
                                <td>
                                    <span style={{ fontSize: '0.85rem' }}>{rem.freq}</span>
                                </td>
                                <td>
                                    <span className={`rm-status-text c-${rem.statusColor}`}>
                                        {rem.status}
                                    </span>
                                </td>
                                <td>
                                    <div className="rm-actions">
                                        <label className="rm-switch">
                                            <input 
                                                type="checkbox" 
                                                checked={rem.status === 'Active'}
                                                onChange={() => toggleStatus(rem.id)} 
                                            />
                                            <span className="rm-slider"></span>
                                        </label>
                                        <button className="rm-actions-btn">
                                            <MoreVertical size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {/* Pagination */}
                <div className="rm-pagination">
                    <span className="rm-page-info">Showing 1 to {Math.min(6, reminders.length)} of {stats.total} reminders</span>
                    <div className="rm-page-controls">
                        <button className="rm-page-btn"><ChevronLeft size={14} /></button>
                        <button className="rm-page-btn active">1</button>
                        <button className="rm-page-btn">2</button>
                        <button className="rm-page-btn">3</button>
                        <button className="rm-page-btn" style={{border: 'none', background: 'transparent'}}>...</button>
                        <button className="rm-page-btn">4</button>
                        <button className="rm-page-btn"><ChevronRight size={14} /></button>
                    </div>
                    <div className="rm-page-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Rows per page: 
                        <button className="rm-dropdown-btn" style={{ padding: '0.3rem 0.5rem' }}>
                            10 <ChevronDown size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Banner */}
            <div className="rm-bottom-banner">
                <div className="rm-banner-left">
                    <div className="rm-banner-icon">
                        <Bell size={20} />
                    </div>
                    <div>
                        <div className="rm-banner-title">Smart Reminders</div>
                        <div className="rm-banner-sub">We'll notify you at the right time, so you never miss what matters.</div>
                    </div>
                </div>
                <button className="rm-btn-outline">
                    <PlayCircle size={16} /> How reminders work
                </button>
            </div>

            {/* Create Reminder Modal */}
            {showModal && (
                <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
                    <div style={{background:'white',borderRadius:16,padding:'1.5rem',width:'100%',maxWidth:420,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
                        <h3 style={{margin:'0 0 1rem',fontSize:'1.1rem',fontWeight:700}}>Create New Reminder</h3>
                        <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                            <input placeholder="Reminder title *" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} style={{padding:'0.65rem 0.85rem',borderRadius:8,border:'1px solid #e2e8f0',fontSize:'0.9rem',outline:'none',width:'100%',boxSizing:'border-box'}} />
                            <textarea placeholder="Notes (optional)" value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} rows={2} style={{padding:'0.65rem 0.85rem',borderRadius:8,border:'1px solid #e2e8f0',fontSize:'0.9rem',outline:'none',width:'100%',boxSizing:'border-box',resize:'vertical'}} />
                            <input type="date" value={form.scheduleDate} onChange={e => setForm(f=>({...f,scheduleDate:e.target.value}))} style={{padding:'0.65rem 0.85rem',borderRadius:8,border:'1px solid #e2e8f0',fontSize:'0.9rem'}} />
                            <input type="time" value={form.scheduleTime} onChange={e => setForm(f=>({...f,scheduleTime:e.target.value}))} style={{padding:'0.65rem 0.85rem',borderRadius:8,border:'1px solid #e2e8f0',fontSize:'0.9rem'}} />
                        </div>
                        <div style={{display:'flex',gap:'0.75rem',marginTop:'1.25rem'}}>
                            <button onClick={() => setShowModal(false)} style={{flex:1,padding:'0.7rem',borderRadius:8,border:'1px solid #e2e8f0',background:'white',fontSize:'0.9rem',cursor:'pointer'}}>Cancel</button>
                            <button onClick={handleCreateReminder} disabled={saving} style={{flex:1,padding:'0.7rem',borderRadius:8,border:'none',background:'#8b5cf6',color:'white',fontSize:'0.9rem',fontWeight:600,cursor:'pointer'}}>{saving ? 'Saving...' : 'Create Reminder'}</button>
                        </div>
                    </div>
                </div>
            )}
            {toast && (
                <div style={{position:'fixed',bottom:'1.5rem',left:'50%',transform:'translateX(-50%)',background:toast.startsWith('✅')?'#10b981':'#ef4444',color:'white',padding:'0.75rem 1.25rem',borderRadius:10,fontWeight:600,zIndex:9999,fontSize:'0.85rem'}}>
                    {toast}
                </div>
            )}
        </div>
    );
};

export default Reminders;

