import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export default function AdvantageGrid({ lang }) {
  const containerRef = useRef(null);

  useGSAP(() => {
    const cards = containerRef.current.querySelectorAll('.advantage-card');
    
    cards.forEach((card, idx) => {
      gsap.fromTo(card, 
        { opacity: 0, y: 50 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.8, 
          delay: idx * 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
            toggleActions: "play none none reverse"
          }
        }
      );
    });
  }, { scope: containerRef });

  return (
    <section className="advantage-sec section-padding" ref={containerRef} id="features">
      <div className="container">
        <div className="section-header text-center">
          <span className="section-subtitle">✦ {lang === 'sq' ? 'VEÇORITË KRYESORE' : 'PLATFORM FEATURES'}</span>
          <h2 className="section-title">{lang === 'sq' ? "Çfarë e bën Perx të veçantë?" : "Why companies choose Perx"}</h2>
        </div>
        <div className="advantage-grid-wrapper">
          {/* Card 1: Budgets */}
          <div className="advantage-card">
            <div className="advantage-icon-box">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="feat-icon">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="12" y1="4" x2="12" y2="20" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <h3 className="advantage-card-title">
              {lang === 'sq' ? "Buxhete të Personalizuara" : "Personalized Budgets"}
            </h3>
            <p className="advantage-card-desc">
              {lang === 'sq' 
                ? "Alokoni buxhete mujore të personalizuara për çdo ekip ose individ. Punonjësit zgjedhin vetë si ta ndajnë buxhetin e tyre në palestër, wellness, dhe më shumë."
                : "Allocate custom monthly allowances per team or individual. Employees choose how to split their budget across different lifestyle and wellness perks."}
            </p>
          </div>

          {/* Card 2: Swipe */}
          <div className="advantage-card highlighted-card">
            <div className="advantage-icon-box">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="feat-icon">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h3 className="advantage-card-title">
              {lang === 'sq' ? "Zbulimi me Swipe" : "Swipe Discovery"}
            </h3>
            <p className="advantage-card-desc">
              {lang === 'sq' 
                ? "Eksplorimi i ofertave të spa, fitnesit dhe telekomit është argëtues, i gamifikuar dhe plotësisht ndërveprues përmes swipe-it në stilin e Tinder-it."
                : "Tinder-style swipe feed makes exploring wellness, dining, and telecom passes fun, gamified, and highly interactive for all staff members."}
            </p>
          </div>

          {/* Card 3: Dashboard */}
          <div className="advantage-card">
            <div className="advantage-icon-box">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="feat-icon">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <h3 className="advantage-card-title">
              {lang === 'sq' ? "Analitikë në Kohë Reale" : "Real-Time HR Insights"}
            </h3>
            <p className="advantage-card-desc">
              {lang === 'sq' 
                ? "Paneli i kontrollit për burimet njerëzore tregon saktësisht cilat oferta janë të pëlqyera, duke gjurmuar përdorimin pa asnjë burokraci apo fatura manuale."
                : "Zero-admin automated dashboard shows exactly which perks are popular, tracking budget utilization instantly without any manual billing overhead."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

