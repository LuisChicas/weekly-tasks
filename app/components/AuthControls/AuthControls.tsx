// Auth UI — shows login/register form when logged out, username dropdown + sync button when logged in
'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import styles from './AuthControls.module.css';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface AuthControlsProps {
  token: string | null;
  username: string | null;
  onLogin: (username: string, password: string) => Promise<string | null>;
  onRegister: (username: string, password: string) => Promise<string | null>;
  onLogout: () => void;
  onSync: () => Promise<void>;
  syncStatus: SyncStatus;
}

export default function AuthControls({
  token,
  username,
  onLogin,
  onRegister,
  onLogout,
  onSync,
  syncStatus,
}: AuthControlsProps) {
  const [formMode, setFormMode] = useState<null | 'login' | 'register'>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  // Submits login or register form, shows error on failure
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formMode) return;
    setLoading(true);
    setError(null);
    const handler = formMode === 'login' ? onLogin : onRegister;
    const err = await handler(usernameInput, passwordInput);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setFormMode(null);
      setUsernameInput('');
      setPasswordInput('');
      setError(null);
    }
  };

  const closeForm = () => {
    setFormMode(null);
    setError(null);
    setUsernameInput('');
    setPasswordInput('');
  };

  const syncLabel =
    syncStatus === 'syncing' ? 'syncing...' :
    syncStatus === 'success' ? 'synced!' :
    syncStatus === 'error' ? 'sync failed' :
    'sync';

  const syncClassName = [
    styles.syncLink,
    syncStatus === 'success' ? styles.syncSuccess : '',
    syncStatus === 'error' ? styles.syncError : '',
  ].filter(Boolean).join(' ');

  // Logged in
  if (token && username) {
    return (
      <div className={styles.container}>
        <div className={styles.userMenu} ref={dropdownRef}>
          <button
            className={styles.userMenuButton}
            onClick={() => setDropdownOpen(prev => !prev)}
          >
            {username}
            <span className={`${styles.arrow} ${dropdownOpen ? styles.arrowUp : ''}`}>▾</span>
          </button>
          {dropdownOpen && (
            <div className={styles.dropdown}>
              <button
                className={styles.dropdownItem}
                onClick={() => { setDropdownOpen(false); onLogout(); }}
              >
                log out
              </button>
            </div>
          )}
        </div>
        <button
          className={syncClassName}
          onClick={onSync}
          disabled={syncStatus === 'syncing'}
        >
          {syncLabel}
        </button>
      </div>
    );
  }

  // Logged out
  return (
    <div className={styles.container}>
      <div className={styles.authLinks}>
        <button
          className={`${styles.textButton} ${formMode === 'login' ? styles.textButtonActive : ''}`}
          onClick={() => formMode === 'login' ? closeForm() : setFormMode('login')}
        >
          log in
        </button>
        <span className={styles.separator}>/</span>
        <button
          className={`${styles.textButton} ${formMode === 'register' ? styles.textButtonActive : ''}`}
          onClick={() => formMode === 'register' ? closeForm() : setFormMode('register')}
        >
          register
        </button>
      </div>

      {formMode && (
        <div className={styles.formRow}>
          <button
            type="button"
            className={styles.cancel}
            onClick={closeForm}
          >
            &#10005;
          </button>
          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              className={styles.input}
              type="text"
              placeholder="username"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              autoFocus
            />
            <input
              className={styles.input}
              type="password"
              placeholder="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
            />
            <button
              type="submit"
              className={styles.formButton}
              disabled={loading || !usernameInput || !passwordInput}
            >
              {loading
                ? (formMode === 'login' ? 'logging in...' : 'registering...')
                : (formMode === 'login' ? 'log in' : 'register')}
            </button>
          </form>
          {error && <span className={styles.error}>{error}</span>}
        </div>
      )}
    </div>
  );
}
