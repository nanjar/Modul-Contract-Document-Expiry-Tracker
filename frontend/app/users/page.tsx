'use client';

import { FormEvent, useEffect, useState } from 'react';

type Role = 'SUPERUSER' | 'EDITOR' | 'VIEWER';
type ModuleKey = 'CONTRACT_DOCUMENT' | 'OFFICE_AUTOMATION';
type TelegramIdentity = { chatId: string; username?: string | null; isVerified: boolean };
type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  telegramIdentities?: TelegramIdentity[];
};
type ModuleAccess = { module: ModuleKey; permissions: string[] };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const MODULES: Array<{ key: ModuleKey; title: string; description: string }> = [
  { key: 'CONTRACT_DOCUMENT', title: 'Contract & Documents', description: 'Documents, expiry tracking, files and reminders.' },
  { key: 'OFFICE_AUTOMATION', title: 'Office Automation', description: 'Requests, tasks, approvals, reports and notifications.' },
];
const PERMISSIONS: Record<ModuleKey, Array<{ key: string; label: string }>> = {
  CONTRACT_DOCUMENT: [
    ['DOCUMENT_VIEW', 'View documents'],
    ['DOCUMENT_CREATE', 'Create documents'],
    ['DOCUMENT_EDIT', 'Edit documents'],
    ['DOCUMENT_ARCHIVE', 'Archive documents'],
    ['DOCUMENT_FILE_UPLOAD', 'Upload files'],
    ['DOCUMENT_FILE_DOWNLOAD', 'Download files'],
    ['DOCUMENT_REMINDER_MANAGE', 'Manage reminders'],
  ].map(([key, label]) => ({ key, label })),
  OFFICE_AUTOMATION: [
    ['OFFICE_DASHBOARD_VIEW', 'View dashboard'],
    ['OFFICE_REQUEST_VIEW', 'View requests'],
    ['OFFICE_REQUEST_CREATE', 'Create requests'],
    ['OFFICE_REQUEST_EDIT', 'Edit requests'],
    ['OFFICE_TASK_VIEW', 'View tasks'],
    ['OFFICE_TASK_UPDATE', 'Update tasks'],
    ['OFFICE_TASK_ASSIGN', 'Assign tasks'],
    ['OFFICE_APPROVAL_VIEW', 'View approvals'],
    ['OFFICE_APPROVAL_ACTION', 'Approve / reject'],
    ['OFFICE_REPORT_VIEW', 'View reports'],
  ].map(([key, label]) => ({ key, label })),
};

const DEFAULT_PERMISSIONS: Record<ModuleKey, Record<Role, string[]>> = {
  CONTRACT_DOCUMENT: {
    SUPERUSER: PERMISSIONS.CONTRACT_DOCUMENT.map((item) => item.key),
    EDITOR: PERMISSIONS.CONTRACT_DOCUMENT.map((item) => item.key),
    VIEWER: ['DOCUMENT_VIEW', 'DOCUMENT_FILE_DOWNLOAD'],
  },
  OFFICE_AUTOMATION: {
    SUPERUSER: PERMISSIONS.OFFICE_AUTOMATION.map((item) => item.key),
    EDITOR: PERMISSIONS.OFFICE_AUTOMATION.map((item) => item.key),
    VIEWER: [
      'OFFICE_DASHBOARD_VIEW',
      'OFFICE_REQUEST_VIEW',
      'OFFICE_REQUEST_CREATE',
      'OFFICE_TASK_VIEW',
      'OFFICE_TASK_UPDATE',
      'OFFICE_APPROVAL_VIEW',
    ],
  },
};

function getRole(): Role | null {
  try {
    const token = window.sessionStorage.getItem('expiry-tracker-token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return (payload.role ?? null) as Role | null;
  } catch { return null; }
}

function getHeaders(): Headers {
  const headers = new Headers();
  if (typeof window !== 'undefined') {
    const token = window.sessionStorage.getItem('expiry-tracker-token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

function emptyModulePermissions(): Record<ModuleKey, string[]> {
  return { CONTRACT_DOCUMENT: [], OFFICE_AUTOMATION: [] };
}

function RoleBadge({ role }: { role: Role }) {
  return <span style={{ display: 'inline-flex', padding: '5px 9px', borderRadius: 999, background: role === 'SUPERUSER' ? '#eee9ff' : role === 'EDITOR' ? '#e8f1ff' : '#edf1f5', color: role === 'SUPERUSER' ? '#6c42c1' : role === 'EDITOR' ? '#3466c2' : '#64748b', fontSize: 11, fontWeight: 800 }}>{role}</span>;
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
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [modulePermissions, setModulePermissions] = useState<Record<ModuleKey, string[]>>(emptyModulePermissions);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setAuthorized(getRole() === 'SUPERUSER'); }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      const response = await fetch(`${API_URL}/users`, { headers: getHeaders(), cache: 'no-store' });
      if (response.status === 401 || response.status === 403) { setAuthorized(false); return; }
      if (!response.ok) throw new Error('Unable to load users');
      const data = await response.json(); setUsers(data.items ?? data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load users'); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (authorized === true) void load(); }, [authorized]);

  function reset() {
    setEditing(null); setName(''); setEmail(''); setPassword(''); setRole('VIEWER');
    setTelegramChatId(''); setTelegramUsername(''); setModulePermissions(emptyModulePermissions());
    setFormError(''); setOpen(false); setModuleLoading(false);
  }

  async function loadModulePermissions(userId: string) {
    setModuleLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/${userId}/modules`, { headers: getHeaders(), cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load module access');
      const data: ModuleAccess[] = await response.json();
      const next = emptyModulePermissions();
      for (const item of data) next[item.module] = item.permissions ?? [];
      setModulePermissions(next);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to load module access');
    } finally { setModuleLoading(false); }
  }

  async function edit(user: User) {
    const identity = user.telegramIdentities?.[0];
    setEditing(user); setName(user.name); setEmail(user.email); setPassword(''); setRole(user.role);
    setTelegramChatId(identity?.chatId ?? ''); setTelegramUsername(identity?.username ?? '');
    setModulePermissions(emptyModulePermissions()); setFormError(''); setOpen(true);
    await loadModulePermissions(user.id);
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setFormError('');
    const validation = validationMessage(name, email, password, Boolean(editing));
    if (validation) { setFormError(validation); return; }
    setSaving(true);
    try {
      const headers = getHeaders(); headers.set('Content-Type', 'application/json');
      const response = await fetch(editing ? `${API_URL}/users/${editing.id}` : `${API_URL}/users`, {
        method: editing ? 'PATCH' : 'POST', headers,
        body: JSON.stringify(editing
          ? { name: name.trim(), role, ...(password ? { password } : {}) }
          : { name: name.trim(), email: email.trim(), role, password }),
      });
      if (response.status === 401 || response.status === 403) { setAuthorized(false); return; }
      if (!response.ok) { const payload = await response.json().catch(() => null); const message = Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message ?? 'Unable to save user'; throw new Error(message); }
      const saved = await response.json();
      const userId = editing?.id ?? saved.id;

      for (const module of MODULES) {
        const moduleHeaders = getHeaders(); moduleHeaders.set('Content-Type', 'application/json');
        const moduleResponse = await fetch(`${API_URL}/users/${userId}/modules`, {
          method: 'PATCH', headers: moduleHeaders,
          body: JSON.stringify({ module: module.key, permissions: modulePermissions[module.key] }),
        });
        if (!moduleResponse.ok) {
          const payload = await moduleResponse.json().catch(() => null);
          const message = Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message ?? `Unable to save ${module.title} access`;
          throw new Error(message);
        }
      }

      if (telegramChatId.trim()) {
        const telegramHeaders = getHeaders(); telegramHeaders.set('Content-Type', 'application/json');
        const telegramResponse = await fetch(`${API_URL}/users/${userId}/telegram`, {
          method: 'PATCH', headers: telegramHeaders,
          body: JSON.stringify({ chatId: telegramChatId.trim(), username: telegramUsername.trim() || undefined }),
        });
        if (!telegramResponse.ok) {
          const payload = await telegramResponse.json().catch(() => null);
          throw new Error(payload?.message ?? 'User saved, but Telegram identity could not be saved');
        }
      } else if (editing?.telegramIdentities?.length) {
        const telegramResponse = await fetch(`${API_URL}/users/${userId}/telegram`, { method: 'DELETE', headers: getHeaders() });
        if (!telegramResponse.ok) throw new Error('User saved, but Telegram identity could not be removed');
      }

      reset(); await load();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Unable to save user'); }
    finally { setSaving(false); }
  }

  async function setActive(user: User, isActive: boolean) {
    if (!confirm(`${isActive ? 'Reactivate' : 'Deactivate'} ${user.email}?`)) return;
    setError('');
    try {
      const headers = getHeaders(); headers.set('Content-Type', 'application/json');
      const response = await fetch(`${API_URL}/users/${user.id}`, { method: 'PATCH', headers, body: JSON.stringify({ isActive }) });
      if (response.status === 401 || response.status === 403) { setAuthorized(false); return; }
      if (!response.ok) { const payload = await response.json().catch(() => null); throw new Error(payload?.message ?? `Unable to ${isActive ? 'reactivate' : 'deactivate'} user`); }
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update user'); }
  }

  const toggleModule = (module: ModuleKey, enabled: boolean) => {
    setModulePermissions((current) => ({
      ...current,
      [module]: enabled ? [...DEFAULT_PERMISSIONS[module][role]] : [],
    }));
  };

  const togglePermission = (module: ModuleKey, permission: string, checked: boolean) => {
    setModulePermissions((current) => ({
      ...current,
      [module]: checked
        ? [...new Set([...current[module], permission])]
        : current[module].filter((item) => item !== permission),
    }));
  };

  const cardStyle = { background: '#fff', border: '1px solid #e8ecf2', borderRadius: 18, boxShadow: '0 12px 30px rgba(25,40,70,.05)' } as const;
  const permissionStyle = { ...cardStyle, padding: 24, borderColor: '#efb7b7', color: '#a33a3a', background: '#fffafa' } as const;

  if (authorized === null) return null;

  return <main style={{ minHeight: '100vh', background: '#f6f8fc', padding: '32px' }}>
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, marginBottom: 28 }}>
        <div><div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#70809b' }}>Administration</div><h1 style={{ margin: '7px 0', fontSize: 32, color: '#17213a' }}>Users & employees</h1><p style={{ margin: 0, color: '#718096' }}>One employee identity shared across Contract & Document and Office Automation.</p></div>
        {authorized && <button onClick={() => { reset(); setOpen(true); }} style={primaryButtonStyle}>+ Add employee</button>}
      </div>

      {!authorized ? <div role="alert" style={permissionStyle}>You do not have permission to manage users and access.</div> : <>
        {error && <div style={pageErrorStyle}>{error}</div>}
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          {loading ? <div style={{ padding: 40, color: '#718096' }}>Loading employees…</div> : users.length === 0 ? <div style={{ padding: 50, textAlign: 'center', color: '#718096' }}>No employees found.</div> : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Employee', 'Role', 'Telegram', 'Status', 'Created', ''].map((heading, index) => <th key={index} style={tableHeaderStyle}>{heading}</th>)}</tr></thead><tbody>{users.map((user) => { const telegram = user.telegramIdentities?.[0]; return <tr key={user.id}><td style={tableCellStyle}><div style={{ fontWeight: 800, color: '#202b42' }}>{user.name}</div><div style={{ fontSize: 13, color: '#7b8799', marginTop: 3 }}>{user.email}</div></td><td style={tableCellStyle}><RoleBadge role={user.role} /></td><td style={tableCellStyle}>{telegram ? <><div style={{ fontWeight: 700, color: '#16845b' }}>Connected</div><div style={{ fontSize: 12, color: '#718096' }}>{telegram.chatId}{telegram.username ? ` · @${telegram.username.replace(/^@/, '')}` : ''}</div></> : <span style={{ color: '#9aa4b2', fontSize: 13 }}>Not configured</span>}</td><td style={tableCellStyle}><span style={{ color: user.isActive ? '#16845b' : '#9aa4b2', fontWeight: 700, fontSize: 13 }}>{user.isActive ? 'Active' : 'Inactive'}</span></td><td style={{ ...tableCellStyle, color: '#718096', fontSize: 13 }}>{new Date(user.createdAt).toLocaleDateString()}</td><td style={{ ...tableCellStyle, whiteSpace: 'nowrap' }}><button onClick={() => void edit(user)} style={linkButtonStyle}>Edit</button><button onClick={() => void edit(user)} style={linkButtonStyle}>Access</button>{user.isActive ? <button onClick={() => setActive(user, false)} style={{ ...linkButtonStyle, color: '#b42318' }}>Deactivate</button> : <button onClick={() => setActive(user, true)} style={{ ...linkButtonStyle, color: '#16845b' }}>Reactivate</button>}</td></tr>; })}</tbody></table></div>}
        </div>
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>{[['SUPERUSER', 'Full administration and access control'], ['EDITOR', 'Create and manage documents and permitted Office Automation records'], ['VIEWER', 'Read-only workspace access unless module permissions grant more']].map(([roleName, description]) => <div key={roleName} style={{ ...cardStyle, padding: 17 }}><RoleBadge role={roleName as Role} /><p style={{ fontSize: 13, color: '#718096', margin: '10px 0 0' }}>{description}</p></div>)}</div>

        {open && <div style={overlayStyle}><form noValidate onSubmit={save} style={modalStyle}><div style={modalHeaderStyle}><div><h2 style={{ margin: 0, color: '#17213a' }}>{editing ? 'Edit employee' : 'Add employee'}</h2><p style={{ margin: '6px 0 22px', color: '#718096', fontSize: 13 }}>{editing ? 'Update the shared employee identity and module access.' : 'Create the employee account and choose the modules this employee may access.'}</p></div><button type="button" onClick={reset} style={closeButtonStyle}>×</button></div>{formError && <div role="alert" style={formErrorStyle}>{formError}</div>}<label style={fieldLabelStyle}>Name<input value={name} onChange={(event) => { setName(event.target.value); setFormError(''); }} type="text" style={fieldInputStyle} /></label><label style={fieldLabelStyle}>Email{editing ? <input value={email} type="email" disabled style={{ ...fieldInputStyle, background: '#f3f5f8', color: '#69758a', cursor: 'not-allowed' }} /> : <input value={email} onChange={(event) => { setEmail(event.target.value); setFormError(''); }} type="email" style={fieldInputStyle} />}</label><label style={fieldLabelStyle}>Password<input value={password} onChange={(event) => { setPassword(event.target.value); setFormError(''); }} type="password" placeholder={editing ? 'Leave blank to keep current password' : ''} style={fieldInputStyle} /></label><label style={fieldLabelStyle}>Role<select value={role} onChange={(event) => { setRole(event.target.value as Role); setFormError(''); }} style={{ ...fieldInputStyle, background: '#fff' }}><option value="VIEWER">Viewer</option><option value="EDITOR">Editor</option><option value="SUPERUSER">Superuser</option></select></label>

          <div style={moduleSectionStyle}><div style={moduleSectionHeaderStyle}><div><div style={{ fontSize: 13, fontWeight: 850, color: '#26324d' }}>Module access & permissions</div><div style={{ marginTop: 4, color: '#8a96a8', fontSize: 12 }}>Access is deny-by-default. Select only the modules and actions required for this employee.</div></div><span style={{ fontSize: 11, fontWeight: 800, color: '#64748b' }}>{role === 'SUPERUSER' ? 'SUPERUSER: full access' : 'Per employee'}</span></div>{moduleLoading ? <div style={moduleLoadingStyle}>Loading current module access…</div> : MODULES.map((module) => { const permissions = modulePermissions[module.key]; const enabled = permissions.length > 0; return <div key={module.key} style={moduleCardStyle}><label style={moduleToggleStyle}><input type="checkbox" checked={enabled} onChange={(event) => toggleModule(module.key, event.target.checked)} disabled={role === 'SUPERUSER'} /><span><strong>{module.title}</strong><small>{module.description}</small></span></label>{enabled && <div style={permissionGridStyle}>{PERMISSIONS[module.key].map((permission) => <label key={permission.key} style={permissionStyleItem}><input type="checkbox" checked={permissions.includes(permission.key)} onChange={(event) => togglePermission(module.key, permission.key, event.target.checked)} disabled={role === 'SUPERUSER'} />{permission.label}</label>)}</div>}</div>; })}</div>

          <div style={{ marginTop: 8, paddingTop: 18, borderTop: '1px solid #edf0f5' }}><div style={{ fontSize: 12, fontWeight: 800, color: '#526078', marginBottom: 4 }}>Telegram notification channel</div><p style={{ margin: '0 0 14px', color: '#8a96a8', fontSize: 12 }}>If Chat ID is configured, integration events can deliver Telegram notifications to this employee.</p><label style={fieldLabelStyle}>Chat ID<input value={telegramChatId} onChange={(event) => setTelegramChatId(event.target.value)} type="text" placeholder="e.g. 123456789" style={fieldInputStyle} /></label><label style={fieldLabelStyle}>Username<input value={telegramUsername} onChange={(event) => setTelegramUsername(event.target.value)} type="text" placeholder="optional" style={fieldInputStyle} /></label></div><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 25 }}><button type="button" onClick={reset} style={secondaryButtonStyle}>Cancel</button><button type="submit" disabled={saving || moduleLoading} style={primaryButtonStyle}>{saving ? 'Saving…' : 'Save employee'}</button></div></form></div>}
      </>}
    </div>
  </main>;
}

const primaryButtonStyle = { border: 0, borderRadius: 12, padding: '12px 18px', background: '#273657', color: '#fff', fontWeight: 800, cursor: 'pointer' } as const;
const secondaryButtonStyle = { padding: '11px 17px', border: '1px solid #dfe5ee', borderRadius: 10, background: '#fff', fontWeight: 800 } as const;
const linkButtonStyle = { border: 0, background: 'transparent', color: '#4c6fff', fontWeight: 800, cursor: 'pointer', marginRight: 12 } as const;
const pageErrorStyle = { padding: 14, borderRadius: 12, background: '#fff0f0', color: '#b42318', marginBottom: 18 } as const;
const formErrorStyle = { padding: 12, marginBottom: 18, borderRadius: 10, background: '#fff0f0', border: '1px solid #ffd5d5', color: '#b42318', fontSize: 13, lineHeight: 1.5 } as const;
const tableHeaderStyle = { textAlign: 'left' as const, padding: '15px 20px', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '.08em', color: '#8a96a8', borderBottom: '1px solid #edf0f5' } as const;
const tableCellStyle = { padding: '17px 20px', borderBottom: '1px solid #f0f2f6' } as const;
const fieldLabelStyle = { display: 'block', fontSize: 12, fontWeight: 800, color: '#526078', marginBottom: 15 } as const;
const fieldInputStyle = { display: 'block', width: '100%', boxSizing: 'border-box' as const, marginTop: 7, padding: '12px 13px', border: '1px solid #dfe5ee', borderRadius: 10 } as const;
const moduleSectionStyle = { marginTop: 8, paddingTop: 18, borderTop: '1px solid #edf0f5' } as const;
const moduleSectionHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 } as const;
const moduleCardStyle = { border: '1px solid #e5eaf1', borderRadius: 14, padding: 14, marginBottom: 10, background: '#fbfcfe' } as const;
const moduleToggleStyle = { display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', color: '#26324d', fontSize: 13 } as const;
const permissionGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #edf0f5' } as const;
const permissionStyleItem = { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 9, background: '#fff', color: '#526078', fontSize: 12, cursor: 'pointer' } as const;
const moduleLoadingStyle = { padding: 14, borderRadius: 10, background: '#f7f9fc', color: '#718096', fontSize: 12 } as const;
const overlayStyle = { position: 'fixed' as const, inset: 0, background: 'rgba(15,23,42,.42)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 50, overflowY: 'auto' } as const;
const modalStyle = { width: '100%', maxWidth: 700, maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' as const, background: '#fff', borderRadius: 20, padding: 28, boxShadow: '0 25px 80px rgba(0,0,0,.2)' } as const;
const modalHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as const;
const closeButtonStyle = { border: 0, background: 'transparent', fontSize: 22, color: '#8792a4', cursor: 'pointer' } as const;
