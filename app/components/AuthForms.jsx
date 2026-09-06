'use client';

import { useEffect, useState } from 'react';
import { KeyRound, LogIn, Mail } from 'lucide-react';
import { forgotPassword, loginUser, resetPassword } from '../lib/hrmsApi';

const authStyles = `
  .auth-page {
    display: grid;
    place-items: center;
    min-height: 100vh;
    background: var(--color-page);
    padding: 24px;
  }

  .auth-panel {
    display: grid;
    gap: 14px;
    width: min(420px, 100%);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-white);
    padding: 24px;
    box-shadow: var(--shadow-sm);
  }

  .auth-icon {
    display: grid;
    place-items: center;
    width: 46px;
    height: 46px;
    border-radius: 8px;
    background: var(--color-primary-10);
    color: var(--color-primary);
  }

  .auth-panel h1 {
    margin: 0 0 6px;
    font-size: 26px;
    line-height: 1.2;
  }

  .auth-panel p {
    margin: 0;
    color: var(--color-neutral-500);
  }

  .auth-panel label {
    display: grid;
    gap: 6px;
  }

  .auth-panel label span {
    color: var(--color-neutral-700);
    font-size: 12px;
    font-weight: 800;
  }

  .auth-panel input {
    min-height: 38px;
    border: 1px solid var(--color-neutral-300);
    border-radius: 6px;
    padding: 0 10px;
    font: inherit;
  }

  .auth-error {
    border: 1px solid #fecaca;
    border-radius: 6px;
    background: #fef2f2;
    color: #991b1b;
    padding: 10px;
    font-weight: 700;
  }

  .auth-link {
    color: var(--color-primary);
    font-weight: 800;
    text-align: center;
    text-decoration: none;
  }
`;

export function AuthLogin({ audience, title, forgotHref }) {
  const [email, setEmail] = useState(audience === 'admin' ? 'admin@nw18.com' : 'rahul.sharma@nw18.com');
  const [password, setPassword] = useState('Password@123');
  const [message, setMessage] = useState('');

  async function submit(event) {
    event.preventDefault();
    try {
      const data = await loginUser(email, password);
      if (data.user.role === 'super_admin') {
        window.location.href = '/admin/companies';
        return;
      }
      if (data.user.role === 'hr_admin') {
        window.location.href = '/admin';
        return;
      }
      window.location.href = '/';
    } catch (error) {
      setMessage(error.message || 'Unable to login.');
    }
  }

  return (
    <main className="auth-page">
      <style>{authStyles}</style>
      <form className="auth-panel" onSubmit={submit}>
        <span className="auth-icon"><LogIn size={22} /></span>
        <div>
          <p className="eyebrow">HRMS Access</p>
          <h1>{title}</h1>
          <p>Sign in to continue to your workspace.</p>
        </div>
        <label>
          <span>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {message && <div className="auth-error">{message}</div>}
        <button className="btn btn-primary" type="submit">Login</button>
        <a className="auth-link" href={forgotHref}>Forgot password?</a>
      </form>
    </main>
  );
}

export function ForgotPasswordForm({ audience, title, loginHref }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event) {
    event.preventDefault();
    try {
      const data = await forgotPassword(email, audience);
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message || 'Unable to request password reset.');
    }
  }

  return (
    <main className="auth-page">
      <style>{authStyles}</style>
      <form className="auth-panel" onSubmit={submit}>
        <span className="auth-icon"><Mail size={22} /></span>
        <div>
          <p className="eyebrow">Password Recovery</p>
          <h1>{title}</h1>
          <p>Enter your email and we will send a reset link if the account exists.</p>
        </div>
        <label>
          <span>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        {message && <div className="auth-error">{message}</div>}
        <button className="btn btn-primary" type="submit">Send Reset Link</button>
        <a className="auth-link" href={loginHref}>Back to login</a>
      </form>
    </main>
  );
}

export function ResetPasswordForm({ loginHref }) {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') || '');
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    try {
      const data = await resetPassword(token, password);
      setMessage(data.message);
      setIsComplete(true);
    } catch (error) {
      setMessage(error.message || 'Unable to reset password.');
    }
  }

  return (
    <main className="auth-page">
      <style>{authStyles}</style>
      <form className="auth-panel" onSubmit={submit}>
        <span className="auth-icon"><KeyRound size={22} /></span>
        <div>
          <p className="eyebrow">Set New Password</p>
          <h1>Reset Password</h1>
          <p>Choose a new password with uppercase, lowercase, number and symbol.</p>
        </div>
        <label>
          <span>New Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <label>
          <span>Confirm Password</span>
          <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
        </label>
        {message && <div className="auth-error">{message}</div>}
        {!isComplete && <button className="btn btn-primary" type="submit">Reset Password</button>}
        {isComplete && <a className="btn btn-primary" href={loginHref}>Go to Login</a>}
      </form>
    </main>
  );
}
