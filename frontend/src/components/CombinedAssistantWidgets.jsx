import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Mic, User } from 'lucide-react';
import AgentWidget from './AgentWidget';
import VoiceAssistant from './VoiceAssistant';
import './CombinedAssistantWidgets.css';

const CombinedAssistantWidgets = () => {
    // 'agent' | 'voice' | null
    const [openPanel, setOpenPanel] = useState(null);
    const [isHovered, setIsHovered] = useState(false);

    // If a panel is explicitly open, we do NOT show the FAB choices
    const isAnyPanelOpen = openPanel !== null;

    return (
        <div className="combined-assistant-wrapper">
            {/* ── Individual Panels ── */}
            <AgentWidget 
                isPanelOpen={openPanel === 'agent'} 
                onClose={() => setOpenPanel(null)} 
            />
            
            <VoiceAssistant 
                isPanelOpen={openPanel === 'voice'} 
                onClose={() => setOpenPanel(null)} 
            />

            {/* ── Main Expandable FAB ── */}
            <AnimatePresence>
                {!isAnyPanelOpen && (
                    <motion.div 
                        className="main-fab-container"
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                    >
                        {/* ── Hover Menu ── */}
                        <AnimatePresence>
                            {isHovered && (
                                <motion.div 
                                    className="fab-hover-menu"
                                    initial={{ opacity: 0, y: 15, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                >
                                    <button 
                                        className="fab-option-btn voice-bg"
                                        onClick={() => setOpenPanel('voice')}
                                    >
                                        <div className="fab-option-icon"><Mic size={16} /></div>
                                        <span className="fab-option-text">Start Voice Assistant</span>
                                    </button>
                                    
                                    <button 
                                        className="fab-option-btn agent-bg"
                                        onClick={() => setOpenPanel('agent')}
                                    >
                                        <div className="fab-option-icon"><Bot size={16} /></div>
                                        <span className="fab-option-text">Open Agent Text Chat</span>
                                    </button>
                                    
                                    <div className="fab-menu-arrow"></div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── Central FAB ── */}
                        <motion.button 
                            className="master-ai-fab"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <motion.div 
                                animate={isHovered ? { rotate: 360 } : { rotate: 0 }} 
                                transition={{ duration: 0.5, ease: "easeOut" }}
                            >
                                <Bot size={24} />
                            </motion.div>
                        </motion.button>

                    </motion.div>
                )}
            </AnimatePresence>
            
        </div>
    );
};

export default CombinedAssistantWidgets;
