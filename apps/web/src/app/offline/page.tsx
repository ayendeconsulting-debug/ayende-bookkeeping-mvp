export default function OfflinePage() {
  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: '#f5f3ef',
      color: '#1a1814',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '24px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '40px 32px',
        maxWidth: '360px',
        width: '100%',
        textAlign: 'center',
        border: '1px solid #e5e1d8',
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          background: '#0F6E56',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <rect x="1" y="18" width="5" height="10" rx="1.5" fill="white" opacity={0.5}/>
            <rect x="12" y="12" width="5" height="16" rx="1.5" fill="white" opacity={0.75}/>
            <rect x="23" y="4" width="5" height="24" rx="1.5" fill="white"/>
          </svg>
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
          You&apos;re offline
        </h1>
        <p style={{ fontSize: '14px', color: '#888070', lineHeight: 1.6, marginBottom: '24px' }}>
          Tempo Books requires an internet connection to sync your transactions and reports.
          Please check your connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#0F6E56',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
