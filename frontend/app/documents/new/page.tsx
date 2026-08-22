'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

type User = {
  id: string;
  name: string;
  email: string;
};

const labelStyle = {
  display: 'grid',
  gap: 7,
  fontSize: 12,
  fontWeight: 800,
  color: '#526078',
} as const;

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  padding: '12px 13px',
  border: '1px solid #dfe5ee',
  borderRadius: 10,
  background: '#fff',
  color: '#17213a',
} as const;

function getHeaders(): Headers {
  const headers = new Headers();

  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('expiry-tracker-token');

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return headers;
}

export default function NewDocumentPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [documentType, setDocumentType] = useState('CONTRACT');
  const [counterparty, setCounterparty] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch(
          `${API_URL}/users?limit=100`,
          {
            headers: getHeaders(),
          },
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setUsers(data?.items ?? data ?? []);
      } catch {
        // Owner selection is optional; keep the form usable when users cannot load.
      }
    }

    void loadUsers();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const createResponse = await fetch(
        `${API_URL}/documents`,
        {
          method: 'POST',
          headers: (() => {
            const headers = getHeaders();
            headers.set('Content-Type', 'application/json');
            return headers;
          })(),
          body: JSON.stringify({
            title,
            documentNumber: documentNumber || undefined,
            documentType,
            counterparty: counterparty || undefined,
            description: description || undefined,
            ownerId: ownerId || undefined,
            issueDate: issueDate || null,
            effectiveDate: effectiveDate || null,
            expiryDate: expiryDate || null,
            reminderEnabled,
          }),
        },
      );

      const document = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(
          Array.isArray(document.message)
            ? document.message.join(', ')
            : document.message ?? 'Unable to create document',
        );
      }

      if (file) {
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch(
          `${API_URL}/documents/${document.id}/file`,
          {
            method: 'POST',
            headers: getHeaders(),
            body: formData,
          },
        );

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse
            .json()
            .catch(() => null);

          throw new Error(
            uploadError?.message ??
              'Document saved, but file upload failed',
          );
        }
      }

      router.push(`/documents/${document.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create document',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f6f8fc',
        padding: '32px',
        fontFamily: 'Inter,system-ui',
      }}
    >
      <div
        style={{
          maxWidth: 920,
          margin: '0 auto',
        }}
      >
        <Link
          href="/documents"
          style={{
            fontSize: 12,
            color: '#64748b',
          }}
        >
          ← Documents
        </Link>

        <div
          style={{
            margin: '20px 0 26px',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '.12em',
              textTransform: 'uppercase',
              color: '#70809b',
            }}
          >
            Document workspace
          </div>

          <h1
            style={{
              margin: '7px 0',
              fontSize: 34,
              color: '#17213a',
            }}
          >
            Add document
          </h1>

          <p
            style={{
              margin: 0,
              color: '#718096',
            }}
          >
            Register the metadata and optional source file.
            Reminder defaults are created automatically when an
            expiry date is supplied.
          </p>
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

        <form
          onSubmit={submit}
          style={{
            background: '#fff',
            border: '1px solid #e8ecf2',
            borderRadius: 20,
            padding: 28,
            boxShadow: '0 12px 30px rgba(25,40,70,.05)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: 16,
            }}
          >
            <Field
              text="Title"
              value={title}
              onChange={setTitle}
              required
            />

            <Field
              text="Document number"
              value={documentNumber}
              onChange={setDocumentNumber}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginTop: 16,
            }}
          >
            <label style={labelStyle}>
              Document type
              <select
                value={documentType}
                onChange={(event) =>
                  setDocumentType(event.target.value)
                }
                style={inputStyle}
              >
                <option>CONTRACT</option>
                <option>LICENSE</option>
                <option>CERTIFICATE</option>
                <option>PERMIT</option>
                <option>INSURANCE</option>
                <option>OTHER</option>
              </select>
            </label>

            <label style={labelStyle}>
              Owner
              <select
                value={ownerId}
                onChange={(event) =>
                  setOwnerId(event.target.value)
                }
                style={inputStyle}
              >
                <option value="">Created by me</option>

                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} · {user.email}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 16,
              marginTop: 16,
            }}
          >
            <Field
              text="Issue date"
              type="date"
              value={issueDate}
              onChange={setIssueDate}
            />

            <Field
              text="Effective date"
              type="date"
              value={effectiveDate}
              onChange={setEffectiveDate}
            />

            <Field
              text="Expiry date"
              type="date"
              value={expiryDate}
              onChange={setExpiryDate}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <Field
              text="Counterparty"
              value={counterparty}
              onChange={setCounterparty}
            />
          </div>

          <label
            style={{
              ...labelStyle,
              marginTop: 16,
            }}
          >
            Description
            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={4}
              style={{
                ...inputStyle,
                height: 'auto',
                padding: '12px 13px',
                resize: 'vertical',
              }}
            />
          </label>

          <label
            style={{
              ...labelStyle,
              marginTop: 16,
            }}
          >
            File
            <input
              type="file"
              onChange={(event) =>
                setFile(event.target.files?.[0] ?? null)
              }
              style={{
                ...inputStyle,
                padding: '10px 12px',
              }}
            />

            <span
              style={{
                fontSize: 11,
                color: '#8792a4',
                fontWeight: 500,
              }}
            >
              PDF, Office documents, CSV/TXT, JPG/PNG · maximum 20 MB.
            </span>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 18,
              fontSize: 13,
              color: '#526078',
              fontWeight: 700,
            }}
          >
            <input
              type="checkbox"
              checked={reminderEnabled}
              onChange={(event) =>
                setReminderEnabled(event.target.checked)
              }
            />
            Enable expiry reminders
          </label>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 28,
            }}
          >
            <Link
              href="/documents"
              style={{
                padding: '11px 17px',
                border: '1px solid #dfe5ee',
                borderRadius: 10,
                fontWeight: 800,
                color: '#526078',
              }}
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '11px 20px',
                border: 0,
                borderRadius: 10,
                background: '#273657',
                color: '#fff',
                fontWeight: 800,
              }}
            >
              {saving ? 'Saving…' : 'Create document'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

type FieldProps = {
  text: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
};

function Field({
  text,
  value,
  onChange,
  type = 'text',
  required = false,
}: FieldProps) {
  return (
    <label style={labelStyle}>
      {text}
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle}
      />
    </label>
  );
}
