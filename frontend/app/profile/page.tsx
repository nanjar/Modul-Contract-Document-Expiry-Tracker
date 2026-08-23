'use client';

import { FormEvent, useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

type Profile = { id: string; name: string; email: string; role: 'SUPERUSER' | 'EDITOR' | 'VIEWER'; };

function headers() {
  const h = new Headers({ 'Content-Type': 'application/json' });
  const token = sessionStorage.getItem('expiry-tracker-token');
  if (token) h.set('Authorization', `Bearer ${token}`);
  return h;
}

function messageFrom(response: Response, fallback: string) {
  return response.json().catch(() => ({})).then((data) => Array.isArray(data?.message) ? data.message.join(', ') : data?.message ?? fallback);
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState(''); const [newPassword, setNewPassword] = useState(''); const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [changingPassword, setChangingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState(''); const [profileError, setProfileError] = useState(''); const [passwordMessage, setPasswordMessage] = useState(''); const [passwordError, setPasswordError] = useState('');

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (window.location.hash === '#security') document.getElementById('security')?.scrollIntoView({ behavior: 'smooth' }); }, []);

  async function load() {
    setLoading(true);
    try { const response = await fetch(`${API_URL}/profile`, { headers: headers() }); if (!response.ok) throw new Error(await messageFrom(response, 'Unable to load profile.')); const data = await response.json(); setProfile(data); setName(data.name); setEmail(data.email); }
    catch (error) { setProfileError(error instanceof Error ? error.message : 'Unable to load profile.'); }
    finally { setLoading(false); }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); setProfileError(''); setProfileMessage('');
    if (name.trim().length < 2) { setProfileError('Name must be at least 2 characters.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setProfileError('Please enter a valid email address.'); return; }
    setSaving(true);
    try { const response = await fetch(`${API_URL}/profile`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ name: name.trim(), email: email.trim() }) }); if (!response.ok) throw new Error(await messageFrom(response, 'Unable to update profile.')); const data = await response.json(); setProfile(data.user); setName(data.user.name); setEmail(data.user.email); sessionStorage.setItem('expiry-tracker-token', data.accessToken); window.dispatchEvent(new Event('expiry-tracker-auth-change')); setProfileMessage('Profile updated successfully.'); }
    catch (error) { setProfileError(error instanceof Error ? error.message : 'Unable to update profile.'); }
    finally { setSaving(false); }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault(); setPasswordError(''); setPasswordMessage('');
    if (!currentPassword) { setPasswordError('Current password is required.'); return; }
    if (newPassword.length < 8) { setPasswordError('New password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Password confirmation does not match.'); return; }
    setChangingPassword(true);
    try { const response = await fetch(`${API_URL}/profile/password`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ currentPassword, newPassword }) }); if (!response.ok) throw new Error(await messageFrom(response, 'Unable to change password.')); const data = await response.json(); sessionStorage.setItem('expiry-tracker-token', data.accessToken); window.dispatchEvent(new Event('expiry-tracker-auth-change')); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordMessage('Password changed successfully.'); }
    catch (error) { setPasswordError(error instanceof Error ? error.message : 'Unable to change password.'); }
    finally { setChangingPassword(false); }
  }

  if (loading) return <main className="workspace profile-page"><div className="workspace-head"><p className="eyebrow">ACCOUNT</p><h1>Profile</h1><p>Loading your account…</p></div></main>;

  return <main className="workspace profile-page">
    <header className="workspace-head"><div><p className="eyebrow">ACCOUNT</p><h1>Profile</h1><p>Manage your personal account information and security.</p></div><span className="profile-role-badge">{profile?.role}</span></header>
    <section className="profile-card"><div className="profile-card-title"><div><h2>Personal information</h2><p>Update the name and email used across the workspace.</p></div></div>
      {profileError && <div className="profile-inline-error">{profileError}</div>}{profileMessage && <div className="profile-inline-success">{profileMessage}</div>}
      <form onSubmit={saveProfile} noValidate className="profile-form"><label>Name<input value={name} onChange={e => setName(e.target.value)} /></label><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} /></label><label>Role<input value={profile?.role ?? ''} disabled /></label><div><button className="profile-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div></form>
    </section>
    <section className="profile-card" id="security"><div className="profile-card-title"><div><h2>Security</h2><p>Change your password. Your current password is required.</p></div></div>
      {passwordError && <div className="profile-inline-error">{passwordError}</div>}{passwordMessage && <div className="profile-inline-success">{passwordMessage}</div>}
      <form onSubmit={changePassword} noValidate className="profile-form"><label>Current password<input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" /></label><label>New password<input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" /><small>Minimum 8 characters.</small></label><label>Confirm new password<input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" /></label><div><button className="profile-primary" disabled={changingPassword}>{changingPassword ? 'Updating…' : 'Change password'}</button></div></form>
    </section>
  </main>;
}
