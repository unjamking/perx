import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

// Three B2B tiers. Copy is bilingual inline (same pattern as AdvantageGrid) so this
// component is self-contained and doesn't touch translations.js.
const PLANS = [
  {
    key: 'starter',
    name: { en: 'Starter', sq: 'Fillestar' },
    priceNote: { en: 'For small teams', sq: 'Për ekipe të vogla' },
    price: { en: 'Free', sq: 'Falas' },
    sub: { en: 'up to 10 employees', sq: 'deri në 10 punonjës' },
    features: {
      en: ['Personalized budgets', 'Swipe discovery', 'Mobile app access', 'Email support'],
      sq: ['Buxhete të personalizuara', 'Zbulim me swipe', 'Akses në aplikacion', 'Mbështetje me email'],
    },
    highlighted: false,
  },
  {
    key: 'growth',
    name: { en: 'Growth', sq: 'Rritje' },
    priceNote: { en: 'Most popular', sq: 'Më i popullarizuari' },
    price: { en: 'Custom', sq: 'Sipas nevojës' },
    sub: { en: 'per employee / month', sq: 'për punonjës / muaj' },
    features: {
      en: ['Everything in Starter', 'Real-time HR dashboard', 'Performance challenges', 'Group buys & gifting', 'AI concierge', 'Priority support'],
      sq: ['Çdo gjë te Fillestar', 'Panel HR në kohë reale', 'Sfida performance', 'Blerje në grup & dhurata', 'Koncierge me AI', 'Mbështetje prioritare'],
    },
    highlighted: true,
  },
  {
    key: 'enterprise',
    name: { en: 'Enterprise', sq: 'Korporatë' },
    priceNote: { en: 'For large orgs', sq: 'Për organizata të mëdha' },
    price: { en: "Let's talk", sq: 'Le të flasim' },
    sub: { en: 'tailored rollout', sq: 'zbatim i personalizuar' },
    features: {
      en: ['Everything in Growth', 'Multi-office support', 'Custom integrations', 'Dedicated success manager', 'SLA & audit logs'],
      sq: ['Çdo gjë te Rritje', 'Mbështetje shumë-zyrash', 'Integrime të personalizuara', 'Menaxher i dedikuar', 'SLA & regjistra auditimi'],
    },
    highlighted: false,
  },
];

export default function PricingSection({ lang, onOpenModal }) {
  const containerRef = useRef(null);
  const L = (obj) => obj[lang] || obj.en;

  useGSAP(() => {
    const cards = containerRef.current.querySelectorAll('.pricing-card');
    cards.forEach((card, idx) => {
      gsap.fromTo(card,
        { opacity: 0, y: 50 },
        {
          opacity: 1, y: 0, duration: 0.8, delay: idx * 0.15, ease: 'power2.out',
          scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none reverse' },
        }
      );
    });
  }, { scope: containerRef });

  return (
    <section className="pricing-sec section-padding" ref={containerRef} id="pricing">
      <div className="container">
        <div className="section-header text-center">
          <span className="section-subtitle">✦ {lang === 'sq' ? 'ÇMIMET' : 'PRICING'}</span>
          <h2 className="section-title">{lang === 'sq' ? 'Plane për çdo ekip' : 'Plans for every team'}</h2>
        </div>
        <div className="pricing-grid">
          {PLANS.map((plan) => (
            <div key={plan.key} className={`pricing-card${plan.highlighted ? ' pricing-card-featured' : ''}`}>
              {plan.highlighted && (
                <span className="pricing-badge">{lang === 'sq' ? 'Më i popullarizuari' : 'Most popular'}</span>
              )}
              <span className="pricing-note">{L(plan.priceNote)}</span>
              <h3 className="pricing-name">{L(plan.name)}</h3>
              <div className="pricing-price">
                <span className="pricing-amount">{L(plan.price)}</span>
                <span className="pricing-sub">{L(plan.sub)}</span>
              </div>
              <ul className="pricing-features">
                {L(plan.features).map((f, i) => (
                  <li key={i}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pricing-check">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`btn ${plan.highlighted ? 'btn-primary' : 'btn-secondary'} pricing-cta`}
                onClick={() => onOpenModal('demo')}
              >
                {lang === 'sq' ? 'Fillo tani' : 'Get started'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
