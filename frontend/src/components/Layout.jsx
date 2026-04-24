import React from 'react';
import Sidebar from './Sidebar';
import CombinedAssistantWidgets from './CombinedAssistantWidgets';

const Footer = () => (
    <footer className="app-footer" aria-label="Site footer">
        <div className="footer-content">
            <p>&copy; {new Date().getFullYear()} SmartTask AI. All rights reserved.</p>
            <div className="footer-links">
                <a href="#privacy" aria-label="Privacy Policy">Privacy Policy</a>
                <a href="#terms" aria-label="Terms of Service">Terms of Service</a>
                <a href="#help" aria-label="Help Center">Help Center</a>
            </div>
        </div>
    </footer>
);

const Layout = ({ children, onLogout }) => {
    return (
        <div className="app-container">
            <Sidebar onLogout={onLogout} />
            <main className="main-content">
                <div className="content-inner animate-fade-in">
                    {children}
                </div>
                <Footer />
            </main>
            <CombinedAssistantWidgets />
        </div>
    );
};

export default Layout;
