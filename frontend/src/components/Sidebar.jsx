import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Zap, ListChecks, CalendarClock, Puzzle, History,
    Settings, HelpCircle, LogOut, Sun, Moon, ChevronDown, Bell, ShieldCheck, Mail
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import './Sidebar.css';

const Sidebar = ({ onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const settingsRef = useRef(null);

    const userEmail = localStorage.getItem('user_email') || 'user@example.com';
    const userName = userEmail.split('@')[0];
    const initials = userName.charAt(0).toUpperCase();

    useEffect(() => {
        if (isDarkMode) { document.body.classList.add('dark-mode'); localStorage.setItem('theme', 'dark'); }
        else { document.body.classList.remove('dark-mode'); localStorage.setItem('theme', 'light'); }
    }, [isDarkMode]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (settingsRef.current && !settingsRef.current.contains(e.target)) setIsSettingsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const navItems = [
        { name: 'Dashboard',       path: '/dashboard', icon: <LayoutDashboard size={18} /> },
        { name: 'Generate Tasks',  path: '/tasks',     icon: <Zap size={18} /> },
        { name: 'My Tasks',        path: '/mytasks',   icon: <ListChecks size={18} /> },
        { name: 'Email Analysis',  path: '/emails',    icon: <Mail size={18} /> },
        { name: 'Reminders',       path: '/reminders', icon: <Bell size={18} /> },
        { name: 'Approvals',       path: '/approvals', icon: <ShieldCheck size={18} /> },
        { name: 'History',         path: '/history',   icon: <History size={18} />, disabled: true },
    ];

    // Mobile nav: show Dashboard, Tasks, My Tasks, Approvals, Reminders (5 most important)
    const mobileNavItems = [
        { name: 'Home',      path: '/dashboard', icon: <LayoutDashboard size={20} /> },
        { name: 'Generate',  path: '/tasks',     icon: <Zap size={20} /> },
        { name: 'Tasks',     path: '/mytasks',   icon: <ListChecks size={20} /> },
        { name: 'Approvals', path: '/approvals', icon: <ShieldCheck size={20} /> },
        { name: 'Reminders', path: '/reminders', icon: <Bell size={20} /> },
    ];

    return (
        <>
            {/* ── Desktop Sidebar ── */}
            <aside className="sidebar-desktop">
                {/* Brand */}
                <div className="sb-brand">
                    <div className="sb-logo">
                        <Zap size={18} strokeWidth={2.5} />
                    </div>
                    <div className="sb-brand-text">
                        <span className="sb-brand-name">AutoTask</span>
                        <span className="sb-brand-sub">Generator</span>
                    </div>
                </div>

                {/* Nav */}
                <nav className="sb-nav">
                    {navItems.map((item) =>
                        item.disabled ? (
                            <div key={item.path} className="sb-nav-item sb-nav-disabled">
                                <span className="sb-nav-icon">{item.icon}</span>
                                <span>{item.name}</span>
                            </div>
                        ) : (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => `sb-nav-item${isActive ? ' active' : ''}`}
                            >
                                <span className="sb-nav-icon">{item.icon}</span>
                                <span>{item.name}</span>
                            </NavLink>
                        )
                    )}
                </nav>

                {/* Bottom */}
                <div className="sb-bottom">
                    {/* Upgrade Banner */}
                    <div className="sb-upgrade-card">
                        <div className="sb-upgrade-icon">
                            <Zap size={16} />
                        </div>
                        <p className="sb-upgrade-title">Upgrade to Pro</p>
                        <p className="sb-upgrade-desc">Unlock advanced features and boost productivity.</p>
                        <button className="sb-upgrade-btn" onClick={() => {}}>
                            Upgrade Now <span>→</span>
                        </button>
                    </div>

                    {/* User Footer */}
                    <div className="sb-user-row">
                        <div className="sb-user-avatar">{initials}</div>
                        <div className="sb-user-info">
                            <span className="sb-user-name">{userName}</span>
                            <span className="sb-user-email">{userEmail}</span>
                        </div>
                        <div className="sb-user-actions" ref={settingsRef}>
                            <button
                                className="sb-icon-btn"
                                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                title="Settings"
                            >
                                <ChevronDown size={14} />
                            </button>
                            {isSettingsOpen && (
                                <div className="sb-settings-dropdown animate-fade-in">
                                    <button className="sb-dropdown-item" onClick={() => setIsDarkMode(!isDarkMode)}>
                                        {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                                        {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                                    </button>
                                    <div className="sb-dropdown-divider" />
                                    <button className="sb-dropdown-item sb-logout-item" onClick={onLogout}>
                                        <LogOut size={14} /> Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            {/* ── Mobile Bottom Nav ── */}
            <nav className="sb-mobile-nav">
                {mobileNavItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `sb-mob-item${isActive ? ' active' : ''}`}
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
