import Link from 'next/link'

export default function DataRequired({ moduleName, missingFiles }) {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 24px' }}>{moduleName}</h1>

      <div style={{ maxWidth: 620, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
          Data Required to Power This Module
        </h2>
        <p style={{ fontSize: 14, color: '#737373', margin: '0 0 32px', lineHeight: 1.6 }}>
          The following report{missingFiles.length > 1 ? 's are' : ' is'} missing from your uploaded data.
          Upload {missingFiles.length > 1 ? 'them' : 'it'} to unlock this module.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left', marginBottom: 32 }}>
          {missingFiles.map(file => (
            <div key={file.id} style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>📋</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#000' }}>{file.label}</div>
                  <div style={{ fontSize: 11, color: '#737373', marginTop: 2 }}>{file.frequency}</div>
                </div>
              </div>

              <p style={{ margin: '0 0 14px', fontSize: 13, color: '#525252', lineHeight: 1.6 }}>
                {file.description}
              </p>

              {file.note && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#B45309', marginBottom: 14 }}>
                  ⚠ {file.note}
                </div>
              )}

              <div style={{ background: '#F5F5F5', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#737373', marginBottom: 8 }}>
                  How to download from Seller Central
                </div>
                <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {file.howToDownload.map((step, i) => (
                    <li key={i} style={{ fontSize: 13, color: '#000', lineHeight: 1.6 }}>{step}</li>
                  ))}
                </ol>
              </div>

              {file.powers && (
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#737373' }}>Also powers:</span>
                  {file.powers.map(p => (
                    <span key={p} style={{ fontSize: 11, background: '#F5F5F5', border: '1px solid #E5E5E5', borderRadius: 4, padding: '2px 8px', color: '#525252' }}>{p}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <Link href="/settings/data" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 24px', background: '#000', color: '#FFF',
          borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none',
        }}>
          Go to Data Management →
        </Link>
      </div>
    </div>
  )
}
