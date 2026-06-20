import React from 'react';

export default function PlayVideoSection({ lang, onOpenChat }) {
  const headingText = lang === 'sq' ? "Njihuni me Exodus AI" : "Meet Exodus AI Concierge";
  const descText = lang === 'sq'
    ? "Asistenti ynë inteligjent koordinon rezervimet tuaja dhe ndërton paketa të personalizuara brenda buxhetit tuaj mujor."
    : "Our intelligent assistant coordinates bookings and designs personalized benefit packages inside your monthly allowance.";

  const badgeText = "PLAY VIDEO • EXODUS AI • PLAY VIDEO • EXODUS AI • ";

  return (
    <section className="video-sec section-padding" id="video-experience">
      <div className="container">
        <h2>{headingText}</h2>
        <p>{descText}</p>
        
        <div className="video-container-wrapper" onClick={onOpenChat}>
          {/* Custom mock video background using a beautiful Unsplash visual */}
          <img 
            src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=1200" 
            alt="Video preview" 
            className="video-placeholder-img"
          />
          
          <div className="video-overlay-play">
            <div className="spinning-badge-wrapper">
              {/* Circular SVG curved text path */}
              <svg viewBox="0 0 100 100" className="circular-svg">
                <path 
                  id="circlePath" 
                  d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" 
                  fill="none" 
                />
                <text fill="#ffffff" fontSize="8" fontWeight="800" letterSpacing="2px">
                  <textPath href="#circlePath">
                    {badgeText}
                  </textPath>
                </text>
              </svg>
              {/* Center Play Button Triangle */}
              <div className="play-triangle"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
