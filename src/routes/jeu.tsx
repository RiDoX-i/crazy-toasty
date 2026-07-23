import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://sejtefqrjzouatztwwue.supabase.co',
  'sb_publishable_Kkgztfk46FJK5DZA3siCuQ_In93SfJ6'
);

export const Route = createFileRoute('/jeu')({
  component: JeuPage,
});

const googleReviewUrl = 'https://g.page/r/CczrmSXmCqF0EBM/review';

const PRIZES = [
  { label: 'Coca-Cola offert', emoji: '🥤' },
  { label: 'Nuggets offerts', emoji: '🍗' },
  { label: 'Sauce offerte', emoji: '🫙' },
  { label: 'Coca-Cola offert', emoji: '🥤' },
  { label: 'Nuggets offerts', emoji: '🍗' },
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
  }
  return shuffle(CARD_EMOJIS).slice(0, 6);
}

function JeuPage() {
  const [step, setStep] = useState<'contact' | 'checking' | 'already' | 'game' | 'win'>('contact');
  const [contact, setContact] = useState('');
  const [contactError, setContactError] = useState('');
  const [cards, setCards] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [prize, setPrize] = useState<typeof PRIZES[0] | null>(null);
  const [reviewClicked, setReviewClicked] = useState(false);
  const [reviewCountdown, setReviewCountdown] = useState(15);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (step === 'game') {
      setCards(generateCards());
      setFlipped([]);
      setMatched([]);
      setAttempts(0);
    }
  }, [step]);



  const handleCheckContact = async () => {
    const cleaned = contact.trim().toLowerCase();
    if (!cleaned) { setContactError('Entre ton email ou téléphone'); return; }
    setContactError('');
    setStep('checking');
    // Vérifier seulement si le contact a GAGNÉ
    const { data } = await supabase.from('game_wins').select('id').eq('contact', cleaned).eq('claimed', false).neq('prize', 'Perdu').maybeSingle();
    if (data) {
      setStep('already');
    } else {
      setStep('game');
    }
  };

  const handleCardClick = (i: number) => {
    if (flipped.includes(i) || matched.includes(i) || flipped.length >= 2) return;
    const newFlipped = [...flipped, i];
    setFlipped(newFlipped);
    setAttempts(a => a + 1);
    if (newFlipped.length === 2) {
      const [a, b] = newFlipped;
      if (cards[a] === cards[b]) {
        setMatched([a, b]);
        const winPrize = PRIZES[Math.floor(Math.random() * PRIZES.length)];
        setPrize(winPrize);
        setTimeout(async () => {
          setPrize(winPrize);
          setStep('win');
        }, 800);
      } else {
        setTimeout(() => {
          setFlipped([]);
          // Si perdu après 3 tentatives → reset le jeu pour rejouer (seulement si pas encore gagné)
          if (attempts >= 2 && !matched.length) {
            setCards(generateCards());
            setFlipped([]);
            setMatched([]);
            setAttempts(0);
          }
        }, 1000);
      }
    }
  };

  const handleReview = async () => {
    setReviewClicked(true);
    window.open(googleReviewUrl, '_blank');
    // Rediriger vers le menu après 2 secondes
    setTimeout(() => { window.location.href = '/commander'; }, 2000);
    // Sauvegarder et envoyer email maintenant
    if (prize) {
      await supabase.from('game_wins').insert({ prize: prize.label, contact: contact.trim().toLowerCase() });
      await fetch('https://sejtefqrjzouatztwwue.supabase.co/functions/v1/send-game-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer sb_publishable_Kkgztfk46FJK5DZA3siCuQ_In93SfJ6' },
        body: JSON.stringify({
          email: contact.trim().toLowerCase(),
          prize: prize.label,
          emoji: prize.emoji,
          date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        })
      });
    }
    let count = 15;
    setReviewCountdown(count);
    const timer = setInterval(() => {
      count--;
      setReviewCountdown(count);
      if (count <= 0) { clearInterval(timer); setStep('game'); }
    }, 1000);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>

        {/* CONTACT */}
        {step === 'contact' && (
          <div>
            <div style={{ fontSize: '60px', marginBottom: '8px' }}>🥪</div>
            <p style={{ color: '#f97316', fontSize: '12px', fontWeight: '700', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '2px' }}>Jeu exclusif</p>
            <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'white', margin: '0 0 8px' }}>CRAZY TOASTY</h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 24px' }}>Entre ton email pour jouer et recevoir ton bon de récompense !</p>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
              <input
                type="email"
                value={contact}
                onChange={e => setContact(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCheckContact()}
                placeholder="ton@email.com"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: '16px', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }}
              />
              {contactError && <p style={{ color: '#ef4444', fontSize: '13px', margin: '0 0 12px' }}>{contactError}</p>}
              <button onClick={handleCheckContact}
                style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #f97316, #ea580c)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: '800', fontSize: '16px', cursor: 'pointer' }}>
                🎮 Jouer gratuitement !
              </button>
            </div>
            <p style={{ color: '#475569', fontSize: '11px' }}>1 gain par personne • Email utilisé uniquement pour ton bon de récompense</p>
          </div>
        )}

        {/* VÉRIFICATION */}
        {step === 'checking' && (
          <div>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <p style={{ color: 'white', fontSize: '16px' }}>Vérification en cours...</p>
          </div>
        )}

        {/* DÉJÀ GAGNÉ */}
        {step === 'already' && (
          <div>
            <div style={{ fontSize: '64px', marginBottom: '12px' }}>😅</div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'white', margin: '0 0 8px' }}>Tu as déjà gagné !</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 24px' }}>Un seul cadeau par personne. Merci quand même !</p>
            <a href={googleReviewUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', padding: '14px', background: '#4285f4', borderRadius: '12px', color: 'white', fontWeight: '700', fontSize: '16px', textDecoration: 'none', marginBottom: '12px' }}>
              ⭐ Laisser un avis Google
            </a>
            <a href="/commander"
              style={{ display: 'block', padding: '12px', background: 'rgba(249,115,22,0.2)', border: '1px solid #f97316', borderRadius: '12px', color: '#f97316', fontWeight: '700', fontSize: '14px', textDecoration: 'none' }}>
              🥪 Commander maintenant
            </a>
          </div>
        )}

        {/* AVIS GOOGLE */}
        {step === 'review' && (
          <div>
            <div style={{ fontSize: '60px', marginBottom: '12px' }}>⭐</div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'white', margin: '0 0 8px' }}>Étape 1/2</h2>
            <p style={{ color: '#fed7aa', fontSize: '16px', fontWeight: '700', margin: '0 0 20px' }}>Laisse ton avis Google pour débloquer le jeu !</p>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
              {!reviewClicked ? (
                <div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                    <p style={{ color: 'white', fontSize: '14px', fontWeight: '700', margin: '0 0 6px' }}>Comment ca marche :</p>
                    <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 4px' }}>1. Clique sur le bouton ci-dessous</p>
                    <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 4px' }}>2. Laisse ton avis sur Google</p>
                    <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>3. Reviens sur cette page pour jouer !</p>
                  </div>
                  <button onClick={handleReview}
                  style={{ width: '100%', padding: '14px', background: '#4285f4', border: 'none', borderRadius: '12px', color: 'white', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}>
                  ⭐ Laisser un avis Google
                </button>
                </div>
              ) : (
                <div>
                  <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                    <p style={{ color: '#22c55e', fontWeight: '800', margin: '0 0 8px', fontSize: '16px' }}>Super !</p>
                    <p style={{ color: 'white', fontSize: '14px', margin: '0 0 4px' }}> Donne tes étoiles sur Google</p>
                    <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>puis reviens ici pour jouer !</p>
                  </div>
                  <button onClick={() => setStep('game')}
                    style={{ width: '100%', padding: '12px', background: 'rgba(34,197,94,0.2)', border: '1px solid #22c55e', borderRadius: '12px', color: '#22c55e', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                    🎮 Jouer maintenant !
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* JEU */}
        {step === 'game' && (
          <div>
            <h2 style={{ color: 'white', fontWeight: '800', fontSize: '20px', margin: '0 0 4px' }}>🃏 Étape 2/2 — Trouve la paire !</h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px' }}>Retourne les cartes et trouve 2 identiques !</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
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
            <button onClick={() => window.location.href = '/commander'}
              style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#64748b', fontSize: '13px', cursor: 'pointer' }}>
              Abandonner → Commander quand même
            </button>
          </div>
        )}

        {/* GAGNÉ */}
        {step === 'win' && prize && (
          <div>
            <div style={{ fontSize: '72px', marginBottom: '12px' }}>{prize.emoji}</div>
            <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#22c55e', margin: '0 0 8px' }}>Felicitations !</h2>
            <p style={{ color: 'white', fontSize: '18px', fontWeight: '700', margin: '0 0 20px' }}>Tu gagnes : {prize.label}</p>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px' }}>
              <p style={{ color: '#fed7aa', fontSize: '14px', margin: '0 0 16px' }}>Clique ci-dessous pour recevoir ton bon de recompense par email !</p>
              {!reviewClicked ? (
                <button onClick={handleReview}
                  style={{ width: '100%', padding: '14px', background: '#4285f4', border: 'none', borderRadius: '12px', color: 'white', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}>
                  Laisser un avis Google et recevoir mon bon
                </button>
              ) : (
                <p style={{ color: '#22c55e', fontWeight: '700', fontSize: '15px', margin: 0 }}>Ton bon a ete envoye a {contact} !</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
