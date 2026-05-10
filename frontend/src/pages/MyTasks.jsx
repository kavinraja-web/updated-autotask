import React, { useState, useEffect } from 'react';
import {
    Search, Filter, Plus, Bell, ChevronDown, Flag, Calendar, 
    MoreVertical, Mail, FileText, Users, Send, Database, Gift, BarChart3,
    CheckCircle2, Clock, AlertCircle, LayoutList, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import axios from 'axios';
import './MyTasks.css';

const initialMockTasks = [
    {
        id: 1,
        title: "Send Progress Report Email",
        desc: "Compose and send a progress report email to the team.",
        iconType: "mail", iconColor: "purple",
        category: "Communication", catColor: "purple",
        priority: "High", priColor: "red",
        schedule: "Every Monday", time: "10:00 AM",
        status: "Pending", statusColor: "orange",
        createdDate: "May 16, 2024", createdTime: "09:30 AM"
    },
    {
        id: 2,
        title: "Prepare Progress Report",
        desc: "Collect and summarize the latest progress updates.",
        iconType: "file", iconColor: "blue",
        category: "Reporting", catColor: "blue",
        priority: "High", priColor: "red",
        schedule: "Every Monday", time: "9:30 AM",
        status: "Scheduled", statusColor: "blue",
        createdDate: "May 16, 2024", createdTime: "09:28 AM"
    },
    {
        id: 3,
        title: "Review Report Content",
        desc: "Review the report for accuracy and completeness.",
        iconType: "users", iconColor: "green",
        category: "Review", catColor: "green",
        priority: "Medium", priColor: "orange",
        schedule: "Every Monday", time: "9:45 AM",
        status: "Pending", statusColor: "orange",
        createdDate: "May 16, 2024", createdTime: "09:25 AM"
    },
    {
        id: 4,
        title: "Follow Up on Responses",
        desc: "Check replies and follow up on any important feedback.",
        iconType: "send", iconColor: "orange",
        category: "Follow Up", catColor: "orange",
        priority: "Medium", priColor: "orange",
        schedule: "Every Monday", time: "11:00 AM",
        status: "Pending", statusColor: "orange",
        createdDate: "May 16, 2024", createdTime: "09:20 AM"
    },
    {
        id: 5,
        title: "Database Backup",
        desc: "Backup the database to ensure data safety and prevent data loss.",
        iconType: "database", iconColor: "purple",
        category: "Maintenance", catColor: "purple",
        priority: "High", priColor: "red",
        schedule: "Every day", time: "2:00 AM",
        status: "Completed", statusColor: "green",
        createdDate: "May 15, 2024", createdTime: "02:00 AM"
    },
    {
        id: 6,
        title: "Birthday Wishes",
        desc: "Send birthday wishes to team members on their special day.",
        iconType: "gift", iconColor: "yellow",
        category: "Personal", catColor: "yellow",
        priority: "Low", priColor: "green",
        schedule: "On event day", time: "9:00 AM",
        status: "Completed", statusColor: "green",
        createdDate: "May 14, 2024", createdTime: "09:00 AM"
    },
    {
        id: 7,
        title: "Monthly Analytics Report",
        desc: "Generate and share the monthly analytics report with stakeholders.",
        iconType: "chart", iconColor: "blue",
        category: "Reporting", catColor: "blue",
        priority: "High", priColor: "red",
        schedule: "1st of every month", time: "11:00 AM",
        status: "Scheduled", statusColor: "blue",
        createdDate: "May 1, 2024", createdTime: "11:00 AM"
    }
];

const MyTasks = () => {
    const [activeTab, setActiveTab] = useState('All Tasks');
    const [tasksData, setTasksData] = useState(initialMockTasks);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', priority: 'Medium', deadline: '' });
    const [saving, setSaving] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [showNotifs, setShowNotifs] = useState(false);
    const [toast, setToast] = useState('');

    useEffect(() => {
        const fetchCombinedTasks = async () => {
            try {
                const [tasksRes, remindersRes] = await Promise.all([
                    axios.get('/api/tasks').catch(() => ({ data: [] })),
                    axios.get('/api/reminders').catch(() => ({ data: [] }))
                ]);

                const fetchedTasks = Array.isArray(tasksRes.data) ? tasksRes.data : [];
                const fetchedReminders = Array.isArray(remindersRes.data) ? remindersRes.data : [];

                let combined = [];

                // Format normal tasks
                fetchedTasks.forEach(task => {
                    const statusVal = task.status || "Pending";
                    let statusColor = "orange";
                    if (statusVal.toLowerCase() === 'completed') statusColor = "green";
                    if (statusVal.toLowerCase() === 'scheduled') statusColor = "blue";
                    
                    combined.push({
                        id: 't-' + task.id,
                        title: task.title || "Untitled Task",
                        desc: task.description || "No description provided.",
                        iconType: "file", iconColor: "blue",
                        category: task.category || "General", catColor: "blue",
                        priority: task.priority || "Medium", 
                        priColor: task.priority === 'High' ? 'red' : (task.priority === 'Low' ? 'green' : 'orange'),
                        schedule: task.schedule || task.deadline || "No Schedule", 
                        time: task.time || "",
                        status: statusVal.charAt(0).toUpperCase() + statusVal.slice(1), 
                        statusColor: statusColor,
                        createdDate: task.createdAt ? new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Recently", 
                        createdTime: ""
                    });
                });

                // Format smart email reminders
                fetchedReminders.forEach(rem => {
                    const urgency = rem.urgency || "Medium";
                    let priLevel = "Medium";
                    let priColor = "orange";
                    
                    if (urgency === "High" || urgency === "Critical" || urgency === "Overdue" || urgency === "Today") {
                        priLevel = "High"; priColor = "red";
                    } else if (urgency === "Low") {
                        priLevel = "Low"; priColor = "green";
                    }

                    combined.push({
                        id: 'r-' + (rem.emailId || Math.random()),
                        title: rem.subject || "Email Task",
                        desc: rem.snippet || "Deadline automatically detected from email.",
                        iconType: "mail", iconColor: "purple",
                        category: "Communication", catColor: "purple",
                        priority: priLevel, 
                        priColor: priColor,
                        schedule: rem.deadlineText || "Detected Deadline", 
                        time: rem.deadlineDate ? new Date(rem.deadlineDate).toLocaleDateString() : "",
                        status: "Pending", 
                        statusColor: "orange",
                        createdDate: rem.processedAt ? new Date(rem.processedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Recently", 
                        createdTime: ""
                    });
                });

                // If we got real data from the backend, use it. Otherwise, keep the dummy UI data.
                if (combined.length > 0) {
                    setTasksData(combined);
                }
            } catch (error) {
                console.error("Failed to fetch combined tasks data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCombinedTasks();
    }, []);

    useEffect(() => {
        axios.get('/api/notifications/unread').then(r => setNotifications(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    }, []);

    const handleCreateTask = async () => {
        if (!form.title.trim()) { setToast('Please enter a task title.'); setTimeout(() => setToast(''), 3000); return; }
        setSaving(true);
        try {
            await axios.post('/api/tasks', {
                title: form.title.trim(),
                description: form.description.trim(),
                priority: form.priority,
                status: 'Pending',
                deadline: form.deadline ? form.deadline + ':00' : new Date(Date.now() + 86400000).toISOString().slice(0, 19)
            });
            setToast('✅ Task created successfully!');
            setShowModal(false);
            setForm({ title: '', description: '', priority: 'Medium', deadline: '' });
            // Refresh
            const r = await axios.get('/api/tasks').catch(() => ({ data: [] }));
            const fetched = Array.isArray(r.data) ? r.data : [];
            if (fetched.length > 0) {
                setTasksData(fetched.map(task => ({
                    id: 't-' + task.id, title: task.title || 'Untitled',
                    desc: task.description || '', iconType: 'file', iconColor: 'blue',
                    category: task.category || 'General', catColor: 'blue',
                    priority: task.priority || 'Medium', priColor: task.priority === 'High' ? 'red' : 'orange',
                    schedule: task.deadline || 'No schedule', time: '',
                    status: task.status || 'Pending', statusColor: task.status === 'Completed' ? 'green' : 'orange',
                    createdDate: task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Recently', createdTime: ''
                })));
            }
        } catch { setToast('❌ Failed to create task.'); }
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
            default: return <FileText size={size} />;
        }
    };

    const filteredTasks = tasksData.filter(t => {
        if (activeTab === 'All Tasks') return true;
        if (activeTab === 'Pending') return t.status.toLowerCase() === 'pending';
        if (activeTab === 'Completed') return t.status.toLowerCase() === 'completed';
        if (activeTab === 'Scheduled') return t.status.toLowerCase() === 'scheduled';
        if (activeTab === 'Overdue') return t.status.toLowerCase() === 'overdue' || (t.priority === 'High' && t.status.toLowerCase() !== 'completed');
        return true;
    });

    const stats = {
        total: tasksData.length,
        completed: tasksData.filter(t => t.status.toLowerCase() === 'completed').length,
        pending: tasksData.filter(t => t.status.toLowerCase() === 'pending').length,
        scheduled: tasksData.filter(t => t.status.toLowerCase() === 'scheduled').length,
        overdue: tasksData.filter(t => t.status.toLowerCase() === 'overdue' || (t.priority === 'High' && t.status.toLowerCase() !== 'completed')).length
    };

    return (
        <div className="mt-page">
            {/* Header */}
            <div className="mt-header">
                <div className="mt-header-left">
                    <h1 className="mt-title">My Tasks</h1>
                    <p className="mt-subtitle">View, manage and track all your tasks in one place.</p>
                </div>
                <div className="mt-header-right">
                    <div className="mt-search-box">
                        <Search size={16} />
                        <input type="text" placeholder="Search tasks..." />
                    </div>
                    <button className="mt-btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> Create New Task
                    </button>
                    <button className="mt-btn-icon"><Filter size={16} /></button>
                    <div style={{position:'relative'}}>
                        <div className="mt-bell-wrapper" onClick={() => setShowNotifs(v => !v)}>
                            <Bell size={20} />
                            {notifications.length > 0 && <div className="mt-bell-badge">{notifications.length}</div>}
                        </div>
                        {showNotifs && (
                            <div style={{position:'absolute',right:0,top:'120%',width:280,background:'white',borderRadius:12,boxShadow:'0 8px 30px rgba(0,0,0,0.15)',zIndex:999,border:'1px solid #e2e8f0'}}>
                                <div style={{padding:'0.75rem 1rem',fontWeight:700,fontSize:'0.88rem',borderBottom:'1px solid #f1f5f9'}}>Notifications</div>
                                <div style={{maxHeight:220,overflowY:'auto'}}>
                                    {notifications.length === 0 ? <div style={{padding:'1rem',textAlign:'center',color:'#64748b',fontSize:'0.82rem'}}>All caught up!</div>
                                    : notifications.map(n => <div key={n.id} style={{padding:'0.65rem 1rem',borderBottom:'1px solid #f8fafc',fontSize:'0.82rem'}}>{n.message}</div>)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="mt-stats-container">
                <div className="mt-stat-card">
                    <div className="mt-stat-icon-wrap bg-purple c-purple">
                        <LayoutList size={22} />
                    </div>
                    <div className="mt-stat-info">
                        <div className="mt-stat-title">All Tasks</div>
                        <div className="mt-stat-row">
                            <span className="mt-stat-value">{stats.total}</span>
                            <span className="mt-stat-sub c-gray">Total tasks</span>
                        </div>
                    </div>
                </div>
                <div className="mt-stat-card">
                    <div className="mt-stat-icon-wrap bg-green c-green">
                        <CheckCircle2 size={22} />
                    </div>
                    <div className="mt-stat-info">
                        <div className="mt-stat-title">Completed</div>
                        <div className="mt-stat-row">
                            <span className="mt-stat-value">{stats.completed}</span>
                            <span className="mt-stat-sub c-green">{stats.total ? Math.round((stats.completed/stats.total)*100) : 0}%</span>
                        </div>
                    </div>
                </div>
                <div className="mt-stat-card">
                    <div className="mt-stat-icon-wrap bg-orange c-orange">
                        <Clock size={22} />
                    </div>
                    <div className="mt-stat-info">
                        <div className="mt-stat-title">Pending</div>
                        <div className="mt-stat-row">
                            <span className="mt-stat-value">{stats.pending}</span>
                            <span className="mt-stat-sub c-orange">{stats.total ? Math.round((stats.pending/stats.total)*100) : 0}%</span>
                        </div>
                    </div>
                </div>
                <div className="mt-stat-card">
                    <div className="mt-stat-icon-wrap bg-blue c-blue">
                        <Calendar size={22} />
                    </div>
                    <div className="mt-stat-info">
                        <div className="mt-stat-title">Scheduled</div>
                        <div className="mt-stat-row">
                            <span className="mt-stat-value">{stats.scheduled}</span>
                            <span className="mt-stat-sub c-blue">{stats.total ? Math.round((stats.scheduled/stats.total)*100) : 0}%</span>
                        </div>
                    </div>
                </div>
                <div className="mt-stat-card">
                    <div className="mt-stat-icon-wrap bg-red c-red">
                        <AlertCircle size={22} />
                    </div>
                    <div className="mt-stat-info">
                        <div className="mt-stat-title">Overdue</div>
                        <div className="mt-stat-row">
                            <span className="mt-stat-value">{stats.overdue}</span>
                            <span className="mt-stat-sub c-red">{stats.total ? Math.round((stats.overdue/stats.total)*100) : 0}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="mt-controls-row">
                <div className="mt-tabs-wrapper">
                    {['All Tasks', 'Pending', 'Completed', 'Scheduled', 'Overdue'].map(tab => (
                        <button 
                            key={tab}
                            className={`mt-tab-btn ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="mt-dropdowns">
                    <button className="mt-dropdown-btn">
                        <Flag size={14} className="c-gray" /> All Priorities <ChevronDown size={14} className="c-gray" />
                    </button>
                    <button className="mt-dropdown-btn">
                        <LayoutList size={14} className="c-gray" /> All Categories <ChevronDown size={14} className="c-gray" />
                    </button>
                    <button className="mt-dropdown-btn">
                        <Clock size={14} className="c-gray" /> Sort by: Newest <ChevronDown size={14} className="c-gray" />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="mt-table-container">
                {loading ? (
                    <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center', color: '#8b5cf6' }}>
                        <Loader2 className="spin-anim" size={32} />
                    </div>
                ) : (
                    <table className="mt-table">
                        <thead>
                            <tr>
                                <th className="mt-checkbox-cell"><input type="checkbox" className="mt-checkbox" /></th>
                                <th>Task</th>
                                <th>Category</th>
                                <th>Priority</th>
                                <th>Schedule</th>
                                <th>Status</th>
                                <th>Created On</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTasks.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                        No tasks found in this category.
                                    </td>
                                </tr>
                            ) : filteredTasks.map((task, idx) => (
                                <tr key={task.id || idx}>
                                    <td className="mt-checkbox-cell"><input type="checkbox" className="mt-checkbox" /></td>
                                    <td>
                                        <div className="mt-td-task">
                                            <div className={`mt-task-icon-box bg-${task.iconColor} c-${task.iconColor}`}>
                                                {getIcon(task.iconType)}
                                            </div>
                                            <div className="mt-task-texts">
                                                <span className="mt-task-title-text">{task.title}</span>
                                                <span className="mt-task-desc-text">{task.desc}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`mt-pill bg-${task.catColor} c-${task.catColor}`}>
                                            {task.category}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={`mt-priority-text c-${task.priColor}`}>
                                            <Flag size={14} fill="currentColor" /> {task.priority}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="mt-stacked-text">
                                            <span className="mt-stacked-main"><Calendar size={14} /> {task.schedule}</span>
                                            <span>{task.time}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`mt-pill bg-${task.statusColor} c-${task.statusColor}`}>
                                            {task.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="mt-stacked-text">
                                            <span className="mt-stacked-main">{task.createdDate}</span>
                                            <span>{task.createdTime}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <button className="mt-actions-btn">
                                            <MoreVertical size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                <div className="mt-pagination">
                    <span className="mt-page-info">Showing 1 to {filteredTasks.length} of {tasksData.length} tasks</span>
                    
                    <div className="mt-page-controls">
                        <button className="mt-page-btn"><ChevronLeft size={14} /></button>
                        <button className="mt-page-btn active">1</button>
                        <button className="mt-page-btn dots">...</button>
                        <button className="mt-page-btn"><ChevronRight size={14} /></button>
                    </div>

                    <div className="mt-rows-per-page">
                        Rows per page:
                        <div className="mt-rows-select">
                            10 <ChevronDown size={14} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Task Modal */}
            {showModal && (
                <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
                    <div style={{background:'white',borderRadius:16,padding:'1.5rem',width:'100%',maxWidth:420,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
                        <h3 style={{margin:'0 0 1rem',fontSize:'1.1rem',fontWeight:700}}>Create New Task</h3>
                        <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                            <input placeholder="Task title *" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} style={{padding:'0.65rem 0.85rem',borderRadius:8,border:'1px solid #e2e8f0',fontSize:'0.9rem',outline:'none',width:'100%',boxSizing:'border-box'}} />
                            <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} rows={3} style={{padding:'0.65rem 0.85rem',borderRadius:8,border:'1px solid #e2e8f0',fontSize:'0.9rem',outline:'none',width:'100%',boxSizing:'border-box',resize:'vertical'}} />
                            <select value={form.priority} onChange={e => setForm(f=>({...f,priority:e.target.value}))} style={{padding:'0.65rem 0.85rem',borderRadius:8,border:'1px solid #e2e8f0',fontSize:'0.9rem'}}>
                                <option>High</option><option>Medium</option><option>Low</option>
                            </select>
                            <input type="datetime-local" value={form.deadline} onChange={e => setForm(f=>({...f,deadline:e.target.value}))} style={{padding:'0.65rem 0.85rem',borderRadius:8,border:'1px solid #e2e8f0',fontSize:'0.9rem'}} />
                        </div>
                        <div style={{display:'flex',gap:'0.75rem',marginTop:'1.25rem'}}>
                            <button onClick={() => setShowModal(false)} style={{flex:1,padding:'0.7rem',borderRadius:8,border:'1px solid #e2e8f0',background:'white',fontSize:'0.9rem',cursor:'pointer'}}>Cancel</button>
                            <button onClick={handleCreateTask} disabled={saving} style={{flex:1,padding:'0.7rem',borderRadius:8,border:'none',background:'#8b5cf6',color:'white',fontSize:'0.9rem',fontWeight:600,cursor:'pointer'}}>{saving ? 'Creating...' : 'Create Task'}</button>
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

export default MyTasks;

