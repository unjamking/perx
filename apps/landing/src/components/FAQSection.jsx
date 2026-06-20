import React, { useState } from 'react';

export default function FAQSection({ lang, translations }) {
  const t = translations[lang];
  const [activeIndex, setActiveIndex] = useState(null);

  const faqItems = [
    { qKey: "faqQ1", aKey: "faqA1" },
    { qKey: "faqQ2", aKey: "faqA2" },
    { qKey: "faqQ3", aKey: "faqA3" },
    { qKey: "faqQ4", aKey: "faqA4" }
  ];

  const toggleAccordion = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <section className="faq-sec section-padding" id="faq">
      <div className="container">
        <h2 className="faq-title">{t.faqTitle}</h2>
        <div className="faq-accordion">
          {faqItems.map((item, index) => {
            const isOpen = activeIndex === index;
            return (
              <div 
                className={`faq-item ${isOpen ? 'active' : ''}`} 
                key={index}
                onClick={() => toggleAccordion(index)}
                onMouseMove={handleMouseMove}
              >
                <button className="faq-question-btn">
                  <span className="faq-question-text">{t[item.qKey]}</span>
                  <span className="faq-icon-wrapper">
                    <svg 
                      className={`faq-arrow-icon ${isOpen ? 'rotated' : ''}`}
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </button>
                <div className={`faq-answer-wrapper ${isOpen ? 'open' : ''}`}>
                  <div className="faq-answer-content">
                    <p>{t[item.aKey]}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
