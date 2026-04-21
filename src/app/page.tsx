export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 24, lineHeight: 1.4 }}>
      <h1 style={{ margin: 0 }}>Ziarah Flight Search Service</h1>
      <p style={{ marginTop: 12 }}>
        Use <code>/api/search</code> for orchestration.
      </p>
      <p style={{ marginTop: 12 }}>
        Health: <code>/api/health</code>
      </p>
    </main>
  );
}

