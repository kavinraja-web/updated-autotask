import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Settings } from 'lucide-react';
import axios from 'axios';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { requestFirebaseNotificationPermission, onMessageListener } from '../firebase';
import './NotificationBell.css';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);
    const userEmail = localStorage.getItem('user_email'); // Need this to fetch user ID indirectly or identify user
    const [userId, setUserId] = useState(null);

    // Initial setup: fetch user identity & notifications
    useEffect(() => {
        if (!userEmail) return;

        // Fetch User Info to get exact ID for WebSocket subscription
        axios.get('/api/auth/me') // Assuming we have or will mock a way to get user ID
            .then(res => setUserId(res.data.id))
            .catch(() => {
               // Fallback: If no /me endpoint, we can subscribe via generic user specific queues if configured, 
               // but STOMP over Spring often uses principal. We'll simulate receiving the ID.
               setUserId(1); // Mocked for demo if backend isn't returning it
            });

        fetchNotifications();

        // Ask for foreground push privileges
        requestFirebaseNotificationPermission()
            .then(token => {
                // Send token to backend
                axios.put('/api/users/fcm-token', { fcmToken: token });
            })
            .catch(err => console.warn('FCM permission denied or failed: ', err));

        // Listen for foreground Firebase messages
        onMessageListener().then(payload => {
            // Usually, WebSocket handles real-time Data. This is a fallback or for system alerts.
            console.log('Received foreground message via FCM', payload);
        });

    }, [userEmail]);

    // WebSocket Setup
    useEffect(() => {
        if (!userId) return;

        const client = new Client({
            // Assuming your backend runs on port 8081 locally
            webSocketFactory: () => new SockJS('http://localhost:8081/ws-live-updates'),
            debug: function (str) {
              // console.log(str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        client.onConnect = function () {
            client.subscribe(`/topic/notifications/${userId}`, function (msg) {
                const newNotif = JSON.parse(msg.body);
                setNotifications(prev => [newNotif, ...prev]);
                setUnreadCount(prev => prev + 1);
            });
        };

        client.activate();

        return () => client.deactivate();
    }, [userId]);

    const fetchNotifications = () => {
        axios.get('/api/notifications')
            .then(res => {
                setNotifications(res.data);
                setUnreadCount(res.data.filter(n => !n.read).length);
            })
            .catch(err => console.error("Could not fetch notifications", err));
    };

    const markAsRead = (id) => {
        axios.put(`/api/notifications/${id}/read`).then(() => {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        });
    };

    const markAllAsRead = () => {
        axios.put('/api/notifications/read-all').then(() => {
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        });
    };

    const deleteNotification = (id) => {
        axios.delete(`/api/notifications/${id}`).then(() => {
            setNotifications(prev => {
                const next = prev.filter(n => n.id !== id);
                setUnreadCount(next.filter(n => !n.read).length);
                return next;
            });
        });
    };

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString();
    };

    return (
        <div className="notification-container" ref={dropdownRef}>
            <button className="notification-bell-btn" onClick={() => setIsOpen(!isOpen)}>
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown animate-fade-in">
                    <div className="notification-header">
                        <h3>Notifications</h3>
                        <div className="notification-actions">
                            <button onClick={markAllAsRead} className="text-btn" title="Mark all as read">
                                <Check size={14} /> Read All
                            </button>
                        </div>
                    </div>
                    
                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div className="notification-empty">
                                <Bell size={30} strokeOpacity={0.2} />
                                <p>You have no notifications right now.</p>
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <div key={notif.id} className={`notification-item ${!notif.read ? 'unread' : ''}`}>
                                    <div className="notif-content" onClick={() => !notif.read && markAsRead(notif.id)}>
                                        <div className="notif-type">{notif.type.replace('_', ' ')}</div>
                                        <div className="notif-message">{notif.message}</div>
                                        <div className="notif-time">{formatDate(notif.createdAt)}</div>
                                    </div>
                                    <button className="notif-delete" onClick={() => deleteNotification(notif.id)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="notification-footer">
                        <button className="settings-btn"><Settings size={14} /> Preferences</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
