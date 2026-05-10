import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Mail, CheckSquare, CheckCircle, Bell,
    LogOut, Settings, Zap, Menu, X, Sun, Moon,
    HelpCircle, MessageSquare, User
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import './Sidebar.css';

const Sidebar = ({ onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [isDarkMode, setIsDarkMode] = useState(() =>
        localStorage.getItem('theme') === 'dark'
    );
    const settingsRef = useRef(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleLogout = () => {
        if (onLogout) onLogout();
    };

    const navItems = [
        { name: 'Dashboard',      path: '/dashboard', icon: <LayoutDashboard size={20} /> },
        { name: 'Email Analysis', path: '/emails',    icon: <Mail size={20} /> },
        { name: 'Approvals',      path: '/drafts',    icon: <CheckSquare size={20} /> },
        { name: 'Auto Tasks',     path: '/tasks',     icon: <CheckCircle size={20} /> },
        { name: 'Reminders',      path: '/reminders', icon: <Bell size={20} /> },
    ];

    const userEmail = localStorage.getItem('user_email') || 'User';
    const initials = userEmail.charAt(0).toUpperCase();
    const userName = userEmail.split('@')[0];

    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (settingsRef.current && !settingsRef.current.contains(e.target)) {
                setIsSettingsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <>
            {/* ── Desktop Sidebar ── */}
            <aside className="sidebar-desktop">
                {/* Logo */}
                <div className="sd-logo-block">
                    <div className="sd-logo-icon">
                        <Zap size={20} />
                    </div>
                    <div className="sd-logo-text">
                        <span className="sd-logo-title">SmartTask AI</span>
                        <span className="sd-logo-sub">Email → Task Automation</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="sd-nav" aria-label="Main Navigation">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `sd-nav-item ${isActive ? 'sd-active' : ''}`}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <span className="sd-nav-icon">{item.icon}</span>
                            <span className="sd-nav-label">{item.name}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Spacer */}
                <div style={{ flex: 1 }} />


                {/* Bottom Links */}
                <div className="sd-bottom-links">
                    <div className="sd-bottom-links-group" ref={settingsRef}>
                        <button
                            className={`sd-nav-item sd-nav-btn ${isSettingsOpen ? 'sd-active' : ''}`}
                            onClick={() => setIsSettingsOpen(v => !v)}
                        >
                            <span className="sd-nav-icon"><Settings size={20} /></span>
                            <span className="sd-nav-label">Settings</span>
                        </button>

                        {isSettingsOpen && (
                            <div className="sd-settings-popup">
                                <div className="sd-settings-header">Quick Settings</div>
                                <button className="sd-settings-item" onClick={() => setIsDarkMode(!isDarkMode)}>
                                    <span className="sd-settings-icon">{isDarkMode ? <Sun size={15} /> : <Moon size={15} />}</span>
                                    <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                                    <div className={`sd-toggle ${isDarkMode ? 'on' : ''}`}>
                                        <div className="sd-toggle-knob" />
                                    </div>
                                </button>
                                <div className="sd-settings-divider" />
                                <button className="sd-settings-item danger" onClick={handleLogout}>
                                    <span className="sd-settings-icon"><LogOut size={15} /></span>
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <button className="sd-nav-item sd-nav-btn" onClick={() => {}}>
                        <span className="sd-nav-icon"><HelpCircle size={20} /></span>
                        <span className="sd-nav-label">Help Center</span>
                    </button>

                    <button className="sd-feedback-btn" onClick={() => {}}>
                        <MessageSquare size={16} />
                        Give Feedback
                    </button>
                </div>
            </aside>

            {/* ── Mobile Top Bar ── */}
            <header className="sidebar-mobile-topbar">
                <div className="sd-logo-block">
                    <div className="sd-logo-icon">
                        <Zap size={18} />
                    </div>
                    <div className="sd-logo-text">
                        <span className="sd-logo-title">SmartTask AI</span>
                        <span className="sd-logo-sub">Email → Task Automation</span>
                    </div>
                </div>

                <div className="mobile-topbar-right">
                    <NotificationBell />
                    <div className="topbar-user-chip">
                        <div className="topbar-user-avatar">{initials}</div>
                        <div className="topbar-user-info">
                            <div className="topbar-user-name">{userName}</div>
                            <div className="topbar-user-status">
                                <span className="topbar-status-dot" />
                                Gmail Connected
                            </div>
                        </div>
                    </div>
                    <button
                        className="mobile-menu-btn"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </header>

            {/* Mobile Overlay Menu */}
            {isMobileMenuOpen && (
                <div className="mobile-overlay-menu" role="dialog" aria-modal="true">
                    <div className="mobile-overlay-inner">
                        {navItems.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => `mobile-nav-item ${isActive ? 'mobile-nav-active' : ''}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {item.icon}
                                {item.name}
                            </NavLink>
                        ))}
                        <div className="mobile-nav-divider" />
                        <button className="mobile-nav-item danger" onClick={handleLogout}>
                            <LogOut size={20} /> Logout
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile Bottom Nav */}
            <nav className="sidebar-mobile-bottom" aria-label="Mobile Navigation">
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `mob-nav-item ${isActive ? 'mob-active' : ''}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        {item.icon}
                        <span>{item.name}</span>
                    </NavLink>
                ))}
            </nav>
        </>
    );
};

export default Sidebar;
