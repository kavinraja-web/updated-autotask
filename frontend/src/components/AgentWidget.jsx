import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Bot, X, Send, Command, CheckCircle2 } from 'lucide-react';
import './AgentWidget.css';

const AgentWidget = ({ isPanelOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { type: 'bot', content: { type: 'response', message: "Hi! I'm your SmartTask AI agent. I can help create tasks, summarize emails, or automate workflows for you. What do you need?" } }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPanelOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { type: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const chatHistory = messages.map(m => ({
        role: m.type,
        content: m.type === 'user' ? m.text : (m.content.message || JSON.stringify(m.content))
      }));
      const res = await axios.post('/api/agent/chat', { message: userMsg, history: chatHistory });
      let agentResponse;
      
      try {
        agentResponse = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      } catch(e) {
        agentResponse = { type: 'response', message: res.data };
      }
      
      setMessages(prev => [...prev, { type: 'bot', content: agentResponse }]);
    } catch (err) {
      setMessages(prev => [...prev, { type: 'bot', content: { type: 'response', message: 'Sorry, I lost connection to the server.' } }]);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (actionName, data) => {
    try {
      await axios.post('/api/agent/execute', { action: actionName, data: data });
      setMessages(prev => [
        ...prev,
        { type: 'bot', content: { type: 'response', message: `✅ Approved: Executed action [${actionName}] successfully!` } }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { type: 'bot', content: { type: 'response', message: `❌ Failed to execute action [${actionName}].` } }
      ]);
    }
  };

  return (
    <div className={`agent-widget-container ${isPanelOpen ? 'open' : ''}`}>
      


      {isPanelOpen && (
        <div className="agent-chat-window glass-panel shadow-2xl">
          <div className="agent-chat-header">
            <div className="agent-chat-title">
              <Bot size={20} className="agent-icon" />
              <div>
                <h3>Smart Agent</h3>
                <span>Autonomous Web Assistant</span>
              </div>
            </div>
            <button className="close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="agent-chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message-bubble ${msg.type}`}>
                {msg.type === 'user' ? (
                  <div className="message-content user-message">{msg.text}</div>
                ) : (
                  <div className="message-content bot-message">
                    {msg.content.type === 'response' && <p>{msg.content.message}</p>}
                    {msg.content.type === 'clarification' && <p className="clarity-q">❓ {msg.content.question}</p>}
                    
                    {msg.content.type === 'action_suggestion' && (
                      <div className="action-card">
                        <div className="action-header">
                          <Command size={16} />
                          <strong>Suggested Action</strong>
                        </div>
                        <p>{msg.content.message}</p>
                        <div className="code-block">
                          <code>{msg.content.action}</code>
                        </div>
                        {msg.content.requires_permission && (
                          <button className="action-approve-btn" onClick={() => executeAction(msg.content.action, msg.content.data)}>
                            <CheckCircle2 size={16} />
                            Approve Action
                          </button>
                        )}
                      </div>
                    )}
                    
                     {msg.content.type === 'multi_step' && (
                      <div className="action-card multi-step">
                        <div className="action-header">
                          <Command size={16} />
                          <strong>Plan Proposed</strong>
                        </div>
                        <ul className="step-list">
                          {msg.content.steps?.map((step, idx) => (
                            <li key={idx}><strong>{idx+1}.</strong> {step.message} <span className="action-pill">{step.action}</span></li>
                          ))}
                        </ul>
                         <button className="action-approve-btn" onClick={() => executeAction('multi_step')}>
                            <CheckCircle2 size={16} />
                            Approve All Steps
                          </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="message-bubble bot">
                <div className="message-content bot-message typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="agent-chat-input">
            <input 
              type="text" 
              placeholder="Ask me to do something..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="send-btn" onClick={handleSend} disabled={!input || loading}>
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentWidget;
