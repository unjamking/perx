import React from 'react';

export default function AboutSection({ lang, translations }) {
  const t = translations[lang];

  return (
    <section className="about-details-sec section-padding">
      <div className="container">
        <div className="about-grid">
          <div className="about-info-col">
            <span className="section-subtitle">✦ {lang === 'sq' ? 'KUSH JEMI NE' : 'ABOUT US'}</span>
            <h2 className="section-title">{t.aboutTitle}</h2>
            <p className="section-desc">{t.aboutDesc}</p>
            <div className="about-extra-info">
              <p>
                {lang === 'sq' 
                  ? "Perx operon si një urë lidhëse mes bizneseve moderne dhe ofruesve më të mirë të shërbimeve në kryeqytet. Qëllimi ynë është të thjeshtojmë menaxhimin e burimeve njerëzore dhe të sjellim përfitime reale për punonjësit."
                  : "Perx operates as a bridge between modern companies and the best service providers in Tirana. Our goal is to streamline HR administration while delivering authentic value to employees."}
              </p>
            </div>
          </div>
          <div className="about-stats-col">
            <div className="stats-card">
              <div className="stats-header">
                <span className="stats-icon">👥</span>
                <span className="stats-num">{t.statEmployeesNum}</span>
              </div>
              <span className="stats-label">{t.statEmployeesLabel}</span>
            </div>

            <div className="stats-card">
              <div className="stats-header">
                <span className="stats-icon">🤝</span>
                <span className="stats-num">{t.statPartnersNum}</span>
              </div>
              <span className="stats-label">{t.statPartnersLabel}</span>
            </div>

            <div className="stats-card animate-pulse-glow">
              <div className="stats-header">
                <span className="stats-icon">📉</span>
                <span className="stats-num">{t.statSavingsNum}</span>
              </div>
              <span className="stats-label">{t.statSavingsLabel}</span>
            </div>

            <div className="stats-card">
              <div className="stats-header">
                <span className="stats-icon">⚡</span>
                <span className="stats-num">{t.statEngagementNum}</span>
              </div>
              <span className="stats-label">{t.statEngagementLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
