'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Role = 'SUPERUSER' | 'EDITOR' | 'VIEWER';
type Employee = {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  employeeNumber: string | null;
  department: string | null;
  position: string | null;
  managerId: string | null;
  createdAt: string;
  updatedAt: string;
  manager?: { id: string; name: string; email: string } | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const TOKEN_KEY = 'expiry-tracker-token';

function headers(json = false) {
  const h = new Headers();
  if (typeof window !== 'undefined') {
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    if (token) h.set('Authorization', `Bearer ${token}`);
  }
  if (json) h.set('Content-Type', 'application/json');
  return h;
}

function currentRole(): Role | null {
  try {
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role ?? null;
  } catch { return null; }
}

function RoleBadge({ role }: { role: Role }) {
  const styles: Record<Role, { background: string; color: string }> = {
    SUPERUSER: { background: '#eee9ff', color: '#6c42c1' },
    EDITOR: { background: '#e8f1ff', color: '#3466c2' },
    VIEWER: { background: '#edf1f5', color: '#64748b' },
  };
  return <span style={{ display: 'inline-flex', padding: '5px 9px', borderRadius: 999, fontSize: 11, fontWeight: 800, ...styles[role] }}>{role}</span>;
}

const card = { background: '#fff', border: '1px solid #e8ecf2', borderRadius: 18, boxShadow: '0 12px 30px rgba(25,40,70,.05)' } as const;
const input = { width: '100%', boxSizing: 'border-box' as const, border: '1px solid #dce2ea', borderRadius: 10, padding: '11px 12px', fontSize: 14, color: '#202b42', outline: 'none' };
const label = { display: 'grid', gap: 7, fontSize: 12, fontWeight: 800, color: '#526078' } as const;
const primary = { border: 0, borderRadius: 10, padding: '11px 16px', background: '#4c6fff', color: '#fff', fontWeight: 800, cursor: 'pointer' } as const;
const secondary = { border: '1px solid #dce2ea', borderRadius: 10, padding: '10px 14px', background: '#fff', color: '#526078', fontWeight: 700, cursor: 'pointer' } as const;

export default function EmployeesPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('VIEWER');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [managerId, setManagerId] = useState('');

  useEffect(() => { setAuthorized(currentRole() === 'SUPERUSER'); }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      const response = await fetch(`${API_URL}/employees`, { headers: headers(), cache: 'no-store' });
      if (response.status === 401 || response.status === 403) { setAuthorized(false); return; }
      if (!response.ok) throw new Error('Unable to load employees');
      const data = await response.json();
      setEmployees(data.items ?? data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load employees'); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (authorized) void load(); }, [authorized]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((employee) => [employee.name, employee.email, employee.employeeNumber, employee.department, employee.position].some((value) => value?.toLowerCase().includes(q)));
  }, [employees, search]);

  function reset() {
    setEditing(null); setName(''); setEmail(''); setPassword(''); setRole('VIEWER'); setEmployeeNumber(''); setDepartment(''); setPosition(''); setManagerId(''); setFormError(''); setOpen(false);
  }

  function edit(employee: Employee) {
    setEditing(employee); setName(employee.name); setEmail(employee.email); setPassword(''); setRole(employee.role); setEmployeeNumber(employee.employeeNumber ?? ''); setDepartment(employee.department ?? ''); setPosition(employee.position ?? ''); setManagerId(employee.managerId ?? ''); setFormError(''); setOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setFormError('');
    if (!name.trim()) return setFormError('Name is required.');
    if (!editing && !email.trim()) return setFormError('Email is required.');
    if (!editing && password.length < 8) return setFormError('Password must be at least 8 characters.');
    if (editing && password && password.length < 8) return setFormError('Password must be at least 8 characters.');
    setSaving(true);
    try {
      const body = editing
        ? { name: name.trim(), role, ...(password ? { password } : {}), employeeNumber: employeeNumber.trim() || null, department: department.trim() || null, position: position.trim() || null, managerId: managerId || null }
        : { name: name.trim(), email: email.trim(), password, role, employeeNumber: employeeNumber.trim() || undefined, department: department.trim() || undefined, position: position.trim() || undefined, managerId: managerId || undefined };
      const response = await fetch(editing ? `${API_URL}/employees/${editing.id}` : `${API_URL}/employees`, { method: editing ? 'PATCH' : 'POST', headers: headers(true), body: JSON.stringify(body) });
      if (response.status === 401 || response.status === 403) { setAuthorized(false); return; }
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message ?? 'Unable to save employee';
        throw new Error(message);
      }
      reset(); await load();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Unable to save employee'); }
    finally { setSaving(false); }
  }

  async function deactivate(employee: Employee) {
    if (!confirm(`Deactivate ${employee.name}?`)) return;
    setError('');
    try {
      const response = await fetch(`${API_URL}/employees/${employee.id}/deactivate`, { method: 'PATCH', headers: headers(true) });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? 'Unable to deactivate employee');
      }
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to deactivate employee'); }
  }

  if (authorized === null) return null;

  return <main style={{ minHeight: '100vh', background: '#f6f8fc', padding: '32px' }}>
    <div style={{ maxWidth: 1320, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, marginBottom: 26 }}>
        <div><div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#70809b' }}>Administration</div><h1 style={{ margin: '7px 0', fontSize: 32, color: '#17213a' }}>Employee Management</h1><p style={{ margin: 0, color: '#718096' }}>Manage the employee identity used across Contract & Document and Office Automation.</p></div>
        {authorized && <button style={primary} onClick={() => { reset(); setOpen(true); }}>+ Add employee</button>}
      </header>

      {!authorized ? <div role="alert" style={{ ...card, padding: 24, borderColor: '#efb7b7', color: '#a33a3a', background: '#fffafa' }}>You do not have permission to manage employees.</div> : <>
        {error && <div role="alert" style={{ marginBottom: 16, padding: 14, borderRadius: 12, background: '#fff4f3', border: '1px solid #f1c4c0', color: '#a33a3a' }}>{error}</div>}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 14, marginBottom: 18 }}>
          {[
            ['Total employees', employees.length],
            ['Active', employees.filter((e) => e.isActive).length],
            ['Inactive', employees.filter((e) => !e.isActive).length],
            ['Departments', new Set(employees.map((e) => e.department).filter(Boolean)).size],
          ].map(([title, value]) => <div key={String(title)} style={{ ...card, padding: 18 }}><div style={{ color: '#7b8799', fontSize: 12, fontWeight: 800 }}>{title}</div><div style={{ color: '#17213a', fontSize: 27, fontWeight: 850, marginTop: 5 }}>{value}</div></div>)}
        </section>

        <section style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: '1px solid #edf0f5', display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center' }}>
            <div><div style={{ fontWeight: 850, color: '#202b42' }}>Employees</div><div style={{ color: '#8a96a8', fontSize: 12, marginTop: 3 }}>{filtered.length} employee{filtered.length === 1 ? '' : 's'} shown</div></div>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, employee number…" style={{ ...input, maxWidth: 360 }} />
          </div>
          {loading ? <div style={{ padding: 40, color: '#718096' }}>Loading employees…</div> : filtered.length === 0 ? <div style={{ padding: 50, textAlign: 'center', color: '#718096' }}>No employees found.</div> : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Employee', 'Employee No.', 'Organization', 'Role', 'Manager', 'Status', ''].map((heading) => <th key={heading} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em', color: '#7b8799', background: '#fbfcfe', borderBottom: '1px solid #edf0f5' }}>{heading}</th>)}</tr></thead><tbody>{filtered.map((employee) => <tr key={employee.id}><td style={{ padding: '15px 16px', borderBottom: '1px solid #f0f2f6' }}><div style={{ fontWeight: 800, color: '#202b42' }}>{employee.name}</div><div style={{ fontSize: 12, color: '#7b8799', marginTop: 3 }}>{employee.email}</div></td><td style={{ padding: '15px 16px', borderBottom: '1px solid #f0f2f6', color: '#526078', fontSize: 13 }}>{employee.employeeNumber ?? '—'}</td><td style={{ padding: '15px 16px', borderBottom: '1px solid #f0f2f6' }}><div style={{ fontWeight: 700, color: '#526078', fontSize: 13 }}>{employee.position ?? '—'}</div><div style={{ fontSize: 12, color: '#8a96a8', marginTop: 3 }}>{employee.department ?? 'No department'}</div></td><td style={{ padding: '15px 16px', borderBottom: '1px solid #f0f2f6' }}><RoleBadge role={employee.role} /></td><td style={{ padding: '15px 16px', borderBottom: '1px solid #f0f2f6', color: '#526078', fontSize: 13 }}>{employee.manager?.name ?? '—'}</td><td style={{ padding: '15px 16px', borderBottom: '1px solid #f0f2f6' }}><span style={{ fontSize: 12, fontWeight: 800, color: employee.isActive ? '#16845b' : '#9aa4b2' }}>{employee.isActive ? 'Active' : 'Inactive'}</span></td><td style={{ padding: '15px 16px', borderBottom: '1px solid #f0f2f6', whiteSpace: 'nowrap' }}><button style={{ ...secondary, padding: '7px 10px', marginRight: 6 }} onClick={() => edit(employee)}>Edit</button>{employee.isActive && <button style={{ ...secondary, padding: '7px 10px', color: '#b42318' }} onClick={() => deactivate(employee)}>Deactivate</button>}</td></tr>)}</tbody></table></div>}
        </section>

        {open && <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,23,42,.42)', display: 'grid', placeItems: 'center', padding: 20 }}><form noValidate onSubmit={save} style={{ width: 'min(680px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 20, boxShadow: '0 30px 80px rgba(15,23,42,.25)', padding: 26 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}><div><h2 style={{ margin: 0, color: '#17213a' }}>{editing ? 'Edit employee' : 'Add employee'}</h2><p style={{ margin: '6px 0 0', color: '#718096', fontSize: 13 }}>{editing ? 'Update the shared employee identity.' : 'Create the employee account first; the same identity is used by User Management.'}</p></div><button type="button" onClick={reset} style={{ border: 0, background: 'transparent', fontSize: 28, color: '#7b8799', cursor: 'pointer' }}>×</button></div>
          {formError && <div role="alert" style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: '#fff4f3', border: '1px solid #f1c4c0', color: '#a33a3a', fontSize: 13 }}>{formError}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
            <label style={label}>Name<input value={name} onChange={(e) => { setName(e.target.value); setFormError(''); }} style={input} /></label>
            <label style={label}>Email<input value={email} disabled={Boolean(editing)} onChange={(e) => { setEmail(e.target.value); setFormError(''); }} type="email" style={{ ...input, ...(editing ? { background: '#f3f5f8', color: '#69758a' } : {}) }} /></label>
            <label style={label}>Password<input value={password} onChange={(e) => { setPassword(e.target.value); setFormError(''); }} type="password" placeholder={editing ? 'Leave blank to keep current password' : 'Minimum 8 characters'} style={input} /></label>
            <label style={label}>Role<select value={role} onChange={(e) => setRole(e.target.value as Role)} style={{ ...input, background: '#fff' }}><option value="VIEWER">Viewer</option><option value="EDITOR">Editor</option><option value="SUPERUSER">Superuser</option></select></label>
            <label style={label}>Employee number<input value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} style={input} /></label>
            <label style={label}>Department<input value={department} onChange={(e) => setDepartment(e.target.value)} style={input} /></label>
            <label style={label}>Position<input value={position} onChange={(e) => setPosition(e.target.value)} style={input} /></label>
            <label style={label}>Manager<select value={managerId} onChange={(e) => setManagerId(e.target.value)} style={{ ...input, background: '#fff' }}><option value="">No manager</option>{employees.filter((employee) => employee.id !== editing?.id && employee.isActive).map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.employeeNumber ?? employee.email}</option>)}</select></label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}><button type="button" onClick={reset} style={secondary}>Cancel</button><button disabled={saving} type="submit" style={{ ...primary, opacity: saving ? .65 : 1 }}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create employee'}</button></div>
        </form></div>}
      </>}
    </div>
  </main>;
}
