import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

const reviewsColumn1 = [
  {
    id: 1,
    score: "★ 5.0",
    text: "Finally, benefits that make sense! I redeemed Zen Spa Tirana three times this month already.",
    user: "Kristi D.",
    role: "Dev, Soft & Sol",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150"
  },
  {
    id: 2,
    score: "★ 4.9",
    text: "Exodus AI booked my CrossFit slot in 2 minutes. Easiest perk app ever.",
    user: "Eni K.",
    role: "Associate, Deloitte Albania",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150"
  }
];

const reviewsColumn2 = [
  {
    id: 3,
    score: "★ 5.0",
    text: "Our HR team loves Perx. Total transparency on budget spending without dealing with static gym contracts.",
    user: "Amela G.",
    role: "HR Lead, Vodafone Albania",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150"
  },
  {
    id: 4,
    score: "★ 4.8",
    text: "We replaced our corporate gym cards with Perx. Employees choose what they actually use.",
    user: "Dritan P.",
    role: "Director, Lufthansa Industry",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150"
  }
];

const reviewsColumn3 = [
  {
    id: 5,
    score: "★ 4.9",
    text: "My 10GB Data bundle voucher from ALBtelecom was approved instantly by my manager. Outstanding!",
    user: "Bora L.",
    role: "PM, Landmark Technologies",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150"
  },
  {
    id: 6,
    score: "★ 5.0",
    text: "The Tinder swiping makes it fun. We compete for active wellness challenges at the office.",
    user: "Sara S.",
    role: "Analyst, Raiffeisen Bank",
    avatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&q=80&w=150"
  }
];

export default function TestimonialGrid({ lang }) {
  const gridRef = useRef(null);
  const col1Ref = useRef(null);
  const col2Ref = useRef(null);
  const col3Ref = useRef(null);

  const titleText = lang === 'sq' ? "Çfarë Flasin Të Gjithë" : "What Everyone Is Talking About";

  useGSAP(() => {
    let mm = gsap.matchMedia();

    mm.add("(min-width: 769px)", () => {
      // Parallax scrolling effects for each column
      gsap.fromTo(col1Ref.current, 
        { y: 50 }, 
        {
          y: -50,
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.5,
          }
        }
      );

      gsap.fromTo(col2Ref.current, 
        { y: -30 }, 
        {
          y: 60,
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.5,
          }
        }
      );

      gsap.fromTo(col3Ref.current, 
        { y: 70 }, 
        {
          y: -70,
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.5,
          }
        }
      );
    });

    return () => mm.revert();
  }, { scope: gridRef });

  return (
    <section className="reviews-sec section-padding" ref={gridRef} id="reviews">
      <div className="container">
        <h2>{titleText}</h2>
        <div className="reviews-grid">
          <div className="reviews-column" ref={col1Ref}>
            {reviewsColumn1.map((rev) => (
              <div className="review-card" key={rev.id}>
                <div className="review-score">{rev.score}</div>
                <p className="review-text">"{rev.text}"</p>
                <div className="review-user">
                  <img src={rev.avatar} alt={rev.user} className="review-avatar" />
                  <div className="review-user-info">
                    <h4>{rev.user}</h4>
                    <span>{rev.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="reviews-column" ref={col2Ref}>
            {reviewsColumn2.map((rev) => (
              <div className="review-card" key={rev.id}>
                <div className="review-score">{rev.score}</div>
                <p className="review-text">"{rev.text}"</p>
                <div className="review-user">
                  <img src={rev.avatar} alt={rev.user} className="review-avatar" />
                  <div className="review-user-info">
                    <h4>{rev.user}</h4>
                    <span>{rev.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="reviews-column" ref={col3Ref}>
            {reviewsColumn3.map((rev) => (
              <div className="review-card" key={rev.id}>
                <div className="review-score">{rev.score}</div>
                <p className="review-text">"{rev.text}"</p>
                <div className="review-user">
                  <img src={rev.avatar} alt={rev.user} className="review-avatar" />
                  <div className="review-user-info">
                    <h4>{rev.user}</h4>
                    <span>{rev.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
