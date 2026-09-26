'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { setupEmployeeAccount, verifyInvite } from '../lib/hrmsApi';

function OnboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryEmail = searchParams.get('email') || '';
  const queryOtp = searchParams.get('otp') || searchParams.get('code') || '';

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(queryEmail);
  const [otpOrTempPassword, setOtpOrTempPassword] = useState(queryOtp);

  const [verifiedData, setVerifiedData] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (queryEmail) setEmail(queryEmail);
    if (queryOtp) setOtpOrTempPassword(queryOtp);
  }, [queryEmail, queryOtp]);

  // Password strength checks
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    match: password.length > 0 && password === confirmPassword
  };

  const isPasswordValid =
    passwordChecks.length &&
    passwordChecks.uppercase &&
    passwordChecks.lowercase &&
    passwordChecks.number &&
    passwordChecks.special &&
    passwordChecks.match;

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !otpOrTempPassword.trim()) {
      setError('Please provide both your registered email and temporary password / OTP.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await verifyInvite(email.trim(), otpOrTempPassword.trim());
      setVerifiedData(res);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Verification failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSetupAccount(e) {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Please fulfill all password security requirements before proceeding.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await setupEmployeeAccount({
        email: email.trim(),
        otpOrTempPassword: otpOrTempPassword.trim(),
        newPassword: password
      });
      setSuccessMessage(res.message || 'Account created successfully!');
      setStep(3);

      setTimeout(() => {
        router.push('/');
      }, 2500);
    } catch (err) {
      setError(err.message || 'Failed to setup account password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Brand Header */}
        <div style={styles.header}>
          <div style={styles.logoBadge}>
            <ShieldCheck size={28} color="#2563eb" />
          </div>
          <h1 style={styles.title}>HRMS Employee Onboarding</h1>
          <p style={styles.subtitle}>
            {step === 1 && 'Verify your details with the temporary password / OTP sent by your HR team.'}
            {step === 2 && `Welcome ${verifiedData?.employeeName || ''}! Set up your permanent account password.`}
            {step === 3 && 'Account Setup Complete! Redirecting to HRMS workspace...'}
          </p>
        </div>

        {/* Stepper Progress */}
        <div style={styles.stepper}>
          <div style={{ ...styles.stepItem, ...(step >= 1 ? styles.stepActive : {}) }}>
            <span style={styles.stepNum}>1</span>
            <span>Verify Identity</span>
          </div>
          <div style={styles.stepLine} />
          <div style={{ ...styles.stepItem, ...(step >= 2 ? styles.stepActive : {}) }}>
            <span style={styles.stepNum}>2</span>
            <span>Create Password</span>
          </div>
          <div style={styles.stepLine} />
          <div style={{ ...styles.stepItem, ...(step >= 3 ? styles.stepActive : {}) }}>
            <span style={styles.stepNum}>3</span>
            <span>Access Portal</span>
          </div>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: VERIFICATION */}
        {step === 1 && (
          <form onSubmit={handleVerify} style={styles.form}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                <Mail size={14} style={{ marginRight: 6 }} /> Official Email / Mobile
              </label>
              <input
                type="email"
                required
                style={styles.input}
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                <KeyRound size={14} style={{ marginRight: 6 }} /> Temporary Password / OTP Code
              </label>
              <input
                type="text"
                required
                style={styles.input}
                placeholder="Enter temporary password or 6-digit OTP"
                value={otpOrTempPassword}
                onChange={(e) => setOtpOrTempPassword(e.target.value)}
              />
              <span style={styles.fieldHelp}>
                Enter the temporary password or OTP code provided in your email / SMS.
              </span>
            </div>

            <button type="submit" disabled={isSubmitting} style={styles.primaryBtn}>
              {isSubmitting ? 'Verifying...' : 'Verify Credentials & Proceed'}
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* STEP 2: PASSWORD SETUP */}
        {step === 2 && (
          <form onSubmit={handleSetupAccount} style={styles.form}>
            <div style={styles.welcomeBanner}>
              <UserCheck size={20} color="#16a34a" />
              <div>
                <strong style={{ display: 'block', color: '#14532d', fontSize: '14px' }}>
                  Identity Verified for {verifiedData?.employeeName}
                </strong>
                <span style={{ fontSize: '12px', color: '#15803d' }}>
                  {verifiedData?.companyName} • {verifiedData?.email}
                </span>
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                <Lock size={14} style={{ marginRight: 6 }} /> Create New Password
              </label>
              <div style={styles.inputWrap}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  style={styles.input}
                  placeholder="Enter strong new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  style={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                <Lock size={14} style={{ marginRight: 6 }} /> Confirm New Password
              </label>
              <div style={styles.inputWrap}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  style={styles.input}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  style={styles.eyeBtn}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Rules Checklist */}
            <div style={styles.checklist}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#374151', marginBottom: '6px', display: 'block' }}>
                Password Strength Requirements:
              </span>
              <div style={styles.checkGrid}>
                <div style={passwordChecks.length ? styles.ruleMatch : styles.ruleFail}>
                  <CheckCircle2 size={13} /> Min 8 characters
                </div>
                <div style={passwordChecks.uppercase ? styles.ruleMatch : styles.ruleFail}>
                  <CheckCircle2 size={13} /> Uppercase letter (A-Z)
                </div>
                <div style={passwordChecks.lowercase ? styles.ruleMatch : styles.ruleFail}>
                  <CheckCircle2 size={13} /> Lowercase letter (a-z)
                </div>
                <div style={passwordChecks.number ? styles.ruleMatch : styles.ruleFail}>
                  <CheckCircle2 size={13} /> Number (0-9)
                </div>
                <div style={passwordChecks.special ? styles.ruleMatch : styles.ruleFail}>
                  <CheckCircle2 size={13} /> Special symbol (@,#,$,%)
                </div>
                <div style={passwordChecks.match ? styles.ruleMatch : styles.ruleFail}>
                  <CheckCircle2 size={13} /> Passwords match
                </div>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting || !isPasswordValid} style={{ ...styles.primaryBtn, ...(!isPasswordValid ? styles.btnDisabled : {}) }}>
              {isSubmitting ? 'Saving Account...' : 'Set Password & Activate HRMS Account'}
              <Sparkles size={16} />
            </button>
          </form>
        )}

        {/* STEP 3: SUCCESS & REDIRECT */}
        {step === 3 && (
          <div style={styles.successContainer}>
            <div style={styles.successBadge}>
              <CheckCircle2 size={54} color="#16a34a" />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: '12px 0 6px' }}>
              Account Activated Successfully!
            </h2>
            <p style={{ color: '#4b5563', fontSize: '14px', margin: 0 }}>
              {successMessage || 'You can now log into your organization workspace.'}
            </p>
            <div style={{ marginTop: '24px' }}>
              <button
                type="button"
                style={styles.primaryBtn}
                onClick={() => router.push('/')}
              >
                Enter HRMS Workspace Now
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading Onboarding Flow...</div>}>
      <OnboardContent />
    </Suspense>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f0f4ff 0%, #e6effd 100%)',
    padding: '24px',
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  card: {
    width: '100%',
    maxWidth: '520px',
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(37, 99, 235, 0.08), 0 1px 3px rgba(0,0,0,0.05)',
    padding: '36px',
    border: '1px solid #e2e8f0'
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px'
  },
  logoBadge: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    background: '#eff6ff',
    display: 'inline-grid',
    placeItems: 'center',
    marginBottom: '14px'
  },
  title: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0 0 6px'
  },
  subtitle: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0
  },
  stepper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    paddingBottom: '20px',
    borderBottom: '1px solid #f1f5f9'
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#94a3b8'
  },
  stepActive: {
    color: '#2563eb'
  },
  stepNum: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: '#f1f5f9',
    display: 'grid',
    placeItems: 'center',
    fontSize: '11px'
  },
  stepLine: {
    flex: '1',
    height: '2px',
    background: '#e2e8f0',
    margin: '0 8px'
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: '12px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '18px',
    fontWeight: '600'
  },
  form: {
    display: 'grid',
    gap: '18px'
  },
  fieldGroup: {
    display: 'grid',
    gap: '6px'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    fontWeight: '700',
    color: '#334155'
  },
  input: {
    width: '100%',
    height: '42px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '0 14px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.15s ease',
    boxSizing: 'border-box'
  },
  inputWrap: {
    position: 'relative'
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    border: 0,
    background: 'transparent',
    cursor: 'pointer',
    color: '#64748b'
  },
  fieldHelp: {
    fontSize: '12px',
    color: '#64748b'
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    height: '44px',
    borderRadius: '8px',
    background: '#2563eb',
    color: '#ffffff',
    border: 0,
    fontSize: '14px',
    fontWeight: '800',
    cursor: 'pointer',
    width: '100%'
  },
  btnDisabled: {
    background: '#94a3b8',
    cursor: 'not-allowed'
  },
  welcomeBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '12px 14px'
  },
  checklist: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '12px 14px'
  },
  checkGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '6px'
  },
  ruleMatch: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#16a34a',
    fontWeight: '700'
  },
  ruleFail: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#94a3b8'
  },
  successContainer: {
    textAlign: 'center',
    padding: '20px 0'
  },
  successBadge: {
    display: 'inline-grid',
    placeItems: 'center',
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: '#f0fdf4'
  }
};
