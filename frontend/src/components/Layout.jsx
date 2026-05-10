import React from 'react';
import Sidebar from './Sidebar';
import CombinedAssistantWidgets from './CombinedAssistantWidgets';

const Layout = ({ children, onLogout }) => {
    return (
        <div className="app-container">
            <Sidebar onLogout={onLogout} />
            <main className="main-content">
                <div className="content-inner animate-fade-in">
                    {children}
                </div>
            </main>
            <CombinedAssistantWidgets />
        </div>
    );
};

export default Layout;
