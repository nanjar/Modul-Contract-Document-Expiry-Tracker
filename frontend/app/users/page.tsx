'use client';

import { FormEvent, useEffect, useState } from 'react';

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
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001/api/v1';

function getHeaders(): Headers {
  const headers = new Headers();

  if (typeof window !== 'undefined') {
    const token = window.sessionStorage.getItem(
      'expiry-tracker-token',
    );

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return headers;
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '5px 9px',
        borderRadius: 999,
        background:
          role === 'SUPERUSER'
            ? '#eee9ff'
            : role === 'EDITOR'
              ? '#e8f1ff'
              : '#edf1f5',
        color:
          role === 'SUPERUSER'
            ? '#6c42c1'
            : role === 'EDITOR'
              ? '#3466c2'
              : '#64748b',
        fontSize: 11,
        fontWeight: 800,
      }}
    >
      {role}
    </span>
  );
}

export default function UsersPage() {
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

  async function load() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_URL}/users`,
        { headers: getHeaders() },
      );

      if (!response.ok) {
        throw new Error('Unable to load users');
      }

      const data = await response.json();
      setUsers(data.items ?? data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load users',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function reset() {
    setEditing(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('VIEWER');
    setFormError('');
    setOpen(false);
  }

  function edit(user: User) {
    setEditing(user);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setRole(user.role);
    setFormError('');
    setOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      const body: {
        name: string;
        email: string;
        role: Role;
        password?: string;
      } = {
        name,
        email,
        role,
      };

      if (password) {
        body.password = password;
      }

      const requestBody = editing
        ? body
        : {
            ...body,
            password,
          };

      const response = await fetch(
        editing
          ? `${API_URL}/users/${editing.id}`
          : `${API_URL}/users`,
        {
          method: editing ? 'PATCH' : 'POST',
          headers: (() => {
            const headers = getHeaders();
            headers.set(
              'Content-Type',
              'application/json',
            );
            return headers;
          })(),
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        const payload = await response
          .json()
          .catch(() => null);

        throw new Error(
          Array.isArray(payload?.message)
            ? payload.message.join(', ')
            : payload?.message ??
                'Unable to save user',
        );
      }

      reset();
      await load();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Unable to save user',
      );
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(user: User) {
    if (!confirm(`Deactivate ${user.email}?`)) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/users/${user.id}`,
        {
          method: 'DELETE',
          headers: getHeaders(),
        },
      );

      if (!response.ok) {
        const payload = await response
          .json()
          .catch(() => null);

        throw new Error(
          payload?.message ??
            'Unable to deactivate user',
        );
      }

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to deactivate user',
      );
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f6f8fc',
        padding: '32px',
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 20,
            marginBottom: 28,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                color: '#70809b',
              }}
            >
              Administration
            </div>

            <h1
              style={{
                margin: '7px 0',
                fontSize: 32,
                color: '#17213a',
              }}
            >
              Users & access
            </h1>

            <p
              style={{
                margin: 0,
                color: '#718096',
              }}
            >
              Manage users, roles and account status from one
              secure workspace.
            </p>
          </div>

          <button
            onClick={() => {
              reset();
              setOpen(true);
            }}
            style={{
              border: 0,
              borderRadius: 12,
              padding: '12px 18px',
              background: '#273657',
              color: '#fff',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            + Add user
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: '#fff0f0',
              color: '#b42318',
              marginBottom: 18,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            background: '#fff',
            border: '1px solid #e8ecf2',
            borderRadius: 18,
            overflow: 'hidden',
            boxShadow:
              '0 12px 30px rgba(25,40,70,.05)',
          }}
        >
          {loading ? (
            <div
              style={{
                padding: 40,
                color: '#718096',
              }}
            >
              Loading users…
            </div>
          ) : users.length === 0 ? (
            <div
              style={{
                padding: 50,
                textAlign: 'center',
                color: '#718096',
              }}
            >
              No users found.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                }}
              >
                <thead>
                  <tr>
                    {[
                      'User',
                      'Role',
                      'Status',
                      'Created',
                      '',
                    ].map((heading, index) => (
                      <th
                        key={index}
                        style={{
                          textAlign: 'left',
                          padding: '15px 20px',
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: '.08em',
                          color: '#8a96a8',
                          borderBottom:
                            '1px solid #edf0f5',
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td
                        style={{
                          padding: '17px 20px',
                          borderBottom:
                            '1px solid #f0f2f6',
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 800,
                            color: '#202b42',
                          }}
                        >
                          {user.name}
                        </div>

                        <div
                          style={{
                            fontSize: 13,
                            color: '#7b8799',
                            marginTop: 3,
                          }}
                        >
                          {user.email}
                        </div>
                      </td>

                      <td
                        style={{
                          padding: '17px 20px',
                          borderBottom:
                            '1px solid #f0f2f6',
                        }}
                      >
                        <RoleBadge role={user.role} />
                      </td>

                      <td
                        style={{
                          padding: '17px 20px',
                          borderBottom:
                            '1px solid #f0f2f6',
                        }}
                      >
                        <span
                          style={{
                            color: user.isActive
                              ? '#16845b'
                              : '#9aa4b2',
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          {user.isActive
                            ? 'Active'
                            : 'Inactive'}
                        </span>
                      </td>

                      <td
                        style={{
                          padding: '17px 20px',
                          borderBottom:
                            '1px solid #f0f2f6',
                          color: '#718096',
                          fontSize: 13,
                        }}
                      >
                        {new Date(
                          user.createdAt,
                        ).toLocaleDateString()}
                      </td>

                      <td
                        style={{
                          padding: '17px 20px',
                          borderBottom:
                            '1px solid #f0f2f6',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <button
                          onClick={() => edit(user)}
                          style={{
                            border: 0,
                            background: 'transparent',
                            color: '#4c6fff',
                            fontWeight: 800,
                            cursor: 'pointer',
                            marginRight: 14,
                          }}
                        >
                          Edit
                        </button>

                        {user.isActive && (
                          <button
                            onClick={() =>
                              deactivate(user)
                            }
                            style={{
                              border: 0,
                              background: 'transparent',
                              color: '#b42318',
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 18,
            display: 'grid',
            gridTemplateColumns:
              'repeat(3,1fr)',
            gap: 14,
          }}
        >
          {[
            [
              'SUPERUSER',
              'Full administration and access control',
            ],
            [
              'EDITOR',
              'Create and manage documents and reminders',
            ],
            [
              'VIEWER',
              'Read-only workspace access',
            ],
          ].map(([roleName, description]) => (
            <div
              key={roleName}
              style={{
                background: '#fff',
                border: '1px solid #e8ecf2',
                borderRadius: 14,
                padding: 17,
              }}
            >
              <RoleBadge
                role={roleName as Role}
              />

              <p
                style={{
                  fontSize: 13,
                  color: '#718096',
                  margin: '10px 0 0',
                }}
              >
                {description}
              </p>
            </div>
          ))}
        </div>

        {open && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,.42)',
              display: 'grid',
              placeItems: 'center',
              padding: 20,
              zIndex: 50,
            }}
          >
            <form
              onSubmit={save}
              style={{
                width: '100%',
                maxWidth: 500,
                background: '#fff',
                borderRadius: 20,
                padding: 28,
                boxShadow:
                  '0 25px 80px rgba(0,0,0,.2)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      color: '#17213a',
                    }}
                  >
                    {editing
                      ? 'Edit user'
                      : 'Add user'}
                  </h2>

                  <p
                    style={{
                      margin: '6px 0 22px',
                      color: '#718096',
                      fontSize: 13,
                    }}
                  >
                    {editing
                      ? 'Update identity and access role.'
                      : 'Create an account with the appropriate access level.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={reset}
                  style={{
                    border: 0,
                    background: 'transparent',
                    fontSize: 22,
                    color: '#8792a4',
                  }}
                >
                  ×
                </button>
              </div>

              {formError && (
                <div
                  role="alert"
                  style={{
                    padding: 12,
                    marginBottom: 18,
                    borderRadius: 10,
                    background: '#fff0f0',
                    border: '1px solid #ffd5d5',
                    color: '#b42318',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {formError}
                </div>
              )}

              <label style={fieldLabelStyle}>
                Name
                <input
                  required
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setFormError('');
                  }}
                  type="text"
                  style={fieldInputStyle}
                />
              </label>

              <label style={fieldLabelStyle}>
                Email
                <input
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setFormError('');
                  }}
                  type="email"
                  style={fieldInputStyle}
                />
              </label>

              <label style={fieldLabelStyle}>
                Password
                <input
                  required={!editing}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFormError('');
                  }}
                  type="password"
                  placeholder={
                    editing
                      ? 'Leave blank to keep current password'
                      : ''
                  }
                  style={fieldInputStyle}
                />
              </label>

              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#526078',
                }}
              >
                Role

                <select
                  value={role}
                  onChange={(event) => {
                    setRole(
                      event.target.value as Role,
                    );
                    setFormError('');
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: 7,
                    padding: '12px 13px',
                    border:
                      '1px solid #dfe5ee',
                    borderRadius: 10,
                    background: '#fff',
                  }}
                >
                  <option value="VIEWER">
                    Viewer
                  </option>
                  <option value="EDITOR">
                    Editor
                  </option>
                  <option value="SUPERUSER">
                    Superuser
                  </option>
                </select>
              </label>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  marginTop: 25,
                }}
              >
                <button
                  type="button"
                  onClick={reset}
                  style={{
                    padding: '11px 17px',
                    border:
                      '1px solid #dfe5ee',
                    borderRadius: 10,
                    background: '#fff',
                    fontWeight: 800,
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '11px 18px',
                    border: 0,
                    borderRadius: 10,
                    background: '#273657',
                    color: '#fff',
                    fontWeight: 800,
                  }}
                >
                  {saving
                    ? 'Saving…'
                    : 'Save user'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

const fieldLabelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 800,
  color: '#526078',
  marginBottom: 15,
} as const;

const fieldInputStyle = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box' as const,
  marginTop: 7,
  padding: '12px 13px',
  border: '1px solid #dfe5ee',
  borderRadius: 10,
} as const;
