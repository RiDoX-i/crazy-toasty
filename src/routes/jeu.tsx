import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/jeu')({
  component: JeuPage,
});

function JeuPage() {
  const googleReviewUrl = 'https://g.page/r/CczrmSXmCqF0EBM/review';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fff7ed, #fffbeb)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🥪</div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: '0 0 4px' }}>Crazy Toasty</h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Merci de votre visite !</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <a href={googleReviewUrl} target="_blank" rel="noopener noreferrer"
            style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '2px solid #e2e8f0', textDecoration: 'none', display: 'block', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>⭐</div>
            <p style={{ margin: '0 0 4px', fontWeight: '800', color: '#1e293b', fontSize: '18px' }}>Laisser un avis</p>
            <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Votre avis compte beaucoup pour nous !</p>
            <div style={{ marginTop: '12px', padding: '8px 20px', background: '#4285f4', borderRadius: '10px', color: 'white', fontWeight: '700', fontSize: '14px', display: 'inline-block' }}>
              Avis Google →
            </div>
          </a>
          <a href="/jeu/play"
            style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '2px solid #e2e8f0', textDecoration: 'none', display: 'block', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎮</div>
            <p style={{ margin: '0 0 4px', fontWeight: '800', color: '#1e293b', fontSize: '18px' }}>Jouer au jeu</p>
            <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Tentez votre chance et gagnez !</p>
            <div style={{ marginTop: '12px', padding: '8px 20px', background: 'linear-gradient(135deg, #f97316, #ea580c)', borderRadius: '10px', color: 'white', fontWeight: '700', fontSize: '14px', display: 'inline-block' }}>
              Jouer →
            </div>
          </a>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '24px' }}>© 2026 Crazy Toasty</p>
      </div>
    </div>
  );
}
