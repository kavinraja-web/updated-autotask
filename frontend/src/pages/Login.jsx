import React, { useState, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { Zap, Mail, CheckSquare, Bell, Lock, Star } from 'lucide-react';
import './Login.css';

const SPARKLES = [
  { top: '12%', left: '22%', delay: '0s',   size: '1rem'  },
  { top: '25%', right: '18%', delay: '1.2s', size: '0.9rem'},
  { top: '70%', left: '15%',  delay: '2s',   size: '1.1rem'},
  { top: '80%', right: '22%', delay: '0.6s', size: '0.8rem'},
  { top: '45%', left: '5%',   delay: '1.8s', size: '0.7rem'},
  { top: '55%', right: '5%',  delay: '0.3s', size: '0.75rem'},
];

const Login = ({ onLogin }) => {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width)  * 100,
      y: ((e.clientY - rect.top)  / rect.height) * 100,
    });
  }, []);

  const login = useGoogleLogin({
    scope: 'openid profile email https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
    onSuccess: async (tokenResponse) => {
      try {
        const accessToken = tokenResponse.access_token;
        const profileRes  = await axios.get(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const { sub, email, name } = profileRes.data;
        const credentialResponse = { credential: accessToken, accessToken, email, name, sub };
        localStorage.setItem('google_access_token', accessToken);
        try { await axios.post('/api/auth/google', { idToken: accessToken, accessToken }); }
        catch (e) { console.warn('Backend reg:', e.message); }
        onLogin(credentialResponse);
      } catch (err) {
        console.error('Login error:', err);
        alert('Login failed. Please try again.');
      }
    },
    onError: (e) => { console.error(e); alert('Google Sign-In failed.'); },
  });

  const chips = [
    { label: 'Gmail Scan',    icon: <Mail size={12} />,        cls: 'chip-purple' },
    { label: 'Auto Tasks',    icon: <CheckSquare size={12} />, cls: 'chip-amber'  },
    { label: 'Reminders',     icon: <Bell size={12} />,        cls: 'chip-teal'   },
    { label: 'Secure OAuth',  icon: <Lock size={12} />,        cls: 'chip-pink'   },
  ];

  return (
    <div
      className="login-container"
      onMouseMove={handleMouseMove}
    >
      {/* Mouse-tracking spotlight */}
      <div
        className="login-bg-gradient"
        style={{ '--mx': `${mousePos.x}%`, '--my': `${mousePos.y}%` }}
      />

      {/* Static spotlight rings */}
      <div className="spotlight-ring" />
      <div className="spotlight-ring-2" />

      {/* Floating blobs */}
      <div className="login-deco deco-1" />
      <div className="login-deco deco-2" />
      <div className="login-deco deco-3" />
      <div className="login-deco deco-4" />

      {/* Star sparkles */}
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className="star-sparkle"
          style={{ top: s.top, left: s.left, right: s.right, animationDelay: s.delay, fontSize: s.size }}
        >✦</span>
      ))}

      {/* Card */}
      <div className="login-card animate-scale-in">
        {/* Logo */}
        <div className="login-logo-wrap">
          <div className="logo-icon-large">
            <Zap size={32} />
          </div>
        </div>

        {/* Headline */}
        <div className="login-headline">
          <h1>SmartTask AI</h1>
          <p>Your Gmail inbox, automatically turned into tasks,<br />deadlines & smart reminders — powered by AI.</p>
        </div>

        {/* Feature chips */}
        <div className="login-features">
          {chips.map(c => (
            <span key={c.label} className={`feature-chip ${c.cls}`}>
              {c.icon} {c.label}
            </span>
          ))}
        </div>

        {/* Sign-in */}
        <div className="login-action">
          <button className="google-signin-btn" onClick={() => login()}>
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,19.001,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
            </svg>
            Continue with Google
          </button>
          <p className="login-disclaimer">Gmail access — your emails stay private.</p>
        </div>

        {/* Footer */}
        <div className="login-footer-note">
          <Lock size={12} /> Your data is private and secure.
        </div>
      </div>
    </div>
  );
};

export default Login;
