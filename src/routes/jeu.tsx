import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/jeu')({
  component: JeuPage,
});

function JeuPage() {
  const googleReviewUrl = 'https://g.page/r/CczrmSXmCqF0EBM/review';
  const [clicked, setClicked] = useState(false);

  const handlePlay = () => {
    setClicked(true);
    window.open(googleReviewUrl, '_blank');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '64px', marginBottom: '8px' }}>🥪</div>
          <h1 style={{ fontSize: '14px', fontWeight: '700', color: '#f97316', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '2px' }}>Jeu exclusif Crazy Toasty</h1>
          <h2 style={{ fontSize: '32px', fontWeight: '900', color: 'white', margin: '0 0 8px' }}>TOURNE LA ROUE !</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Tente ta chance et gagne des réductions, articles gratuits ou points fidélité !</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '28px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎁</div>
          <h3 style={{ color: 'white', fontWeight: '800', fontSize: '20px', margin: '0 0 8px' }}>Gagne un cadeau !</h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 20px' }}>Clique sur le bouton ci-dessous pour débloquer ta partie gratuite ! 🔥</p>

          {!clicked ? (
            <button onClick={handlePlay}
              style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #f97316, #ea580c)', border: 'none', borderRadius: '14px', color: 'white', fontWeight: '800', fontSize: '18px', cursor: 'pointer', boxShadow: '0 8px 24px rgba(249,115,22,0.4)' }}>
              ⭐ Laisser un avis et jouer !
            </button>
          ) : (
            <div>
              <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <p style={{ color: '#22c55e', fontWeight: '700', margin: '0 0 4px' }}>✅ La page Google s'est ouverte !</p>
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Laisse ton avis pour débloquer ta roue !</p>
              </div>
              <button onClick={handlePlay}
                style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: 'white', fontWeight: '600', fontSize: '15px', cursor: 'pointer', marginBottom: '8px' }}>
                J'ai laissé mon avis, je veux jouer !
              </button>
            </div>
          )}
        </div>

        <p style={{ color: '#475569', fontSize: '12px', margin: 0 }}>1 partie gratuite par avis Google</p>
      </div>
    </div>
  );
}
