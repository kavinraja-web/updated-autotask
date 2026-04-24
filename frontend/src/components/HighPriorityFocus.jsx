import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, X, Quote } from 'lucide-react';
import axios from 'axios';
import './HighPriorityFocus.css';

// Fallback mock data if the API doesn't return high priority tasks with rich detail
const MOCK_TASKS = [
    {
        id: 1,
        title: "Server API Overheating & Rate Limit Errors",
        tags: ["DevOps", "Critical", "Backend"],
        challenge: "The main production API is throwing 429 Too Many Requests sporadically. Our monitoring shows spontaneous spikes in unauthenticated traffic. If we don't address this, paying customers will experience downtime.",
        solution: "SmartTask AI identified traffic from 3 unique IPs in Russia. Recommendation: Update WAF rules immediately to temporarily block these subnets and implement a stricter token-bucket rate limit algorithm on the gateway.",
        snippet: "Hey team, pagerduty just went off again for the auth service. I'm seeing a massive spike in 429s. Looks like a targeted scrape or DDoS attempt. We need eyes on this ASAP before US traffic spikes in the morning.",
        deadline: "ASAP",
        timeEst: "< 15 min"
    },
    {
        id: 2,
        title: "Q3 Board Meeting Presentation Deck",
        tags: ["Leadership", "Strategy"],
        challenge: "The Q3 board deck is due tomorrow morning. The financial slides are missing the updated ARR figures from the new enterprise tier launch. The CEO needs to review it tonight.",
        solution: "SmartTask AI found the updated spreadsheet ('Q3_Final_ARR.xlsx') in your recent downloads. Extract the figures from Sheet 2 and paste them into slides 14-16. Send to the CEO via Slack.",
        snippet: "Hi, just a reminder that the meeting kicks off at 8am tomorrow. Please ensure the ARR slide is updated. The CFO sent out the final numbers an hour ago.",
        deadline: "Tonight",
        timeEst: "45 mins"
    },
    {
        id: 3,
        title: "Enterprise Client (Acme Corp) Onboarding Delay",
        tags: ["Client Success", "Urgent"],
        challenge: "Acme Corp's SSO integration is failing during testing. Their go-live is scheduled for tomorrow. They are threatening to delay the contract start date.",
        solution: "SmartTask AI matched this error to a known issue with their specific SAML provider. Send them the 'SAML attribute mapping' guide from the knowledge base and schedule a direct 15-min call to hold their hand through it.",
        snippet: "URGENT: Our IT team is totally blocked. The SSO login just loops back to your home page without authenticating. If we don't get this fixed today, I have to tell my VP we are delaying the rollout.",
        deadline: "Today",
        timeEst: "30 mins"
    }
];

const HighPriorityFocus = ({ onClose }) => {
    const [tasks, setTasks] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Lock body scroll
        document.body.style.overflow = 'hidden';

        // Fetch high priority tasks
        axios.get('/api/tasks')
            .then(res => {
                const high = res.data.filter(t => t.priority === 'HIGH' || t.priority === 'URGENT');
                if (high.length > 0) {
                    // Map real tasks into our rich format
                    const mapped = high.map(t => ({
                        id: t.id,
                        title: t.title,
                        tags: ["High Priority", t.status || "Pending"],
                        challenge: t.description || "Review task details in your email or task view.",
                        solution: t.aiSuggestion || "Complete this task soon to avoid missing the deadline.",
                        snippet: t.emailContext || "No email context provided.",
                        deadline: t.deadline ? new Date(t.deadline).toLocaleDateString() : 'ASAP',
                        timeEst: t.estimatedTime || "< 30 mins"
                    }));
                    setTasks(mapped);
                } else {
                    setTasks(MOCK_TASKS);
                }
            })
            .catch(() => {
                setTasks(MOCK_TASKS);
            })
            .finally(() => {
                setLoading(false);
            });

        return () => {
             document.body.style.overflow = '';
        };
    }, []);

    const nextTask = () => {
        setCurrentIndex((prev) => (prev + 1) % tasks.length);
    };

    const prevTask = () => {
        setCurrentIndex((prev) => (prev - 1 + tasks.length) % tasks.length);
    };

    if (loading) {
        return (
            <div className="hp-overlay animate-fade-in">
                <div className="hp-loading-spinner" />
            </div>
        );
    }

    const currentTask = tasks[currentIndex];

    return (
        <div className="hp-overlay animate-fade-in">
            {/* Close Button */}
            <button className="hp-close-btn" onClick={onClose}>
                <X size={28} />
            </button>

            {/* Header Text */}
            <div className="hp-top-header">
                <h2>Urgent Focus Mode</h2>
            </div>

            <div className="hp-container">
                
                {/* Left Column: Stats */}
                <div className="hp-col hp-stats-col">
                    <div className="hp-stat-block animate-slide-right delay-1">
                        <div className="hp-stat-value">{currentTask.deadline}</div>
                        <div className="hp-stat-label">deadline / limit</div>
                    </div>
                    <div className="hp-stat-block animate-slide-right delay-2">
                        <div className="hp-stat-value">{currentTask.timeEst}</div>
                        <div className="hp-stat-label">est. AI resolve time</div>
                    </div>
                    <div className="hp-stat-block animate-slide-right delay-3">
                        <div className="hp-stat-value">{tasks.length}x</div>
                        <div className="hp-stat-label">faster workflow with AI</div>
                    </div>
                </div>

                {/* Center Column: Envelope & Card */}
                <div className="hp-col hp-center-col">
                    <div className="hp-envelope-wrapper animate-slide-up">
                        
                        {/* The Envelope Art */}
                        <div className="hp-envelope-back"></div>
                        
                        {/* The Sliding Card */}
                        <div className="hp-card" key={currentTask.id}> {/* Key forces re-render animation */}
                            <div className="hp-card-tags">
                                {currentTask.tags.map(tag => (
                                    <span key={tag} className="hp-tag">{tag}</span>
                                ))}
                            </div>
                            <h3 className="hp-card-title">{currentTask.title}</h3>
                            
                            <div className="hp-card-section">
                                <h4>Challenge:</h4>
                                <p>{currentTask.challenge}</p>
                            </div>

                            <div className="hp-card-section hp-solution">
                                <h4>Solution:</h4>
                                <p>{currentTask.solution}</p>
                            </div>
                        </div>

                        {/* Envelope Front Flap overlapping the card */}
                        <div className="hp-envelope-front">
                            {/* Decorative V logo on envelope */}
                            <div className="hp-envelope-logo"></div>
                        </div>

                    </div>

                    {/* Navigation Buttons (Outside envelope) */}
                    <div className="hp-nav-buttons">
                        <button onClick={prevTask}><ArrowLeft size={18} /></button>
                        <button onClick={nextTask}><ArrowRight size={18} /></button>
                        <span className="hp-pagination">{currentIndex + 1} / {tasks.length}</span>
                    </div>
                </div>

                {/* Right Column: Quote / Context */}
                <div className="hp-col hp-quote-col animate-slide-left delay-2">
                    <div className="hp-quote-card">
                        <div className="hp-quote-icon">
                            <Quote size={20} fill="currentColor" />
                        </div>
                        <p className="hp-quote-text">{currentTask.snippet}</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default HighPriorityFocus;
