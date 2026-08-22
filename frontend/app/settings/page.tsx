'use client';

import { FormEvent, useEffect, useState, type CSSProperties } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
type Settings = { warningThresholdDays: number; defaultReminderDays: number[]; notificationEmailMode: string };

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [threshold, setThreshold] = useState('30');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const token = window.sessionStorage.getItem('expiry-tracker-token');
    if (!token) return;
    const response = await fetch(`${API_URL}/settings`, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401 || response.status === 403) { setError('You do not have permission to manage system settings.'); return; }
    if (!response.ok) throw new Error('Unable to load settings.');
    const data = await response.json(); setSettings(data); setThreshold(String(data.warningThresholdDays));
  }
  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : 'Unable to load settings.')); }, []);

  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true); setMessage(''); setError('');
    try {
      const token = window.sessionStorage.getItem('expiry-tracker-token');
      const response = await fetch(`${API_URL}/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` }, body: JSON.stringify({ warningThresholdDays: Number(threshold) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(', ') : data.message ?? 'Unable to save settings.');
      setSettings(data); setThreshold(String(data.warningThresholdDays)); setMessage('Settings saved successfully.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save settings.'); }
    finally { setSaving(false); }
  }

  const card: CSSProperties = { background: '#fff', border: '1px solid #e8ecf2', borderRadius: 18, padding: 24, marginBottom: 16, boxShadow: '0 12px 30px rgba(25,40,70,.05)' };
  return <main style={{ minHeight: '100vh', background: '#f6f8fc', padding: '32px' }}><div style={{ maxWidth: 1000, margin: '0 auto' }}>
    <div style={{ marginBottom: 28 }}><div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#70809b' }}>Workspace</div><h1 style={{ margin: '7px 0', fontSize: 32, color: '#17213a' }}>Settings</h1><p style={{ margin: 0, color: '#718096' }}>Configure expiry behavior and review notification configuration.</p></div>
    {error && <div role="alert" style={{ ...card, borderColor: '#efb7b7', color: '#a33a3a' }}>{error}</div>}
    <section style={card}><h2 style={{ margin: '0 0 6px', fontSize: 18, color: '#17213a' }}>Expiry status</h2><p style={{ color: '#718096', fontSize: 14 }}>Documents at or before this number of calendar days from today are shown as <strong>Expiring Soon</strong>. This is a system-wide setting.</p><form onSubmit={save} style={{ display: 'flex', alignItems: 'end', gap: 12, flexWrap: 'wrap', marginTop: 18 }}><label style={{ display: 'grid', gap: 7, color: '#34415c', fontSize: 13, fontWeight: 700 }}>Warning threshold (days)<input aria-label="Warning threshold in days" type="number" min={0} max={3650} step={1} required value={threshold} onChange={(e) => setThreshold(e.target.value)} style={{ width: 190, border: '1px solid #dce2eb', borderRadius: 10, padding: '11px 12px', fontSize: 15 }} /></label><button disabled={saving || !settings} style={{ border: 0, borderRadius: 10, padding: '12px 18px', background: '#4c6fff', color: '#fff', fontWeight: 800 }}>{saving ? 'Saving…' : 'Save settings'}</button></form>{message && <div role="status" style={{ marginTop: 12, color: '#257a4b', fontSize: 13 }}>{message}</div>}</section>
    <section style={card}><h2 style={{ margin: '0 0 6px', fontSize: 18, color: '#17213a' }}>Default reminders</h2><p style={{ color: '#718096', fontSize: 14 }}>New expiring documents receive these default intervals and each reminder remains configurable per document.</p><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>{(settings?.defaultReminderDays ?? [90, 30, 14, 7, 1]).map((days) => <span key={days} style={{ padding: '8px 12px', border: '1px solid #e1e6ee', borderRadius: 999, color: '#273657', fontSize: 13, fontWeight: 700 }}>{days} days before</span>)}</div></section>
    <section style={card}><h2 style={{ margin: '0 0 6px', fontSize: 18, color: '#17213a' }}>Email provider</h2><p style={{ color: '#718096', fontSize: 14 }}>Provider credentials remain deployment-level secrets and are never persisted in the application database.</p><div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: '#f7f9fc', fontFamily: 'monospace', fontSize: 13 }}>NOTIFICATION_EMAIL_MODE={settings?.notificationEmailMode ?? 'loading'}</div></section>
  </div></main>;
}
