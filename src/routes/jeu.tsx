import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://sejtefqrjzouatztwwue.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlanRlZnFyanpvdWF0enR3d3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1NzAzMTksImV4cCI6MjA2MTE0NjMxOX0.TQbWQ8FVBZ7PGOOxBkMDOojPFCMnAJnBnJsTsQxBBpw'
);

export const Route = createFileRoute('/jeu')({
  component: JeuPage,
});

const googleReviewUrl = 'https://g.page/r/CczrmSXmCqF0EBM/review';

const PRIZES = [
  { label: 'Menu Crazy Toasty', emoji: '🥪', win: true },
  { label: 'Coca-Cola offert', emoji: '🥤', win: true },
  { label: 'Frites offertes', emoji: '🍟', win: true },
  { label: 'Boisson offerte', emoji: '🧃', win: true },
  { label: 'Dessert offert', emoji: '🍰', win: true },
];

const CARD_EMOJIS = ['🥪', '🥤', '🍟', '🧃', '🍰', '🌭', '🧆', '🫔'];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function generateCards() {
  const wins = Math.random() < 0.40;
  if (wins) {
    const winEmoji = CARD_EMOJIS[Math.floor(Math.random() * 4)];
    const others = CARD_EMOJIS.filter(e => e !== winEmoji).slice(0, 4);
    return shuffle([winEmoji, winEmoji, ...others]);
  } else {
    return shuffle(CARD_EMOJIS).slice(0, 6);
  }
}

function JeuPage() {
  const [step, setStep] = useState<'intro' | 'review' | 'game' | 'win' | 'lose' | 'prize'>('intro');
  const [cards, setCards] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [prize, setPrize] = useState<typeof PRIZES[0] | null>(null);
  const [reviewClicked, setReviewClicked] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (step === 'game') {
      setCards(generateCards());
      setFlipped([]);
      setMatched([]);
      setAttempts(0);
    }
  }, [step]);

  const handleCardClick = (i: number) => {
    if (flipped.includes(i) || matched.includes(i) || flipped.length >= 2) return;
    const newFlipped = [...flipped, i];
    setFlipped(newFlipped);
    setAttempts(a => a + 1);
    if (newFlipped.length === 2) {
      const [a, b] = newFlipped;
      if (cards[a] === cards[b]) {
        setMatched([a, b]);
        const winPrize = Math.random() < 0.1 ? PRIZES[0] : PRIZES[Math.floor(Math.random() * (PRIZES.length - 1)) + 1];
        setPrize(winPrize);
        setTimeout(async () => {
          await supabase.from('game_wins').insert({ prize: winPrize.label });
          setStep('win');
        }, 800);
      } else {
        setTimeout(() => {
          setFlipped([]);
          if (attempts >= 2) setTimeout(() => setStep('lose'), 300);
        }, 1000);
      }
    }
  };

  const handleReview = () => {
    setReviewClicked(true);
    window.open(googleReviewUrl, '_blank');
    // Redirection automatique vers le jeu après 5 secondes
    setTimeout(() => setStep('game'), 5000);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>

        {/* INTRO */}
        {step === 'intro' && (
          <div>
            <div style={{ fontSize: '60px', marginBottom: '8px' }}>🥪</div>
            <p style={{ color: '#f97316', fontSize: '12px', fontWeight: '700', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '2px' }}>Jeu exclusif</p>
            <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'white', margin: '0 0 8px' }}>CRAZY TOASTY</h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 24px' }}>Laisse-nous un avis Google et joue pour gagner un cadeau !</p>
            <div style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '16px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
              <p style={{ color: 'white', fontWeight: '700', margin: '0 0 8px', fontSize: '14px' }}>📋 Comment ça marche :</p>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 4px' }}>1️⃣ Laisse un avis Google ⭐</p>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 4px' }}>2️⃣ Joue au jeu de cartes 🃏</p>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>3️⃣ Gagne un cadeau 🎁</p>
            </div>
            <button onClick={() => setStep('review')}
              style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #f97316, #ea580c)', border: 'none', borderRadius: '14px', color: 'white', fontWeight: '800', fontSize: '18px', cursor: 'pointer', boxShadow: '0 6px 20px rgba(249,115,22,0.4)' }}>
              ⭐ Commencer !
            </button>
          </div>
        )}

        {/* AVIS GOOGLE - OBLIGATOIRE AVANT JEU */}
        {step === 'review' && (
          <div>
            <div style={{ fontSize: '60px', marginBottom: '12px' }}>⭐</div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'white', margin: '0 0 8px' }}>Étape 1/2</h2>
            <p style={{ color: '#fed7aa', fontSize: '16px', fontWeight: '700', margin: '0 0 20px' }}>Laisse ton avis Google pour débloquer le jeu !</p>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px' }}>Ton avis nous aide beaucoup et te donne accès au jeu 🎮</p>
              <button onClick={handleReview}
                style={{ width: '100%', padding: '14px', background: '#4285f4', border: 'none', borderRadius: '12px', color: 'white', fontWeight: '700', fontSize: '16px', cursor: 'pointer', marginBottom: '12px' }}>
                ⭐ Laisser un avis Google
              </button>
              {reviewClicked && (
                <button onClick={() => setStep('game')}
                  style={{ width: '100%', padding: '12px', background: 'rgba(34,197,94,0.2)', border: '1px solid #22c55e', borderRadius: '12px', color: '#22c55e', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                  ✅ Avis laissé — Jouer maintenant !
                </button>
              )}
            </div>
            {!reviewClicked && (
              <p style={{ color: '#475569', fontSize: '12px' }}>Tu dois laisser un avis pour accéder au jeu</p>
            )}
          </div>
        )}

        {/* JEU */}
        {step === 'game' && (
          <div>
            <h2 style={{ color: 'white', fontWeight: '800', fontSize: '20px', margin: '0 0 4px' }}>🃏 Étape 2/2 — Trouve la paire !</h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 20px' }}>Tentatives : {attempts}/3</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              {cards.map((emoji, i) => {
                const isFlipped = flipped.includes(i) || matched.includes(i);
                const isMatched = matched.includes(i);
                return (
                  <button key={i} onClick={() => handleCardClick(i)}
                    style={{ height: '90px', borderRadius: '14px', border: '2px solid', borderColor: isMatched ? '#22c55e' : isFlipped ? '#f97316' : 'rgba(255,255,255,0.1)', background: isMatched ? 'rgba(34,197,94,0.2)' : isFlipped ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)', fontSize: '36px', cursor: isFlipped ? 'default' : 'pointer', transition: 'all 0.3s' }}>
                    {isFlipped ? emoji : '❓'}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* GAGNÉ */}
        {step === 'win' && prize && (
          <div>
            <div style={{ fontSize: '72px', marginBottom: '12px' }}>{prize.emoji}</div>
            <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#22c55e', margin: '0 0 4px' }}>🎉 Tu as gagné !</h2>
            <p style={{ color: 'white', fontSize: '20px', fontWeight: '700', margin: '0 0 24px' }}>{prize.label}</p>
            <button onClick={() => setStep('prize')}
              style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #f97316, #ea580c)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}>
              🎁 Voir mon bon de récompense
            </button>
          </div>
        )}

        {/* PERDU */}
        {step === 'lose' && (
          <div>
            <div style={{ fontSize: '72px', marginBottom: '12px' }}>😢</div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'white', margin: '0 0 8px' }}>Pas de chance !</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 24px' }}>Tu n'as pas trouvé la paire. Réessaie !</p>
            <button onClick={() => setStep('game')}
              style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #f97316, #ea580c)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}>
              🔄 Réessayer
            </button>
          </div>
        )}

        {/* BON DE RÉCOMPENSE */}
        {step === 'prize' && prize && (
          <div>
            <div style={{ background: 'white', borderRadius: '20px', padding: '32px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
              <p style={{ color: '#f97316', fontSize: '11px', fontWeight: '700', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '2px' }}>Crazy Toasty</p>
              <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 16px' }}>Bon de récompense</p>
              <div style={{ fontSize: '72px', marginBottom: '12px' }}>{prize.emoji}</div>
              <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', margin: '0 0 16px' }}>{prize.label}</h2>
              <div style={{ border: '2px dashed #e2e8f0', borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
                <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 4px' }}>Valable aujourd'hui uniquement</p>
                <p style={{ color: '#1e293b', fontWeight: '700', fontSize: '14px', margin: 0 }}>
                  {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0, fontStyle: 'italic' }}>📱 Montre cet écran au comptoir 🎁</p>
            </div>
            <p style={{ color: '#475569', fontSize: '11px', marginTop: '16px' }}>© 2026 Crazy Toasty</p>
          </div>
        )}

      </div>
    </div>
  );
}
