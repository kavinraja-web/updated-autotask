import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './VoiceAssistant.css';

/* ─── Intent Detection ─────────────────────────────────── */
const detectIntent = (text) => {
    const t = text.toLowerCase();
    if (/(show|open|view|go to).*(task|todo)/i.test(t)) return { action: 'NAVIGATE', target: '/tasks' };
    if (/(show|open|view|go to).*(email|inbox|mail)/i.test(t)) return { action: 'NAVIGATE', target: '/emails' };
    if (/(show|open|view|go to).*(dashboard|home)/i.test(t)) return { action: 'NAVIGATE', target: '/dashboard' };
    if (/(show|open|view|go to).*(reminder)/i.test(t)) return { action: 'NAVIGATE', target: '/reminders' };
    if (/(mark|complete|finish|done).*(task)/i.test(t)) return { action: 'ASK_TASK_COMPLETE' };
    if (/(how many|count|number of).*(task)/i.test(t)) return { action: 'COUNT_TASKS' };
    if (/(how many|count|number of).*(email)/i.test(t)) return { action: 'COUNT_EMAILS' };
    if (/(read|tell me|what are my).*(email)/i.test(t)) return { action: 'READ_EMAILS' };
    if (/(read|tell me|what are my).*(task|todo)/i.test(t)) return { action: 'READ_TASKS' };
    if (/(scan|check|analyze).*(inbox|email)/i.test(t)) return { action: 'NAVIGATE', target: '/emails' };
    if (/(help|what can you do|commands)/i.test(t)) return { action: 'HELP' };
    if (/(hello|hi|hey|good morning|good evening)/i.test(t)) return { action: 'GREET' };
    if (/(time|date|today)/i.test(t)) return { action: 'TIME' };
    return { action: 'UNKNOWN' };
};

/* ─── TTS ─────────────────────────────────── */
const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.pitch = 1;
    utt.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'));
    if (preferred) utt.voice = preferred;
    window.speechSynthesis.speak(utt);
};

/* ─── Waveform bars ─────────────────────────────────── */
const WaveformBars = ({ active }) => (
    <div className="va-waveform">
        {[...Array(12)].map((_, i) => (
            <motion.div
                key={i}
                className="va-bar"
                animate={active
                    ? { scaleY: [0.3, 1, 0.4, 0.9, 0.2, 1, 0.5], opacity: 1 }
                    : { scaleY: 0.15, opacity: 0.3 }
                }
                transition={active
                    ? { duration: 0.8, repeat: Infinity, delay: i * 0.07, ease: 'easeInOut' }
                    : { duration: 0.3 }
                }
            />
        ))}
    </div>
);

/* ─── Main Component ─────────────────────────────────── */
const VoiceAssistant = ({ isPanelOpen, onClose }) => {
    const navigate = useNavigate();
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [textInput, setTextInput] = useState('');
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'Hey! I\'m your SmartTask AI assistant. Try saying "show my tasks" or "how many emails".' }
    ]);
    const [isThinking, setIsThinking] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [emails, setEmails] = useState([]);
    const recognitionRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Prefetch data
    useEffect(() => {
        if (!isPanelOpen) return;
        axios.get('/api/tasks').then(r => setTasks(r.data)).catch(() => {});
        axios.get('/api/emails').then(r => setEmails(r.data)).catch(() => {});
    }, [isPanelOpen]);

    const executeAction = async (actionName, data) => {
        setIsThinking(true);
        try {
            await axios.post('/api/agent/execute', { action: actionName, data: data });
            const successText = `✅ Approved: Executed ${actionName} successfully!`;
            setMessages(prev => [...prev, { role: 'ai', text: successText }]);
            speak(`Excellent. I have successfully completed the ${actionName} action.`);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'ai', text: `❌ Failed to execute action.` }]);
            speak("Sorry, I encountered an error and could not complete the action.");
        } finally {
            setIsThinking(false);
        }
    };

    // Execute intent
    const executeIntent = useCallback(async (text) => {
        const intent = detectIntent(text);

        if (intent.action === 'UNKNOWN') {
            setIsThinking(true);
            try {
                const chatHistory = messages.filter(m => m.text || m.data).map(m => ({
                    role: m.role === 'user' ? 'user' : 'bot',
                    content: m.text || JSON.stringify(m.data)
                }));
                const res = await axios.post('/api/agent/chat', { message: text, history: chatHistory });
                let agentData;
                try {
                    agentData = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
                } catch(e) {
                    agentData = { type: 'response', message: res.data };
                }
                
                setIsThinking(false);
                
                if (agentData.type === 'action_suggestion') {
                    setMessages(prev => [...prev, { role: 'ai', isAction: true, data: agentData }]);
                    speak(agentData.message || "I have prepared the action. Please approve it on your screen.");
                } else if (agentData.type === 'response') {
                    setMessages(prev => [...prev, { role: 'ai', text: agentData.message }]);
                    speak(agentData.message);
                } else if (agentData.type === 'clarification') {
                    setMessages(prev => [...prev, { role: 'ai', text: agentData.question }]);
                    speak(agentData.question);
                } else if (agentData.type === 'multi_step') {
                    setMessages(prev => [...prev, { role: 'ai', isMultiStep: true, data: agentData }]);
                    speak("I have created a multi-step plan for you. Please approve it on screen.");
                } else {
                    setMessages(prev => [...prev, { role: 'ai', text: "I processed your request, but I'm not sure how to display it." }]);
                    speak("I processed your request, but I am not sure how to display it.");
                }
            } catch (e) {
                setIsThinking(false);
                setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I lost my connection to the AI network." }]);
                speak("Sorry, I lost connection to my AI network.");
            }
            return;
        }

        setIsThinking(true);
        await new Promise(r => setTimeout(r, 600));
        setIsThinking(false);

        let response = '';

        switch (intent.action) {
            case 'NAVIGATE':
                response = `Taking you to ${intent.target.replace('/', '')} now.`;
                setTimeout(() => navigate(intent.target), 800);
                break;
            case 'COUNT_TASKS': {
                const pending = tasks.filter(t => t.status?.toLowerCase() === 'pending' || !t.status);
                response = `You have ${pending.length} pending tasks and ${tasks.filter(t => t.status === 'Completed').length} completed.`;
                break;
            }
            case 'COUNT_EMAILS':
                response = emails.length > 0
                    ? `I've found ${emails.length} emails in your inbox.`
                    : `No emails loaded yet. Say "scan inbox" to analyse.`;
                break;
            case 'READ_TASKS': {
                const pending = tasks.filter(t => t.status?.toLowerCase() === 'pending' || !t.status);
                if (pending.length === 0) {
                    response = 'You have no pending tasks right now. Great work!';
                } else {
                    const top3 = pending.slice(0, 3).map(t => t.title).join(', ');
                    response = `Your top tasks are: ${top3}.`;
                }
                break;
            }
            case 'READ_EMAILS': {
                if (emails.length === 0) {
                    response = 'No emails available. Try scanning your inbox first.';
                } else {
                    const top3 = emails.slice(0, 3).map(e => e.subject || e.snippet).join(', ');
                    response = `Recent emails: ${top3}.`;
                }
                break;
            }
            case 'ASK_TASK_COMPLETE':
                response = 'To mark a task as complete, please go to the Tasks page and click "Mark Complete".';
                setTimeout(() => navigate('/tasks'), 1500);
                break;
            case 'GREET': {
                const h = new Date().getHours();
                const gr = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
                const name = (localStorage.getItem('user_email') || '').split('@')[0] || 'there';
                response = `${gr}, ${name}! How can I help you today?`;
                break;
            }
            case 'TIME': {
                const now = new Date();
                response = `It's ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`;
                break;
            }
            case 'HELP':
                response = 'I can: send emails, create tasks, read tasks, read emails, navigate pages, and more. Try saying "send an email to john@example.com"!';
                break;
            default:
                response = `I heard "${text}", but I'm not sure what to do. Try "show tasks", "count emails", or "send an email to max".`;
        }

        setMessages(prev => [...prev, { role: 'ai', text: response }]);
        speak(response);
    }, [navigate, tasks, emails]);

    // Voice recognition setup
    const startListening = useCallback(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            setMessages(prev => [...prev, { role: 'ai', text: 'Voice recognition is not supported in this browser. Try Chrome.' }]);
            return;
        }
        const recognition = new SR();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => { setIsListening(false); recognitionRef.current = null; };

        recognition.onresult = (e) => {
            const interim = Array.from(e.results).map(r => r[0].transcript).join('');
            setTranscript(interim);

            if (e.results[e.results.length - 1].isFinal) {
                const final = interim.trim();
                if (final) {
                    setMessages(prev => [...prev, { role: 'user', text: final }]);
                    setTranscript('');
                    executeIntent(final);
                }
            }
        };

        recognition.onerror = (e) => {
            setIsListening(false);
            if (e.error !== 'aborted') {
                setMessages(prev => [...prev, { role: 'ai', text: `Didn't catch that (${e.error}). Please try again.` }]);
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [executeIntent]);

    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
        setIsListening(false);
    }, []);

    const toggleListen = () => isListening ? stopListening() : startListening();

    return (
        <>


            {/* Panel */}
            <AnimatePresence>
                {isPanelOpen && (
                    <motion.div
                        className="va-panel"
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                    >
                        {/* Header */}
                        <div className="va-header">
                            <div className="va-header-left">
                                <div className={`va-status-dot ${isListening ? 'active' : ''}`} />
                                <div>
                                    <div className="va-title">AI Voice Assistant</div>
                                    <div className="va-subtitle">{isListening ? 'Listening…' : 'Click mic to speak'}</div>
                                </div>
                            </div>
                            <button className="va-close" onClick={onClose}>✕</button>
                        </div>

                        {/* Waveform */}
                        <div className="va-waveform-container">
                            <WaveformBars active={isListening} />
                        </div>

                        {/* Transcript live */}
                        <AnimatePresence>
                            {transcript && (
                                <motion.div
                                    className="va-transcript"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <span className="va-transcript-dot" />
                                    {transcript}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Messages */}
                        <div className="va-messages">
                            {messages.map((m, i) => (
                                <motion.div
                                    key={i}
                                    className={`va-bubble ${m.role}`}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {m.role === 'ai' && <div className="va-ai-label">AI</div>}
                                    {m.isMultiStep ? (
                                        <div className="va-action-card multi-step">
                                            <div className="va-action-header">
                                                <strong>Plan Proposed</strong>
                                            </div>
                                            <ul style={{ fontSize: '0.75rem', paddingLeft: '1.2rem', margin: '0.4rem 0', color: '#4B5563' }}>
                                              {m.data.steps?.map((step, idx) => (
                                                <li key={idx}><strong>{idx+1}.</strong> {step.message} <span style={{fontSize:'0.65rem', background:'rgba(124,58,237,0.1)', padding:'0.1rem 0.3rem', borderRadius:'3px'}}>{step.action}</span></li>
                                              ))}
                                            </ul>
                                            <button 
                                                className="va-approve-btn" 
                                                onClick={() => executeAction('multi_step')}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                Approve All Steps
                                            </button>
                                        </div>
                                    ) : m.isAction ? (
                                        <div className="va-action-card">
                                            <div className="va-action-header">
                                                <strong>Suggested Action: {m.data.action}</strong>
                                            </div>
                                            <p className="va-action-desc">{m.data.message}</p>
                                            {m.data.requires_permission && (
                                                <button 
                                                    className="va-approve-btn" 
                                                    onClick={() => executeAction(m.data.action, m.data.data)}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                    Approve & Execute
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        m.text
                                    )}
                                </motion.div>
                            ))}
                            {isThinking && (
                                <motion.div className="va-bubble ai thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    <div className="va-ai-label">AI</div>
                                    <span className="dot" /><span className="dot" /><span className="dot" />
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Command suggestions */}
                        <div className="va-suggestions">
                            {['Show tasks', 'Count emails', 'Go to dashboard', 'What time is it?'].map(s => (
                                <button
                                    key={s}
                                    className="va-suggestion-chip"
                                    onClick={() => {
                                        setMessages(prev => [...prev, { role: 'user', text: s }]);
                                        executeIntent(s);
                                    }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        {/* Mic Button & Keyboard Input */}
                        <div className="va-footer">
                            <form className="va-input-group" onSubmit={(e) => {
                                e.preventDefault();
                                if (textInput.trim()) {
                                    setMessages(prev => [...prev, { role: 'user', text: textInput }]);
                                    executeIntent(textInput);
                                    setTextInput('');
                                }
                            }}>
                                <input 
                                    type="text" 
                                    className="va-text-input"
                                    placeholder="Type or speak a command..."
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                />
                                <motion.button
                                    type="button"
                                    className={`va-mic-small-btn ${isListening ? 'active' : ''}`}
                                    onClick={toggleListen}
                                    whileTap={{ scale: 0.92 }}
                                    title={isListening ? 'Stop Listening' : 'Start Listening'}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                        <line x1="12" y1="19" x2="12" y2="23"/>
                                        <line x1="8" y1="23" x2="16" y2="23"/>
                                    </svg>
                                    <span className="sr-only">{isListening ? 'Stop' : 'Mic'}</span>
                                </motion.button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default VoiceAssistant;
