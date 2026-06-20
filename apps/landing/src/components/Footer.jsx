import React from 'react';

export default function Footer({ lang, onOpenModal }) {
  return (
    <>
      {/* Liquid Wave Separator */}
      <div className="liquid-divider">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M0,0 C150,90 350,110 500,60 C650,10 800,30 950,70 C1100,110 1250,70 1440,20 L1440,120 L0,120 Z" 
            fill="#013137" 
          />
        </svg>
      </div>

      <footer id="partners">
        <div className="container">
          {/* Massive Hashtag Banner */}
          <div className="footer-banner">
            <h2 className="footer-hashtag">#PERXIFYRESPONSIBLY</h2>
          </div>

          {/* Primary Action Buttons */}
          <div className="footer-ctas">
            <button className="btn btn-primary" onClick={() => onOpenModal('company')}>
              {lang === 'sq' ? "Për Punonjësit" : "For Employees"}
            </button>
            <button className="btn btn-primary" onClick={() => onOpenModal('demo')}>
              {lang === 'sq' ? "Për HR Administratorët" : "For HR Admins"}
            </button>
            <button className="btn btn-primary" onClick={() => onOpenModal('provider')}>
              {lang === 'sq' ? "Për Partnerët" : "For Providers"}
            </button>
          </div>

          {/* Footer Grid links */}
          <div className="footer-grid">
            <div className="footer-brand">
              <a href="#" className="logo-link" style={{ color: '#FFFFFF' }}>
                <div className="logo-box" style={{ background: 'transparent' }}>
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
                <span style={{ color: '#ffffff' }}>Perx</span>
              </a>
              <p>
                {lang === 'sq' 
                  ? "Katalogë benefitesh të personalizuara dhe ndërvepruese që punonjësit i duan vërtet. Ndërtuar për kompanitë moderne në Tiranë." 
                  : "Swipable, gamified benefits people actually love. Built for Tirana's modern companies."}
              </p>
            </div>

            <div className="footer-links-col">
              <h4>{lang === 'sq' ? "Platforma" : "Platform"}</h4>
              <ul className="footer-links">
                <li><a href="#about">{lang === 'sq' ? "Rreth Nesh" : "About"}</a></li>
                <li><a href="#features">{lang === 'sq' ? "Veçoritë" : "Features"}</a></li>
                <li><a href="#reviews">{lang === 'sq' ? "Eksperiencat" : "Testimonials"}</a></li>
              </ul>
            </div>

            <div className="footer-links-col">
              <h4>{lang === 'sq' ? "Ndihma" : "Resources"}</h4>
              <ul className="footer-links">
                <li><a href="#video-experience">{lang === 'sq' ? "Asistenti Exodus AI" : "Exodus AI Concierge"}</a></li>
                <li><a href="#slider">{lang === 'sq' ? "Kategoritë e Benefiteve" : "Benefit Categories"}</a></li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom info */}
          <div className="footer-bottom">
            <p>&copy; 2026 Perx Benefits. All rights reserved. Tirana, Albania.</p>
            <div className="footer-socials">
              <a href="#" className="social-link" aria-label="LinkedIn">in</a>
              <a href="#" className="social-link" aria-label="Instagram">ig</a>
              <a href="#" className="social-link" aria-label="Twitter">tw</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
