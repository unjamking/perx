import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

const sliderPerks = [
  {
    id: 1,
    categoryKey: "swipeCategoryFitness",
    categoryDefault: "Fitness",
    title: "FlexFit Studio – Class Pack x10",
    subtitle: "Blloku Area, Tirana",
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=600",
    discount: "-25%",
    rating: "4.9"
  },
  {
    id: 2,
    categoryKey: "swipeCategoryWellness",
    categoryDefault: "Wellness",
    title: "Zen Spa Tirana – Monthly Wellness",
    subtitle: "Blloku Area, Tirana",
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600",
    discount: "-20%",
    rating: "4.8"
  },
  {
    id: 3,
    categoryKey: "swipeCategoryTelecom",
    categoryDefault: "Telecom",
    title: "ALBtelecom – Data 10GB Bundle",
    subtitle: "Myslym Shyri, Tirana",
    image: "https://images.unsplash.com/photo-1562408590-e32931084e23?auto=format&fit=crop&q=80&w=600",
    discount: "-25%",
    rating: "4.7"
  },
  {
    id: 4,
    categoryKey: "swipeCategoryFood",
    categoryDefault: "Food & Dining",
    title: "Mulliri Vjeter – Lunch Pass",
    subtitle: "Rruga e Kavajës, Tirana",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=600",
    discount: "-15%",
    rating: "4.8"
  },
  {
    id: 5,
    categoryKey: "swipeCategoryEducation",
    categoryDefault: "Education",
    title: "BookNook – Annual Library Access",
    subtitle: "Sami Frashëri, Tirana",
    image: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&q=80&w=600",
    discount: "-33%",
    rating: "4.7"
  },
  {
    id: 6,
    categoryKey: "swipeCategoryTransport",
    categoryDefault: "Transport",
    title: "Bolt Rides – Monthly Credit",
    subtitle: "Citywide, Tirana",
    image: "https://images.unsplash.com/photo-1449965408869-ebd3fee76fd8?auto=format&fit=crop&q=80&w=600",
    discount: "-20%",
    rating: "4.6"
  },
  {
    id: 7,
    categoryKey: "swipeCategoryEntertainment",
    categoryDefault: "Entertainment",
    title: "Kinema Millennium – Film Pass",
    subtitle: "Toptani Center, Tirana",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=600",
    discount: "-30%",
    rating: "4.9"
  }
];

export default function ProductSlider({ lang, translations }) {
  const trackRef = useRef(null);
  const tweenRef = useRef(null);

  // Infinite marquee animation using GSAP
  useGSAP(() => {
    const track = trackRef.current;
    if (!track) return;
    
    // We duplicate the slides to make a seamless loop
    const totalWidth = track.scrollWidth;
    
    tweenRef.current = gsap.to(track, {
      x: `-=${totalWidth / 2}`,
      ease: "none",
      duration: 30,
      repeat: -1,
      modifiers: {
        x: gsap.utils.unitize(x => parseFloat(x) % (totalWidth / 2))
      }
    });
  }, { scope: trackRef });

  const handleMouseEnter = () => {
    if (tweenRef.current) gsap.to(tweenRef.current, { timeScale: 0.3, duration: 0.6 });
  };

  const handleMouseLeave = () => {
    if (tweenRef.current) gsap.to(tweenRef.current, { timeScale: 1, duration: 0.6 });
  };

  // Triple the slides list for a seamless infinite loop 
  const triplePerks = [...sliderPerks, ...sliderPerks, ...sliderPerks];

  return (
    <section className="slider-sec section-padding" id="slider">
      <h2>{lang === 'sq' ? "Eksploroni Ofertat Lokale" : "Explore Popular Local Perks"}</h2>
      <div 
        className="slider-viewport"
        style={{ overflow: 'hidden', padding: '10px 0' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="slider-track" ref={trackRef}>
          {triplePerks.map((perk, index) => {
            const catLabel = translations[lang][perk.categoryKey] || perk.categoryDefault;
            return (
              <div className="slider-card" key={`${perk.id}-${index}`}>
                <div className="slider-image-wrapper">
                  <img src={perk.image} alt={perk.title} className="slider-img" loading="lazy" />
                  {perk.discount && <div className="slider-badge">{perk.discount}</div>}
                </div>
                <div className="slider-card-info">
                  <div className="slider-meta">
                    <span className="slider-category">
                      {catLabel}
                    </span>
                    <span className="slider-rating">★ {perk.rating}</span>
                  </div>
                  <h3 className="slider-title">{perk.title}</h3>
                  <p className="slider-subtitle">{perk.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
