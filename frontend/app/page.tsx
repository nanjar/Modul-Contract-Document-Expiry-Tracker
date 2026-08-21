const metrics = [
  ['Total Documents', '0'],
  ['Active', '0'],
  ['Expiring Soon', '0'],
  ['Expired', '0'],
];

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', padding: '48px clamp(20px, 5vw, 72px)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-end', marginBottom: 40 }}>
          <div>
            <div style={{ color: 'var(--accent)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 12 }}>Expiry Tracker</div>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', margin: '10px 0 8px', letterSpacing: '-.03em' }}>Good evening.</h1>
            <p style={{ margin: 0, color: 'var(--muted)' }}>Keep every important document ahead of its expiry date.</p>
          </div>
          <button style={{ border: 0, borderRadius: 10, padding: '12px 18px', background: 'var(--text)', color: 'white', fontWeight: 650, cursor: 'pointer' }}>+ Add Document</button>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
          {metrics.map(([label, value]) => (
            <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>{label}</div>
              <div style={{ fontSize: 30, fontWeight: 700, marginTop: 8 }}>{value}</div>
            </div>
          ))}
        </section>

        <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
          <h2 style={{ margin: 0, fontSize: 19 }}>Documents requiring attention</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 0 }}>No documents yet. Add your first document to start tracking expiry dates.</p>
        </section>
      </div>
    </main>
  );
}
