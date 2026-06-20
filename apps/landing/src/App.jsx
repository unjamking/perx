import React, { useState, useEffect } from 'react';
import Lenis from 'lenis';
import { translations } from './translations';
import Header from './components/Header';
import Hero from './components/Hero';
import BigStatement from './components/BigStatement';
import AboutSection from './components/AboutSection';
import ProductSlider from './components/ProductSlider';
import AdvantageGrid from './components/AdvantageGrid';
import PricingSection from './components/PricingSection';
import PlayVideoSection from './components/PlayVideoSection';
import TestimonialGrid from './components/TestimonialGrid';
import Footer from './components/Footer';
import LeadModal from './components/LeadModal';
import ChatOverlay from './components/ChatOverlay';
import Toast from './components/Toast';
import PartnersShowcase from './components/PartnersShowcase';
import FAQSection from './components/FAQSection';

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('perx_lang') || 'en');
  const [redeemedIds, setRedeemedIds] = useState([2]); // Zen Spa pre-redeemed by default
  const [budgetSpent, setBudgetSpent] = useState(6000); // 6,000 ALL default spent
  const budgetTotal = 15000;

  // Modal open states
  const [modalActive, setModalActive] = useState(false);
  const [modalType, setModalType] = useState('demo'); // company, demo, provider
  const [chatActive, setChatActive] = useState(false);
  const [toastActive, setToastActive] = useState(false);

  // Sync lang to localStorage
  useEffect(() => {
    localStorage.setItem('perx_lang', lang);
  }, [lang]);

  // Lenis Smooth Scroll Initialization
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.3,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // smooth exponential scroll physics
      smoothWheel: true,
      touchMultiplier: 2,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Track scroll progress and update CSS custom property
    lenis.on('scroll', (e) => {
      const progress = e.progress; // between 0 and 1
      document.documentElement.style.setProperty('--scroll-progress', `${progress * 100}%`);
    });

    // Intercept clicks on all anchor links for smooth scrolling transition (using event delegation)
    const handleGlobalClick = (e) => {
      const anchor = e.target.closest('a');
      if (anchor) {
        const targetId = anchor.getAttribute('href');
        if (targetId) {
          if (targetId === '#') {
            e.preventDefault();
            window.history.pushState(null, null, ' ');
            lenis.scrollTo(0, { duration: 1.2 });
          } else if (targetId.startsWith('#')) {
            e.preventDefault();
            window.history.pushState(null, null, targetId);
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
              lenis.scrollTo(targetElement, {
                offset: -80, // Accounts for sticky header height
                duration: 1.2,
                immediate: false
              });
            }
          }
        }
      }
    };

    document.addEventListener('click', handleGlobalClick);

    return () => {
      lenis.destroy();
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  const handleRedeem = (card) => {
    if (!redeemedIds.includes(card.id)) {
      setRedeemedIds(prev => [...prev, card.id]);
      setBudgetSpent(prev => Math.min(prev + card.numericPrice, budgetTotal));
    }
  };

  const handleOpenModal = (type) => {
    setModalType(type);
    setModalActive(true);
  };

  const handleFormSubmitSuccess = () => {
    setToastActive(true);
    setTimeout(() => {
      setToastActive(false);
    }, 4000);
  };

  return (
    <>
      {/* Scroll Progress Bar */}
      <div className="scroll-progress-bar"></div>

      {/* Ambient background glows */}
      <div className="ambient-glow glow-1"></div>
      <div className="ambient-glow glow-2"></div>
      <div className="ambient-glow glow-3"></div>

      {/* Navigation Header */}
      <Header 
        lang={lang} 
        setLang={setLang} 
        translations={translations} 
        onOpenModal={handleOpenModal} 
      />

      {/* Hero Section */}
      <Hero 
        lang={lang} 
        translations={translations} 
        redeemedIds={redeemedIds} 
        onRedeem={handleRedeem} 
        budgetSpent={budgetSpent} 
        budgetTotal={budgetTotal} 
        onOpenModal={handleOpenModal} 
      />

      {/* Partner Showcase (immediate social proof) */}
      <PartnersShowcase lang={lang} translations={translations} />

      {/* Transition statement & About block */}
      <BigStatement lang={lang} translations={translations} />
      <AboutSection lang={lang} translations={translations} />

      {/* Infinite Product Category Slider */}
      <ProductSlider lang={lang} translations={translations} />

      {/* Advantage highlights list */}
      <AdvantageGrid lang={lang} />

      {/* Pricing tiers */}
      <PricingSection lang={lang} onOpenModal={handleOpenModal} />

      {/* Play Video / AI concierge simulation trigger */}
      <PlayVideoSection lang={lang} onOpenChat={() => setChatActive(true)} />

      {/* Parallax testimonials grid */}
      <TestimonialGrid lang={lang} />

      {/* Frequently Asked Questions */}
      <FAQSection lang={lang} translations={translations} />

      {/* Liquid footer */}
      <Footer lang={lang} onOpenModal={handleOpenModal} />

      {/* Unified Lead Forms Modal overlay */}
      <LeadModal 
        active={modalActive} 
        type={modalType} 
        onClose={() => setModalActive(false)} 
        lang={lang} 
        translations={translations} 
        onSubmitSuccess={handleFormSubmitSuccess} 
      />

      {/* Exodus AI chat overlay simulator */}
      <ChatOverlay 
        active={chatActive} 
        onClose={() => setChatActive(false)} 
        lang={lang} 
        translations={translations} 
      />

      {/* Success Notification Toast */}
      <Toast active={toastActive} lang={lang} translations={translations} />
    </>
  );
}

