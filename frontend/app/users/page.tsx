'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Role = 'SUPERUSER' | 'EDITOR' | 'VIEWER';
type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

function getRole(): Role | null {
  try {
    const token = window.sessionStorage.getItem('expiry-tracker-token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return (payload.role ?? null) as Role | null;
  } catch {
    return null;
  }
}

function getHeaders(): Headers {
  const headers = new Headers();
  if (typeof window !== 'undefined') {
    const token = window.sessionStorage.getItem('expiry-tracker-token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <span style={{
      display: 'inline-flex', padding: '5px 9px', borderRadius: 999,
      background: role === 'SUPERUSER' ? '#eee9ff' : role === 'EDITOR' ? '#e8f1ff' : '#edf1f5',
      color: role === 'SUPERUSER' ? '#6c42c1' : role === 'EDITOR' ? '#3466c2' : '#64748b',
      fontSize: 11, fontWeight: 800,
    }}>{role}</span>
  );
}

function validationMessage(name: string, email: string, password: string, editing: boolean) {
  if (!name.trim()) return 'Name is required.';
  if (!email.trim()) return 'Email is required.';
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Please enter a valid email address.';
  if (!editing && !password) return 'Password is required.';
  if (password && password.length < 8) return 'Password must be at least 8 characters.';
  return '';
}

export default function UsersPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('VIEWER');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const roleFromToken = getRole();
    if (roleFromToken !== 'SUPERUSER') {
      router.replace('/');
      return;
    }
    setAuthorized(true);
  }, [router]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/users`, { headers: getHeaders() });
      if (response.status === 401 || response.status === 403) {
        router.replace('/');
        return;
      }
      if (!response.ok) throw new Error('Unable to load users');
      const data = await response.json();
      setUsers(data.items ?? data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authorized !== true) return;
    void load();
  }, [authorized]);

  function reset() {
    setEditing(null); setName(''); setEmail(''); setPassword(''); setRole('VIEWER');
    setFormError(''); setOpen(false);
  }

  function edit(user: User) {
    setEditing(user); setName(user.name); setEmail(user.email); setPassword('');
    setRole(user.role); setFormError(''); setOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setFormError('');

    const validation = validationMessage(name, email, password, Boolean(editing));
    if (validation) {
      setFormError(validation);
      return;
    }

    setSaving(true);
    try {
      const body: { name: string; email: string; role: Role; password?: string } = {
        name: name.trim(), email: email.trim(), role,
      };
      if (password) body.password = password;

      const response = await fetch(
        editing ? `${API_URL}/users/${editing.id}` : `${API_URL}/users`,
        {
          method: editing ? 'PATCH' : 'POST',
          headers: (() => {
            const headers = getHeaders();
            headers.set('Content-Type', 'application/json');
            return headers;
          })(),
          body: JSON.stringify(editing ? body : { ...body, password }),
        },
      );

      if (response.status === 401 || response.status === 403) {
        router.replace('/');
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = Array.isArray(payload?.message)
          ? payload.message.join(', ')
          : payload?.message ?? 'Unable to save user';
        throw new Error(message);
      }

      reset();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save user');
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(user: User) {
    if (!confirm(`Deactivate ${user.email}?`)) return;
    try {
      const response = await fetch(`${API_URL}/users/${user.id}`, {
        method: 'DELETE', headers: getHeaders(),
      });
      if (response.status === 401 || response.status === 403) {
        router.replace('/');
        return;
      }
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? 'Unable to deactivate user');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to deactivate user');
    }
  }

  if (authorized !== true) return null;

  return (
    <main style={{ minHeight: '100vh', background: '#f6f8fc', padding: '32px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#70809b' }}>Administration</div>
            <h1 style={{ margin: '7px 0', fontSize: 32, color: '#17213a' }}>Users & access</h1>
            <p style={{ margin: 0, color: '#718096' }}>Manage users, roles and account status from one secure workspace.</p>
          </div>
          <button onClick={() => { reset(); setOpen(true); }} style={primaryButtonStyle}>+ Add user</button>
        </div>

        {error && <div style={pageErrorStyle}>{error}</div>}

        <div style={{ background: '#fff', border: '1px solid #e8ecf2', borderRadius: 18, overflow: 'hidden', boxShadow: '0 12px 30px rgba(25,40,70,.05)' }}>
          {loading ? <div style={{ padding: 40, color: '#718096' }}>Loading users…</div> : users.length === 0 ? <div style={{ padding: 50, textAlign: 'center', color: '#718096' }}>No users found.</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['User', 'Role', 'Status', 'Created', ''].map((heading, index) => <th key={index} style={tableHeaderStyle}>{heading}</th>)}</tr></thead>
                <tbody>{users.map((user) => (
                  <tr key={user.id}>
                    <td style={tableCellStyle}><div style={{ fontWeight: 800, color: '#202b42' }}>{user.name}</div><div style={{ fontSize: 13, color: '#7b8799', marginTop: 3 }}>{user.email}</div></td>
                    <td style={tableCellStyle}><RoleBadge role={user.role} /></td>
                    <td style={tableCellStyle}><span style={{ color: user.isActive ? '#16845b' : '#9aa4b2', fontWeight: 700, fontSize: 13 }}>{user.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ ...tableCellStyle, color: '#718096', fontSize: 13 }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td style={{ ...tableCellStyle, whiteSpace: 'nowrap' }}>
                      <button onClick={() => edit(user)} style={linkButtonStyle}>Edit</button>
                      {user.isActive && <button onClick={() => deactivate(user)} style={{ ...linkButtonStyle, color: '#b42318' }}>Deactivate</button>}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {[
            ['SUPERUSER', 'Full administration and access control'],
            ['EDITOR', 'Create and manage documents and reminders'],
            ['VIEWER', 'Read-only workspace access'],
          ].map(([roleName, description]) => <div key={roleName} style={{ background: '#fff', border: '1px solid #e8ecf2', borderRadius: 14, padding: 17 }}><RoleBadge role={roleName as Role} /><p style={{ fontSize: 13, color: '#718096', margin: '10px 0 0' }}>{description}</p></div>)}
        </div>

        {open && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.42)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 50 }}>
            <form noValidate onSubmit={save} style={{ width: '100%', maxWidth: 500, background: '#fff', borderRadius: 20, padding: 28, boxShadow: '0 25px 80px rgba(0,0,0,.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, color: '#17213a' }}>{editing ? 'Edit user' : 'Add user'}</h2>
                  <p style={{ margin: '6px 0 22px', color: '#718096', fontSize: 13 }}>{editing ? 'Update identity and access role.' : 'Create an account with the appropriate access level.'}</p>
                </div>
                <button type="button" onClick={reset} style={{ border: 0, background: 'transparent', fontSize: 22, color: '#8792a4' }}>×</button>
              </div>

              {formError && <div role="alert" style={formErrorStyle}>{formError}</div>}

              <label style={fieldLabelStyle}>Name<input value={name} onChange={(event) => { setName(event.target.value); setFormError(''); }} type="text" style={fieldInputStyle} /></label>
              <label style={fieldLabelStyle}>Email<input value={email} onChange={(event) => { setEmail(event.target.value); setFormError(''); }} type="email" style={fieldInputStyle} /></label>
              <label style={fieldLabelStyle}>Password<input value={password} onChange={(event) => { setPassword(event.target.value); setFormError(''); }} type="password" placeholder={editing ? 'Leave blank to keep current password' : ''} style={fieldInputStyle} /></label>
              <label style={fieldLabelStyle}>Role<select value={role} onChange={(event) => { setRole(event.target.value as Role); setFormError(''); }} style={{ ...fieldInputStyle, background: '#fff' }}><option value="VIEWER">Viewer</option><option value="EDITOR">Editor</option><option value="SUPERUSER">Superuser</option></select></label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 25 }}>
                <button type="button" onClick={reset} style={secondaryButtonStyle}>Cancel</button>
                <button type="submit" disabled={saving} style={primaryButtonStyle}>{saving ? 'Saving…' : 'Save user'}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

const primaryButtonStyle = { border: 0, borderRadius: 12, padding: '12px 18px', background: '#273657', color: '#fff', fontWeight: 800, cursor: 'pointer' } as const;
const secondaryButtonStyle = { padding: '11px 17px', border: '1px solid #dfe5ee', borderRadius: 10, background: '#fff', fontWeight: 800 } as const;
const linkButtonStyle = { border: 0, background: 'transparent', color: '#4c6fff', fontWeight: 800, cursor: 'pointer', marginRight: 14 } as const;
const pageErrorStyle = { padding: 14, borderRadius: 12, background: '#fff0f0', color: '#b42318', marginBottom: 18 } as const;
const formErrorStyle = { padding: 12, marginBottom: 18, borderRadius: 10, background: '#fff0f0', border: '1px solid #ffd5d5', color: '#b42318', fontSize: 13, lineHeight: 1.5 } as const;
const tableHeaderStyle = { textAlign: 'left' as const, padding: '15px 20px', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '.08em', color: '#8a96a8', borderBottom: '1px solid #edf0f5' } as const;
const tableCellStyle = { padding: '17px 20px', borderBottom: '1px solid #f0f2f6' } as const;
const fieldLabelStyle = { display: 'block', fontSize: 12, fontWeight: 800, color: '#526078', marginBottom: 15 } as const;
const fieldInputStyle = { display: 'block', width: '100%', boxSizing: 'border-box' as const, marginTop: 7, padding: '12px 13px', border: '1px solid #dfe5ee', borderRadius: 10 } as const;
