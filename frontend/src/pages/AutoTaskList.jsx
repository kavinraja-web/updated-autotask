import React, { useState, useEffect, useRef } from 'react';
import {
    Sparkles, RefreshCw, Save, ArrowLeft, Loader2, Trash2,
    CheckSquare, Square, Calendar, Clock, Users, Tag,
    HelpCircle, Bell, Lock, Mail, FileText, RotateCcw,
    ChevronDown, AlertCircle, Pencil, Plus, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import confetti from 'canvas-confetti';
import './AutoTaskList.css';

/* ─── Step Indicator ─── */
const StepBar = ({ step }) => {
    const steps = [
        { n: 1, label: 'Describe', sub: 'Tell us what you want' },
        { n: 2, label: 'Review', sub: 'AI generates tasks' },
        { n: 3, label: 'Customize', sub: 'Refine and save' },
    ];
    return (
        <div className="gt-stepbar">
            {steps.map((s, i) => (
                <React.Fragment key={s.n}>
                    <div className={`gt-step ${step === s.n ? 'active' : step > s.n ? 'done' : ''}`}>
                        <div className="gt-step-circle">{step > s.n ? '✓' : s.n}</div>
                        <div className="gt-step-text">
                            <span className="gt-step-label">{s.label}</span>
                            <span className="gt-step-sub">{s.sub}</span>
                        </div>
                    </div>
                    {i < steps.length - 1 && <div className={`gt-step-line ${step > s.n ? 'done' : ''}`} />}
                </React.Fragment>
            ))}
        </div>
    );
};

/* ─── Generated Task Card (right panel) ─── */
const GenTaskCard = ({ task, index, selected, onToggle, onEdit, onDelete }) => {
    const icons = [Mail, FileText, Users, RotateCcw];
    const colors = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b'];
    const Icon = icons[index % icons.length];
    const color = colors[index % colors.length];

    return (
        <motion.div
            className={`gt-task-card ${selected ? 'gt-task-selected' : ''}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.07 }}
        >
            <div className="gt-tc-left">
                <div className="gt-tc-icon" style={{ background: `${color}18`, color }}>
                    <Icon size={16} />
                </div>
                <div className="gt-tc-body">
                    <h4 className="gt-tc-title">{task.title}</h4>
                    <p className="gt-tc-desc">{task.description || 'AI generated task.'}</p>
                    <div className="gt-tc-tags">
                        <span className="gt-tc-tag"><Calendar size={11} /> {task.schedule || 'Every Monday'}</span>
                        <span className="gt-tc-tag"><Clock size={11} /> {task.time || '10:00 AM'}</span>
                        <span className="gt-tc-tag"><Users size={11} /> {task.assignee || 'You'}</span>
                    </div>
                </div>
            </div>
            <div className="gt-tc-actions">
                <button className="gt-tc-check" onClick={() => onToggle(index)}>
                    {selected
                        ? <CheckSquare size={20} style={{ color: '#7c3aed' }} />
                        : <Square size={20} style={{ color: '#cbd5e1' }} />}
                </button>
                <button className="gt-tc-edit" onClick={() => onEdit(index)} title="Edit">
                    <Pencil size={13} />
                </button>
                <button className="gt-tc-delete" onClick={() => onDelete(index)} title="Remove">
                    <X size={13} />
                </button>
            </div>
        </motion.div>
    );
};

/* ─── Main Page ─── */
const AutoTaskList = () => {
    const [step, setStep] = useState(1);
    const [prompt, setPrompt] = useState('');
    const [charCount, setCharCount] = useState(0);
    const [schedule, setSchedule] = useState('Every Monday');
    const [time, setTime] = useState('10:00 AM');
    const [assignee, setAssignee] = useState('');
    const [category, setCategory] = useState('');
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [genTasks, setGenTasks] = useState([]);
    const [selected, setSelected] = useState([]);
    const [savedTasks, setSavedTasks] = useState([]);
    const [editingIdx, setEditingIdx] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [notification, setNotification] = useState(null);
    const textareaRef = useRef(null);

    const MAX_CHARS = 1000;

    const showNotif = (msg, type = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3000);
    };

    /* Fetch existing tasks on mount */
    useEffect(() => {
        axios.get('/api/tasks')
            .then(res => setSavedTasks(res.data))
            .catch(() => {});
    }, []);

    const handlePromptChange = (e) => {
        const val = e.target.value.slice(0, MAX_CHARS);
        setPrompt(val);
        setCharCount(val.length);
    };

    const improveWithAI = async () => {
        if (!prompt.trim()) return;
        setGenerating(true);
        try {
            const res = await axios.post('/api/agent/chat', {
                message: `Improve this task description to be more specific and actionable (keep it concise, max 2 sentences): "${prompt}"`,
                history: []
            });
            const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
            const improved = data.message || data.reply || prompt;
            setPrompt(improved.slice(0, MAX_CHARS));
            setCharCount(improved.slice(0, MAX_CHARS).length);
            showNotif('Prompt improved!');
        } catch {
            showNotif('Could not improve prompt.', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const buildAIPrompt = () =>
        `Generate exactly 4 tasks based on this request: "${prompt}". 
        Schedule: ${schedule}, Time: ${time}${assignee ? `, Assignee: ${assignee}` : ''}${category ? `, Category: ${category}` : ''}.
        
        Return ONLY a JSON array (no markdown, no explanation) with this exact shape:
        [{"title":"...","description":"...","schedule":"...","time":"...","assignee":"...","priority":"Medium"}]`;

    const generateTasks = async () => {
        if (!prompt.trim()) { showNotif('Please describe what you want to automate.', 'error'); return; }
        setGenerating(true);
        setStep(2);
        try {
            const res = await axios.post('/api/agent/chat', {
                message: buildAIPrompt(),
                history: []
            });
            const raw = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
            // Try to extract JSON array
            const match = raw.match(/\[[\s\S]*\]/);
            if (match) {
                const tasks = JSON.parse(match[0]);
                setGenTasks(tasks);
                setSelected(tasks.map((_, i) => i)); // all selected by default
                setStep(3);
            } else {
                // Fallback: create mock tasks
                const mock = [
                    { title: 'Send Progress Report Email', description: 'Compose and send a progress report email to the team.', schedule, time, assignee: assignee || 'Team', priority: 'High' },
                    { title: 'Prepare Progress Report', description: 'Collect and summarize the latest progress updates.', schedule, time: '9:30 AM', assignee: assignee || 'You', priority: 'Medium' },
                    { title: 'Review Report Content', description: 'Review the report for accuracy and completeness.', schedule, time: '9:45 AM', assignee: assignee || 'You', priority: 'Medium' },
                    { title: 'Follow Up on Responses', description: 'Check replies and follow up on any important feedback.', schedule, time: '11:00 AM', assignee: assignee || 'You', priority: 'Low' },
                ];
                setGenTasks(mock);
                setSelected(mock.map((_, i) => i));
                setStep(3);
                showNotif('AI used smart defaults — review your tasks!');
            }
        } catch (err) {
            showNotif('Generation failed. Using smart defaults.', 'error');
            const mock = [
                { title: 'Send Progress Report Email', description: 'Compose and send a progress report email to the team.', schedule, time, assignee: assignee || 'Team', priority: 'High' },
                { title: 'Prepare Progress Report', description: 'Collect and summarize the latest progress updates.', schedule, time: '9:30 AM', assignee: assignee || 'You', priority: 'Medium' },
                { title: 'Review Report Content', description: 'Review the report for accuracy and completeness.', schedule, time: '9:45 AM', assignee: assignee || 'You', priority: 'Medium' },
                { title: 'Follow Up on Responses', description: 'Check replies and follow up on any important feedback.', schedule, time: '11:00 AM', assignee: assignee || 'You', priority: 'Low' },
            ];
            setGenTasks(mock);
            setSelected(mock.map((_, i) => i));
            setStep(3);
        } finally {
            setGenerating(false);
        }
    };

    const regenerate = async () => {
        setRegenerating(true);
        setGenTasks([]);
        setSelected([]);
        try {
            const res = await axios.post('/api/agent/chat', {
                message: buildAIPrompt(),
                history: []
            });
            const raw = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
            const match = raw.match(/\[[\s\S]*\]/);
            if (match) {
                const tasks = JSON.parse(match[0]);
                setGenTasks(tasks);
                setSelected(tasks.map((_, i) => i));
            } else {
                throw new Error('no array');
            }
            showNotif('Tasks regenerated!');
        } catch {
            showNotif('Regeneration failed.', 'error');
        } finally {
            setRegenerating(false);
        }
    };

    const toggleSelect = (i) => {
        setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
    };

    const startEdit = (i) => {
        setEditingIdx(i);
        setEditTitle(genTasks[i].title);
        setEditDesc(genTasks[i].description || '');
    };

    const saveEdit = () => {
        setGenTasks(prev => prev.map((t, i) => i === editingIdx ? { ...t, title: editTitle, description: editDesc } : t));
        setEditingIdx(null);
        showNotif('Task updated!');
    };

    const deleteGenTask = (i) => {
        setGenTasks(prev => prev.filter((_, idx) => idx !== i));
        setSelected(prev => prev.filter(x => x !== i).map(x => x > i ? x - 1 : x));
    };

    const saveTasks = async () => {
        const toSave = genTasks.filter((_, i) => selected.includes(i));
        if (!toSave.length) { showNotif('Select at least one task.', 'error'); return; }
        setSaving(true);
        try {
            await Promise.all(toSave.map(t =>
                axios.post('/api/tasks', {
                    title: t.title,
                    description: t.description,
                    priority: t.priority || 'Medium',
                    status: 'pending',
                    deadline: null,
                })
            ));
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#7c3aed', '#a855f7', '#ec4899'] });
            showNotif(`${toSave.length} task${toSave.length > 1 ? 's' : ''} saved!`);
            // Reset
            setTimeout(() => {
                setStep(1);
                setPrompt('');
                setCharCount(0);
                setGenTasks([]);
                setSelected([]);
            }, 1500);
        } catch {
            showNotif('Failed to save tasks.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const goBack = () => {
        if (step === 3) { setStep(1); setGenTasks([]); setSelected([]); }
    };

    const scheduleOptions = ['Every Monday', 'Every Day', 'Every Week', 'Every Month', 'Custom'];
    const timeOptions = ['09:00 AM', '10:00 AM', '10:30 AM', '11:00 AM', '02:00 AM', '06:00 PM'];

    return (
        <div className="gt-page">

            {/* ── Notification Toast ── */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        className={`gt-toast ${notification.type}`}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        {notification.type === 'error' ? <AlertCircle size={14} /> : <Sparkles size={14} />}
                        {notification.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Header ── */}
            <div className="gt-header">
                <div className="gt-header-left">
                    <div className="gt-header-icon"><Sparkles size={22} /></div>
                    <div>
                        <h1 className="gt-title">Generate Tasks</h1>
                        <p className="gt-subtitle">Describe what you want to automate and let AI create tasks for you.</p>
                    </div>
                </div>
                <div className="gt-header-right">
                    <button className="gt-how-btn">
                        <HelpCircle size={15} /> How it works
                    </button>
                    <button className="gt-notif-btn">
                        <Bell size={17} />
                        <span className="gt-notif-badge">5</span>
                    </button>
                </div>
            </div>

            {/* ── Step Bar ── */}
            <StepBar step={step} />

            {/* ── Two-Column Body ── */}
            <div className="gt-body">

                {/* ── LEFT: Form ── */}
                <div className="gt-left-panel">
                    {/* What to automate */}
                    <div className="gt-form-card">
                        <h3 className="gt-form-section-title">What do you want to automate?</h3>
                        <p className="gt-form-section-sub">Describe your task in detail. The more context, the better the results.</p>
                        <div className="gt-textarea-wrap">
                            <textarea
                                ref={textareaRef}
                                className="gt-textarea"
                                placeholder="Create a task every Monday to send a progress report email to the team at 10:00 AM."
                                value={prompt}
                                onChange={handlePromptChange}
                                rows={5}
                            />
                            <div className="gt-textarea-footer">
                                <button
                                    className="gt-improve-btn"
                                    onClick={improveWithAI}
                                    disabled={generating || !prompt.trim()}
                                >
                                    {generating
                                        ? <Loader2 size={13} className="spin-anim" />
                                        : <Sparkles size={13} />}
                                    Improve with AI
                                </button>
                                <span className="gt-char-count">{charCount}/{MAX_CHARS}</span>
                            </div>
                        </div>
                    </div>

                    {/* Additional Details */}
                    <div className="gt-form-card">
                        <h3 className="gt-form-section-title">Additional Details (Optional)</h3>
                        <p className="gt-form-section-sub">Add more context to help AI generate better tasks.</p>

                        <div className="gt-field-list">
                            {/* Schedule */}
                            <div className="gt-field-row">
                                <div className="gt-field-label">
                                    <Calendar size={15} className="gt-field-icon" />
                                    <span>Schedule Preference</span>
                                </div>
                                <div className="gt-field-select-wrap">
                                    <select
                                        className="gt-field-select"
                                        value={schedule}
                                        onChange={e => setSchedule(e.target.value)}
                                    >
                                        {scheduleOptions.map(o => <option key={o}>{o}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="gt-select-arrow" />
                                </div>
                            </div>

                            {/* Time */}
                            <div className="gt-field-row">
                                <div className="gt-field-label">
                                    <Clock size={15} className="gt-field-icon" />
                                    <span>Time</span>
                                </div>
                                <div className="gt-field-select-wrap">
                                    <select
                                        className="gt-field-select"
                                        value={time}
                                        onChange={e => setTime(e.target.value)}
                                    >
                                        {timeOptions.map(o => <option key={o}>{o}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="gt-select-arrow" />
                                </div>
                            </div>

                            {/* Assignee */}
                            <div className="gt-field-row">
                                <div className="gt-field-label">
                                    <Users size={15} className="gt-field-icon" />
                                    <span>Assignee (Optional)</span>
                                </div>
                                <input
                                    className="gt-field-input"
                                    placeholder="Select assignee"
                                    value={assignee}
                                    onChange={e => setAssignee(e.target.value)}
                                />
                            </div>

                            {/* Category */}
                            <div className="gt-field-row">
                                <div className="gt-field-label">
                                    <Tag size={15} className="gt-field-icon" />
                                    <span>Category (Optional)</span>
                                </div>
                                <input
                                    className="gt-field-input"
                                    placeholder="Select category"
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        className="gt-generate-btn"
                        onClick={generateTasks}
                        disabled={generating}
                    >
                        {generating
                            ? <><Loader2 size={16} className="spin-anim" /> Generating…</>
                            : <><Sparkles size={16} /> Generate Tasks</>}
                    </button>
                    <p className="gt-secure-note"><Lock size={11} /> Your data is safe and secure.</p>
                </div>

                {/* ── RIGHT: AI Generated Tasks ── */}
                <div className="gt-right-panel">
                    <div className="gt-right-header">
                        <div>
                            <div className="gt-right-title-row">
                                <Sparkles size={16} style={{ color: '#7c3aed' }} />
                                <h3 className="gt-right-title">AI Generated Tasks</h3>
                            </div>
                            <p className="gt-right-sub">Review the tasks AI created based on your description.</p>
                        </div>
                        {genTasks.length > 0 && (
                            <span className="gt-tasks-count">{genTasks.length} tasks generated</span>
                        )}
                    </div>

                    {/* Task list */}
                    <div className="gt-tasks-list">
                        <AnimatePresence>
                            {generating || regenerating ? (
                                <motion.div className="gt-gen-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <Loader2 size={32} className="spin-anim" style={{ color: '#7c3aed' }} />
                                    <p>AI is generating your tasks…</p>
                                </motion.div>
                            ) : genTasks.length === 0 ? (
                                <motion.div className="gt-empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    <div className="gt-empty-icon"><Sparkles size={32} /></div>
                                    <p>Your AI-generated tasks will appear here.</p>
                                    <span>Fill in the form and click Generate Tasks.</span>
                                </motion.div>
                            ) : (
                                genTasks.map((task, i) => (
                                    editingIdx === i ? (
                                        <motion.div key={`edit-${i}`} className="gt-edit-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                            <input
                                                className="gt-edit-title"
                                                value={editTitle}
                                                onChange={e => setEditTitle(e.target.value)}
                                                placeholder="Task title"
                                            />
                                            <textarea
                                                className="gt-edit-desc"
                                                value={editDesc}
                                                onChange={e => setEditDesc(e.target.value)}
                                                placeholder="Task description"
                                                rows={2}
                                            />
                                            <div className="gt-edit-actions">
                                                <button className="gt-edit-save" onClick={saveEdit}>Save</button>
                                                <button className="gt-edit-cancel" onClick={() => setEditingIdx(null)}>Cancel</button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <GenTaskCard
                                            key={i}
                                            task={task}
                                            index={i}
                                            selected={selected.includes(i)}
                                            onToggle={toggleSelect}
                                            onEdit={startEdit}
                                            onDelete={deleteGenTask}
                                        />
                                    )
                                ))
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Tip banner */}
                    {genTasks.length > 0 && (
                        <div className="gt-tip-banner">
                            <Sparkles size={14} style={{ color: '#7c3aed', flexShrink: 0 }} />
                            <div>
                                <p className="gt-tip-title">These tasks are suggestions.</p>
                                <p className="gt-tip-sub">You can edit, add, delete or reorder tasks before saving.</p>
                            </div>
                        </div>
                    )}

                    {/* Bottom action bar */}
                    {genTasks.length > 0 && (
                        <div className="gt-bottom-bar">
                            <button className="gt-back-btn" onClick={goBack}>
                                <ArrowLeft size={15} /> Back
                            </button>
                            <div className="gt-bottom-right">
                                <button className="gt-regen-btn" onClick={regenerate} disabled={regenerating}>
                                    {regenerating
                                        ? <Loader2 size={14} className="spin-anim" />
                                        : <RefreshCw size={14} />}
                                    Regenerate
                                </button>
                                <button className="gt-save-btn" onClick={saveTasks} disabled={saving || !selected.length}>
                                    {saving
                                        ? <Loader2 size={14} className="spin-anim" />
                                        : <Save size={14} />}
                                    Save Tasks →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AutoTaskList;
