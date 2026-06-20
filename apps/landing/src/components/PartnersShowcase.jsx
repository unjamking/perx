import React, { useState } from 'react';

const partners = [
  { 
    id: 1, 
    name: "Zen Spa Tirana", 
    category: "wellness", 
    area: "Blloku Area",
    perkEn: "Free Wellness Pass / -20% on Massages",
    perkSq: "Seancë Wellness Falas / -20% në Masazhe"
  },
  { 
    id: 2, 
    name: "Mulliri i Vjetër", 
    category: "dining", 
    area: "Rruga e Kavajës",
    perkEn: "Free Daily Coffee & Muffin Combo",
    perkSq: "Kafe & Muffin Falas Çdo Ditë"
  },
  { 
    id: 3, 
    name: "Bolt Albania", 
    category: "transport", 
    area: "Citywide",
    perkEn: "2,000 ALL Monthly Rides Credit",
    perkSq: "2,000 ALL Kredi Mujore për Udhëtime"
  },
  { 
    id: 4, 
    name: "Kinema Millennium", 
    category: "dining", 
    area: "Toptani Center",
    perkEn: "2 Ticket Passes with Popcorn Combo",
    perkSq: "2 Bileta Filmi me Kokoshka Falas"
  },
  { 
    id: 5, 
    name: "ALBtelecom", 
    category: "transport", 
    area: "Myslym Shyri",
    perkEn: "10GB Extra Data Package Monthly",
    perkSq: "Paketë 10GB Internet Shtesë çdo muaj"
  },
  { 
    id: 6, 
    name: "Tirana Fitness", 
    category: "wellness", 
    area: "Rruga Elbasanit",
    perkEn: "Full Gym Pass & Personal Trainer Intro",
    perkSq: "Abonim Palestre & Trajner Personal"
  }
];

export default function PartnersShowcase({ lang, translations }) {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState('all');

  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  const filteredPartners = activeTab === 'all' 
    ? partners 
    : partners.filter(p => p.category === activeTab);

  return (
    <section className="partners-showcase-sec section-padding" id="partners">
      <div className="container">
        <h2 className="partners-showcase-title">{t.partnersTitle}</h2>
        
        {/* Category Tabs */}
        <div className="partners-tabs">
          <button 
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} 
            onClick={() => setActiveTab('all')}
          >
            {t.partnersTabAll}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'wellness' ? 'active' : ''}`} 
            onClick={() => setActiveTab('wellness')}
          >
            {t.partnersTabWellness}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'dining' ? 'active' : ''}`} 
            onClick={() => setActiveTab('dining')}
          >
            {t.partnersTabDining}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'transport' ? 'active' : ''}`} 
            onClick={() => setActiveTab('transport')}
          >
            {t.partnersTabTransport}
          </button>
        </div>

        <div className="partners-grid">
          {filteredPartners.map(partner => (
            <div className="partner-card" key={partner.id} onMouseMove={handleMouseMove}>
              <div className="partner-logo-placeholder">
                <span className="partner-sparkle">✦</span>
                <h3 className="partner-brand-name">{partner.name}</h3>
              </div>
              <div className="partner-card-body">
                <p className="partner-perk-detail">
                  {lang === 'sq' ? partner.perkSq : partner.perkEn}
                </p>
                <span className="partner-area">📍 {partner.area}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

