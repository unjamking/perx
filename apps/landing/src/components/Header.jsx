import React, { useState } from 'react';

export default function Header({ lang, setLang, translations, onOpenModal }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = translations[lang];

  const toggleLanguage = () => {
    setLang(lang === 'en' ? 'sq' : 'en');
  };

  return (
    <header>
      <div className="container nav-container">
        <a href="#" className="logo-link">
          <div className="logo-box">
            <img 
              src="/perx-logo.png" 
              alt="Perx Logo" 
              className="logo-img" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover', 
                borderRadius: '10px' 
              }} 
            />
          </div>
          <span>Perx</span>
        </a>

        <nav>
          <ul className={`nav-menu ${mobileOpen ? 'active' : ''}`}>
            <li>
              <a href="#about" className="nav-link" onClick={() => setMobileOpen(false)}>
                {t.navAbout}
              </a>
            </li>
            <li>
              <a href="#features" className="nav-link" onClick={() => setMobileOpen(false)}>
                {t.navFeatures}
              </a>
            </li>
            <li>
              <a href="#partners" className="nav-link" onClick={() => setMobileOpen(false)}>
                {t.navPartners}
              </a>
            </li>
            {mobileOpen && (
              <li style={{ marginTop: '20px' }}>
                <button className="btn btn-primary" onClick={() => { setMobileOpen(false); onOpenModal('demo'); }}>
                  {t.navCTA}
                </button>
              </li>
            )}
          </ul>
        </nav>

        <div className="nav-actions">
          {/* Dual Language Switcher Toggle */}
          <div className={`lang-toggle ${lang === 'sq' ? 'sq' : ''}`} onClick={toggleLanguage} title="Toggle Language">
            <span className="lang-btn">EN</span>
            <span className="lang-btn">AL</span>
            <div className="lang-indicator"></div>
          </div>

          <button className="btn btn-primary" style={{ display: 'none' }} onClick={() => onOpenModal('demo')}></button>
          <button className="btn btn-primary btn-nav-cta" onClick={() => onOpenModal('demo')}>
            {t.navCTA}
          </button>

          {/* Mobile hamburger menu */}
          <button className={`hamburger ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation menu">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
      
      {/* Hide desktop nav CTA on small viewports */}
      <style>{`
        @media (max-width: 768px) {
          .btn-nav-cta {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
