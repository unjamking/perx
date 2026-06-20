import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export default function Hero({ lang, translations, onOpenModal }) {
  const containerRef = useRef(null);
  const marqueeRef = useRef(null);
  const phoneRef = useRef(null);
  const textColRef = useRef(null);
  const canvasRef = useRef(null);

  const t = translations[lang];

  // GSAP Scroll Animations
  useGSAP(() => {
    let mm = gsap.matchMedia();

    // 1. Horizontal Marquee Scroll effect (runs on all screens)
    gsap.to(marqueeRef.current, {
      xPercent: -50,
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom top",
        scrub: 1,
      }
    });

    // 2. Desktop cinematic timeline
    mm.add("(min-width: 1025px)", () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom+=300 top",
          scrub: 1.5,
          pin: true,
          pinSpacing: true,
        }
      });

      // Fade out text column and float phone to center
      tl.to(textColRef.current, {
        opacity: 0,
        y: -50,
        duration: 0.6,
        ease: "power2.inOut"
      }, 0)
      .to(phoneRef.current, {
        x: () => {
          const phoneRect = phoneRef.current.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          const centerOffset = (containerRect.width / 2) - (phoneRect.left - containerRect.left) - (phoneRect.width / 2);
          return centerOffset;
        },
        scale: 1.25,
        rotation: 0,
        ease: "power2.inOut",
        duration: 1
      }, 0);
    });

    // 3. Mobile/Tablet animation: simple slide up on entry, no scroll pinning
    mm.add("(max-width: 1024px)", () => {
      gsap.fromTo(textColRef.current, 
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
      );
      
      gsap.fromTo(phoneRef.current, 
        { opacity: 0, y: 40, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 1, ease: "power2.out", delay: 0.2 }
      );
    });

    return () => mm.revert();
  }, { scope: containerRef });

  // 4-Point Star Particle system
  const particlesRef = useRef([]);
  const requestRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const handleResize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    handleResize();
    window.addEventListener('resize', handleResize);


    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particlesRef.current = particlesRef.current.filter(p => p.alpha > 0);
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.rotationSpeed;
        p.alpha -= p.decay;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        ctx.beginPath();
        const r = p.size;
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.quadraticCurveTo(0, 0, 0, r);
        ctx.quadraticCurveTo(0, 0, -r, 0);
        ctx.quadraticCurveTo(0, 0, 0, -r);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleScreenClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    const colors = ["#f0b429", "#f7d070", "#fffbeb", "#ffea79", "#f59e0b"];

    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 3;
      particlesRef.current.push({
        x,
        y,
        size: Math.random() * 10 + 5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        gravity: 0.2,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 6,
        alpha: 1,
        decay: Math.random() * 0.015 + 0.015,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([15, 10, 15]);
    }
  };


  return (
    <section className="hero-sec" ref={containerRef} id="hero">
      {/* Background Marquee Text */}
      <div className="hero-marquee-bg">
        <div className="marquee-text-row" ref={marqueeRef}>
          YOUR BENEFITS, YOUR WAY • REINVENTING DISCOVERY • YOUR BENEFITS, YOUR WAY • REINVENTING DISCOVERY • YOUR BENEFITS, YOUR WAY • REINVENTING DISCOVERY •
        </div>
      </div>

      <div className="container hero-grid">
        {/* Left Column: Heading and description */}
        <div className="hero-content" ref={textColRef}>
          <h1 className="text-gradient">{t.heroTitle}</h1>
          <p>{t.heroDesc}</p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => onOpenModal('demo')}>
              {t.heroCTA}
            </button>
            <a href="#slider" className="btn btn-outline">
              {t.heroSecondary}
            </a>
          </div>
        </div>

        {/* Right Column: Floating Mockup */}
        <div className="hero-mockup-wrapper">
          <div className="phone-frame" ref={phoneRef} style={{ transform: 'rotate(4deg)' }}>
            <div className="phone-notch"></div>
            <div className="phone-screen" onClick={handleScreenClick} style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', padding: 0 }}>
              <canvas id="particle-canvas" ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, pointerEvents: 'none' }}></canvas>
              <img 
                src="/phone-screenshot.png" 
                alt="Perx App UI" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover', 
                  display: 'block' 
                }} 
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
