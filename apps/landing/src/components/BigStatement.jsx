import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export default function BigStatement({ lang }) {
  const sectionRef = useRef(null);
  const wordsContainerRef = useRef(null);

  const statementText = lang === 'sq' 
    ? "NDRYSHONI KULTURËN E KOMPANISË SUAJ DHE NDIZNI MOTIVIMIN E TYRE PËRDITSHËM."
    : "STIR UP YOUR WORKFORCE CULTURE AND FUEL UP THEIR DAILY MOTIVATION.";

  const words = statementText.split(' ');

  useGSAP(() => {
    const wordsEl = wordsContainerRef.current.querySelectorAll('.statement-word');
    
    gsap.to(wordsEl, {
      opacity: 1,
      y: 0,
      stagger: 0.1,
      color: '#FFFFFF',
      ease: "power1.out",
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top 75%",
        end: "bottom 45%",
        scrub: 1,
      }
    });
  }, { scope: sectionRef });

  return (
    <section className="statement-sec" ref={sectionRef} id="about">
      <div className="container">
        <h2 className="statement-text" ref={wordsContainerRef}>
          {words.map((word, idx) => (
            <span key={idx} className="statement-word">
              {word}
            </span>
          ))}
        </h2>
      </div>
    </section>
  );
}
