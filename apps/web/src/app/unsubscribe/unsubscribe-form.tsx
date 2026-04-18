'use client';

import { useState } from 'react';
import { savePreferences, SavePrefsPayload } from './actions';

interface Preferences {
  email: string;
  unsubscribe_tips: boolean;
  unsubscribe_broadcasts: boolean;
  unsubscribe_partnership: boolean;
  unsubscribe_cold: boolean;
  unsubscribed_all: boolean;
}

interface Props {
  token: string;
  initialPrefs: Preferences | null;
  initialError: string | null;
}

const CATEGORIES: {
  key: keyof Omit<Preferences, 'email' | 'unsubscribed_all'>;
  label: string;
  description: string;
}[] = [
  {
    key: 'unsubscribe_tips',
    label: 'Product tips & educational content',
    description: 'Guides, feature updates, and bookkeeping best practices.',
  },
  {
    key: 'unsubscribe_broadcasts',
    label: 'Broadcast campaigns',
    description: 'Announcements and promotional emails sent to our contact list.',
  },
  {
    key: 'unsubscribe_partnership',
    label: 'Partnership outreach',
    description: 'Emails about partnership and collaboration opportunities.',
  },
  {
    key: 'unsubscribe_cold',
    label: 'Cold outreach',
    description: 'Initial introductory emails about Tempo Books.',
  },
];

export function UnsubscribeForm({ token, initialPrefs, initialError }: Props) {
  const [prefs, setPrefs]     = useState<Preferences | null>(initialPrefs);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(initialError);

  function toggle(key: keyof Omit<Preferences, 'email' | 'unsubscribed_all'>) {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: !prefs[key], unsubscribed_all: false });
    setSaved(false);
  }

  async function handleSave() {
    if (!prefs) return;
    setSaving(true);
    setError(null);
    const payload: SavePrefsPayload = {
      token,
      unsubscribe_tips:        prefs.unsubscribe_tips,
      unsubscribe_broadcasts:  prefs.unsubscribe_broadcasts,
      unsubscribe_partnership: prefs.unsubscribe_partnership,
      unsubscribe_cold:        prefs.unsubscribe_cold,
      unsubscribed_all:        prefs.unsubscribed_all,
    };
    const result = await savePreferences(payload);
    if (result.success) {
      setSaved(true);
    } else {
      setError(result.error ?? 'Failed to save. Please try again.');
    }
    setSaving(false);
  }

  async function handleUnsubscribeAll() {
    if (!prefs) return;
    setSaving(true);
    setError(null);
    const allUnsub: Preferences = {
      ...prefs,
      unsubscribe_tips:        true,
      unsubscribe_broadcasts:  true,
      unsubscribe_partnership: true,
      unsubscribe_cold:        true,
      unsubscribed_all:        true,
    };
    setPrefs(allUnsub);
    const payload: SavePrefsPayload = {
      token,
      unsubscribe_tips:        true,
      unsubscribe_broadcasts:  true,
      unsubscribe_partnership: true,
      unsubscribe_cold:        true,
      unsubscribed_all:        true,
    };
    const result = await savePreferences(payload);
    if (result.success) {
      setSaved(true);
    } else {
      setError(result.error ?? 'Failed to save. Please try again.');
    }
    setSaving(false);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f4f4f5',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '60px 16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '520px',
        background: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ background: '#0F6E56', padding: '24px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="3" width="4" height="18" rx="1" fill="white" opacity="0.6"/>
              <rect x="10" y="8" width="4" height="13" rx="1" fill="white" opacity="0.8"/>
              <rect x="18" y="1" width="4" height="20" rx="1" fill="white"/>
            </svg>
            <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '17px' }}>
              Tempo Books
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '32px' }}>

          {/* Error state */}
          {error && !prefs && (
            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '6px',
              padding: '16px',
              color: '#991B1B',
              fontSize: '14px',
            }}>
              {error}
            </div>
          )}

          {/* Preferences form */}
          {prefs && (
            <>
              <h1 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>
                Email preferences
              </h1>
              <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#6b7280' }}>
                {prefs.email}
              </p>

              {saved && (
                <div style={{
                  background: '#EDF7F2',
                  border: '1px solid #c6e8d8',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  color: '#065F46',
                  fontSize: '14px',
                  marginBottom: '20px',
                }}>
                  &#10003;&nbsp; Your preferences have been saved.
                </div>
              )}

              {error && (
                <div style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  color: '#991B1B',
                  fontSize: '14px',
                  marginBottom: '20px',
                }}>
                  {error}
                </div>
              )}

              <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#374151' }}>
                Uncheck the types of email you no longer want to receive:
              </p>

              {CATEGORIES.map((cat) => (
                <label
                  key={cat.key}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '14px 0',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!prefs[cat.key]}
                    onChange={() => toggle(cat.key)}
                    style={{
                      marginTop: '2px',
                      width: '16px',
                      height: '16px',
                      accentColor: '#0F6E56',
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 'bold', color: '#111827' }}>
                      {cat.label}
                    </p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                      {cat.description}
                    </p>
                  </div>
                </label>
              ))}

              <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    background: saving ? '#9CA3AF' : '#0F6E56',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '13px 24px',
                    fontSize: '15px',
                    fontWeight: 'bold',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontFamily: 'Arial, sans-serif',
                    width: '100%',
                  }}
                >
                  {saving ? 'Saving\u2026' : 'Save preferences'}
                </button>

                <button
                  onClick={handleUnsubscribeAll}
                  disabled={saving}
                  style={{
                    background: 'transparent',
                    color: '#6b7280',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontFamily: 'Arial, sans-serif',
                    width: '100%',
                  }}
                >
                  Unsubscribe from all marketing emails
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          background: '#f9fafb',
          borderTop: '1px solid #e5e7eb',
          padding: '16px 32px',
          textAlign: 'center',
        }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#9CA3AF' }}>
            Tempo Books &mdash;{' '}
            <a href="https://gettempo.ca" style={{ color: '#0F6E56', textDecoration: 'none' }}>
              gettempo.ca
            </a>
            {' '}&mdash; 209 Queen Street West, Toronto, ON
          </p>
        </div>

      </div>
    </div>
  );
}
