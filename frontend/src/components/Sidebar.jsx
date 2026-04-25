import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, Inbox, CheckCircle, Bell, User, LayoutDashboard, Mail, CheckSquare, LogOut, Settings, Zap, BarChart2, Menu, X, Sun, Moon } from 'lucide-react';
import NotificationBell from './NotificationBell';
import './Sidebar.css';

/* ── 3D Particle Canvas for Mobile TopBar ── */
const ParticleCanvas = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        let animId;
        const particles = [];
        const COUNT = 55;

        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Build particles with z-depth
        for (let i = 0; i < COUNT; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                z: Math.random() * 400 + 50,        // depth 50-450
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.3,
                vz: (Math.random() - 0.5) * 0.8,
                hue: Math.random() * 60 + 260,       // purple→pink range
                phase: Math.random() * Math.PI * 2,  // pulse phase offset
            });
        }

        let t = 0;
        const draw = () => {
            t += 0.012;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Project + update each particle
            const projected = particles.map((p) => {
                // Move
                p.x += p.vx;
                p.y += p.vy;
                p.z += p.vz;

                // Wrap
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
                if (p.z < 50)  p.z = 450;
                if (p.z > 450) p.z = 50;

                // 3D perspective projection
                const fov = 400;
                const scale = fov / (fov + p.z);
                const sx = (p.x - canvas.width / 2) * scale + canvas.width / 2;
                const sy = (p.y - canvas.height / 2) * scale + canvas.height / 2;
                const radius = Math.max(0.5, 2.5 * scale);
                const pulse = 0.5 + 0.5 * Math.sin(t * 2 + p.phase);
                const alpha = (0.3 + 0.5 * pulse) * scale;

                return { sx, sy, radius, alpha, hue: p.hue, scale, p };
            });

            // Draw connecting lines (only between close particles)
            for (let i = 0; i < projected.length; i++) {
                for (let j = i + 1; j < projected.length; j++) {
                    const a = projected[i];
                    const b = projected[j];
                    const dx = a.sx - b.sx;
                    const dy = a.sy - b.sy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 70) {
                        const lineAlpha = (1 - dist / 70) * 0.25 * Math.min(a.scale, b.scale);
                        ctx.beginPath();
                        ctx.moveTo(a.sx, a.sy);
                        ctx.lineTo(b.sx, b.sy);
                        ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 80%, 80%, ${lineAlpha})`;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }
            }

            // Draw particles
            projected.forEach(({ sx, sy, radius, alpha, hue }) => {
                const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius * 2.5);
                grad.addColorStop(0, `hsla(${hue}, 90%, 85%, ${alpha})`);
                grad.addColorStop(1, `hsla(${hue}, 70%, 60%, 0)`);
                ctx.beginPath();
                ctx.arc(sx, sy, radius * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();
            });

            animId = requestAnimationFrame(draw);
        };

        draw();
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return <canvas ref={canvasRef} className="topbar-particle-canvas" aria-hidden="true" />;
};

const Sidebar = ({ onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        if (onLogout) onLogout();
    };

    const navItems = [
        { name: 'Dashboard',     path: '/dashboard', icon: <Home size={22} strokeWidth={2.5} />, desktopIcon: <LayoutDashboard size={26} /> },
        { name: 'Email Analysis', path: '/emails',    icon: <Inbox size={22} strokeWidth={2.5} />, desktopIcon: <Mail size={26} /> },
        { name: 'Auto Tasks',    path: '/tasks',     icon: <CheckCircle size={22} strokeWidth={2.5} />, desktopIcon: <CheckSquare size={26} /> },
        { name: 'Reminders',     path: '/reminders', icon: <Bell size={22} strokeWidth={2.5} />, desktopIcon: <Bell size={26} /> },
    ];

    const userEmail = localStorage.getItem('user_email') || 'User';
    const initials = userEmail.charAt(0).toUpperCase();

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });
    const settingsRef = useRef(null);

    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    // Close settings dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target)) {
                setIsSettingsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="sidebar">
            {/* Mobile-only top logo bar with 3D particles */}
            <div className="mobile-topbar">
                <ParticleCanvas />

                {/* Left: Brand Logo */}
                <div className="sidebar-brand topbar-brand-content">
                    <div className="logo-icon">
                        <Zap size={22} />
                    </div>
                    <h2>
                        SmartTask AI
                        <span>Email → Task Automation</span>
                    </h2>
                </div>

                {/* Right: User Profile + Notification */}
                <div className="topbar-user-section">
                    <NotificationBell />
                    <div className="topbar-user-chip">
                        <div className="topbar-user-avatar">{initials}</div>
                        <div className="topbar-user-info">
                            <div className="topbar-user-name">{userEmail.split('@')[0]}</div>
                            <div className="topbar-user-status">
                                <span className="topbar-status-dot"></span>
                                Gmail Connected
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="sidebar-brand-container">
                <div className="sidebar-brand">
                    <div className="logo-icon">
                        <Zap size={18} />
                    </div>
                    <h2>
                        SmartTask AI
                        <span>Email → Task Automation</span>
                    </h2>
                </div>
            </div>

            <nav className="sidebar-nav" aria-label="Main Navigation">
                {navItems.map((item) => {
                    // Standard NavItem
                    if (item.name !== 'Dashboard') {
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                                aria-label={item.name}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <span className="nav-icon desktop-icon">{item.desktopIcon}</span>
                                <span className="nav-icon mobile-icon">{item.icon}</span>
                                <span>{item.name}</span>
                            </NavLink>
                        );
                    }

                    // Dashboard Dropdown Item
                    const isDashboardActive = location.pathname.startsWith('/dashboard');
                    return (
                        <div key="dashboard-dropdown" className="nav-dropdown-container">
                            <NavLink
                                to="/dashboard"
                                end
                                className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''} ${isDashboardActive && location.pathname !== '/dashboard' ? 'dropdown-active-parent' : ''}`}
                                aria-label={item.name}
                                aria-haspopup="true"
                            >
                                <span className="nav-icon desktop-icon">{item.desktopIcon}</span>
                                <span className="nav-icon mobile-icon">{item.icon}</span>
                                <span>{item.name}</span>
                            </NavLink>
                            <div className="nav-dropdown-menu" role="menu">
                                <NavLink to="/dashboard" end className="dropdown-item" role="menuitem" onClick={() => setIsMobileMenuOpen(false)}>
                                    <span className="dropdown-icon"><LayoutDashboard size={14} /></span> Overview
                                </NavLink>
                                <NavLink to="/dashboard/trends" className="dropdown-item" role="menuitem" onClick={() => setIsMobileMenuOpen(false)}>
                                    <span className="dropdown-icon"><BarChart2 size={14} /></span> Productivity Trends
                                </NavLink>
                                <NavLink to="/dashboard/insights" className="dropdown-item" role="menuitem" onClick={() => setIsMobileMenuOpen(false)}>
                                    <span className="dropdown-icon"><Zap size={14} /></span> AI Insights
                                </NavLink>
                            </div>
                        </div>
                    );
                })}
                
                {/* Mobile Hamburger Toggle */}
                <div className="mobile-toggle-wrapper">
                    <button 
                        className={`nav-item mobile-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`} 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle Menu"
                        aria-expanded={isMobileMenuOpen}
                    >
                        <span className="nav-icon desktop-icon">{isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</span>
                        <span className="nav-icon mobile-icon"><User size={22} strokeWidth={2.5} /></span>
                        <span>Menu</span>
                    </button>
                    <button 
                        className="mobile-hover-signout" 
                        onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                        title="Quick Sign Out"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </nav>

            {/* Mobile Collapsible Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="mobile-collapsible-menu animate-fade-in" role="dialog" aria-modal="true">
                    <div className="mobile-menu-header">
                        <div className="sidebar-user-chip">
                            <div className="user-avatar">{initials}</div>
                            <div className="user-info">
                                <div className="user-label">{userEmail.split('@')[0]}</div>
                                <div className="user-sublabel">Gmail Connected</div>
                            </div>
                        </div>
                        <NotificationBell />
                    </div>
                    <div className="mobile-menu-actions">
                        <button className="mobile-action-btn" onClick={() => { setIsMobileMenuOpen(false); navigate('/dashboard/trends'); }}>
                            <BarChart2 size={18} /> Productivity Trends
                        </button>
                        <button className="mobile-action-btn" onClick={() => { setIsMobileMenuOpen(false); navigate('/dashboard/insights'); }}>
                            <Zap size={18} /> AI Insights
                        </button>
                        <div className="mobile-menu-divider"></div>
                        <button className="mobile-action-btn logout-btn" onClick={handleLogout} aria-label="Logout">
                            <LogOut size={18} /> Logout
                        </button>
                    </div>
                </div>
            )}

            <div className="sidebar-footer">
                <NotificationBell />
                <div className="sidebar-user-chip">
                    <div className="user-avatar">{initials}</div>
                    <div className="user-info">
                        <div className="user-label">{userEmail.split('@')[0]}</div>
                        <div className="user-sublabel">Gmail Connected</div>
                    </div>
                </div>

                {/* Desktop Settings Dropdown */}
                <div className="desktop-settings-container" ref={settingsRef}>
                    <button 
                        className={`nav-item button-transparent settings-trigger ${isSettingsOpen ? 'active' : ''}`}
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        title="Settings"
                    >
                        <span className="nav-icon"><Settings size={20} /></span>
                    </button>

                    {isSettingsOpen && (
                        <div className="desktop-settings-dropdown animate-fade-in">
                            <div className="settings-header">Quick Settings</div>
                            
                            <button className="settings-item theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
                                <span className="settings-icon">{isDarkMode ? <Sun size={16} /> : <Moon size={16} />}</span>
                                <span className="settings-text">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                                <div className={`theme-switch ${isDarkMode ? 'active' : ''}`}>
                                    <div className="switch-knob"></div>
                                </div>
                            </button>

                            <div className="settings-divider"></div>

                            <button className="settings-item logout-item" onClick={handleLogout}>
                                <span className="settings-icon"><LogOut size={16} /></span>
                                <span className="settings-text">Sign Out</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Sidebar;
