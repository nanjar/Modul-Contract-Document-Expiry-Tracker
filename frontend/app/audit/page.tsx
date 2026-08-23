'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001/api/v1';

function getHeaders(): Headers {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem(
      'expiry-tracker-token',
    );

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return headers;
}

type DocumentForm = {
  title: string;
  documentNumber: string;
  documentType: string;
  counterparty: string;
  description: string;
  issueDate: string;
  effectiveDate: string;
  expiryDate: string;
  reminderEnabled: boolean;
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

const DOCUMENT_TYPES = [
  'CONTRACT',
  'LICENSE',
  'CERTIFICATE',
  'INSURANCE',
  'PERMIT',
  'OTHER',
];

export default function EditDocumentPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const router = useRouter();

  const [form, setForm] = useState<DocumentForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      return;
    }

    async function loadDocument() {
      try {
        const response = await fetch(
          `${API}/documents/${id}`,
          {
            headers: getHeaders(),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            Array.isArray(data.message)
              ? data.message.join(', ')
              : data.message ??
                  'Unable to load document',
          );
        }

        setForm({
          title: data.title ?? '',
          documentNumber:
            data.documentNumber ?? '',
          documentType:
            data.documentType ?? 'OTHER',
          counterparty:
            data.counterparty ?? '',
          description:
            data.description ?? '',
          issueDate:
            data.issueDate?.slice(0, 10) ?? '',
          effectiveDate:
            data.effectiveDate?.slice(0, 10) ?? '',
          expiryDate:
            data.expiryDate?.slice(0, 10) ?? '',
          reminderEnabled:
            data.reminderEnabled ?? true,
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load document',
        );
      }
    }

    void loadDocument();
  }, [id]);

  function updateForm(
    changes: Partial<DocumentForm>,
  ) {
    setForm((current) =>
      current
        ? {
            ...current,
            ...changes,
          }
        : current,
    );
  }

  async function save(event: FormEvent) {
    event.preventDefault();

    if (!form || !id) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch(
        `${API}/documents/${id}`,
        {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({
            ...form,
            documentNumber:
              form.documentNumber || null,
            counterparty:
              form.counterparty || null,
            description:
              form.description || null,
            issueDate:
              form.issueDate || null,
            effectiveDate:
              form.effectiveDate || null,
            expiryDate:
              form.expiryDate || null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(', ')
            : data.message ??
                'Unable to save document',
        );
      }

      router.push(`/documents/${id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save document',
      );
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return (
      <main
        style={{
          padding: 40,
          fontFamily: 'Inter, system-ui',
        }}
      >
        {error ? (
          <div style={{ color: '#b91c1c' }}>
            {error}
          </div>
        ) : (
          'Loading document…'
        )}
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f6f8fc',
        padding: '32px',
        fontFamily: 'Inter, system-ui',
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
        }}
      >
        <Link
          href={`/documents/${id}`}
          style={{
            fontSize: 12,
            color: '#64748b',
          }}
        >
          ← Document detail
        </Link>

        <div
          style={{
            margin: '20px 0 25px',
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: '.12em',
              fontWeight: 800,
              color: '#70809b',
            }}
          >
            DOCUMENT WORKSPACE
          </div>

          <h1
            style={{
              margin: '7px 0',
              fontSize: 34,
              color: '#17213a',
            }}
          >
            Edit document
          </h1>

          <p
            style={{
              margin: 0,
              color: '#718096',
            }}
          >
            Update metadata and expiry protection
            without changing the document record
            identity.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: 13,
              borderRadius: 10,
              background: '#fff0f0',
              color: '#b42318',
              marginBottom: 15,
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={save}
          style={{
            background: '#fff',
            border: '1px solid #e8ecf2',
            borderRadius: 20,
            padding: 28,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: 15,
            }}
          >
            <Field
              text="Title"
              value={form.title}
              onChange={(value) =>
                updateForm({ title: value })
              }
              required
            />

            <Field
              text="Document number"
              value={form.documentNumber}
              onChange={(value) =>
                updateForm({
                  documentNumber: value,
                })
              }
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 15,
              marginTop: 15,
            }}
          >
            <label style={labelStyle}>
              Document type

              <select
                value={form.documentType}
                onChange={(event) =>
                  updateForm({
                    documentType:
                      event.target.value,
                  })
                }
                style={inputStyle}
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <Field
              text="Counterparty"
              value={form.counterparty}
              onChange={(value) =>
                updateForm({
                  counterparty: value,
                })
              }
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                '1fr 1fr 1fr',
              gap: 15,
              marginTop: 15,
            }}
          >
            <Field
              text="Issue date"
              type="date"
              value={form.issueDate}
              onChange={(value) =>
                updateForm({
                  issueDate: value,
                })
              }
            />

            <Field
              text="Effective date"
              type="date"
              value={form.effectiveDate}
              onChange={(value) =>
                updateForm({
                  effectiveDate: value,
                })
              }
            />

            <Field
              text="Expiry date"
              type="date"
              value={form.expiryDate}
              onChange={(value) =>
                updateForm({
                  expiryDate: value,
                })
              }
            />
          </div>

          <label
            style={{
              ...labelStyle,
              marginTop: 15,
            }}
          >
            Description

            <textarea
              rows={5}
              value={form.description}
              onChange={(event) =>
                updateForm({
                  description:
                    event.target.value,
                })
              }
              style={{
                ...inputStyle,
                height: 'auto',
                padding: '11px 12px',
              }}
            />
          </label>

          <label
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              marginTop: 17,
              fontSize: 13,
              fontWeight: 700,
              color: '#526078',
            }}
          >
            <input
              type="checkbox"
              checked={form.reminderEnabled}
              onChange={(event) =>
                updateForm({
                  reminderEnabled:
                    event.target.checked,
                })
              }
            />

            Enable expiry reminders
          </label>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 9,
              marginTop: 25,
            }}
          >
            <Link
              href={`/documents/${id}`}
              style={{
                padding: '11px 16px',
                border:
                  '1px solid #dfe5ee',
                borderRadius: 10,
                color: '#526078',
                fontWeight: 800,
              }}
            >
              Cancel
            </Link>

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
                : 'Save changes'}
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
        onChange={(event) =>
          onChange(event.target.value)
        }
        style={inputStyle}
      />
    </label>
  );
}