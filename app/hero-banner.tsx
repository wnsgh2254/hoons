'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { Pause, Play } from 'lucide-react';
import styles from './landing.module.css';

const INTRO_TITLE = 'Korean Hair Salon in Sydney';
const ROTATION_INTERVAL = 8000;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const BANNERS = [
  {
    id: 'intro',
    title: INTRO_TITLE,
    image: '/images/hoons-hero.webp',
  },
  {
    id: 'launch',
    title: '10% off haircuts',
    eyebrow: 'Website launch offer',
    image: '/images/hoons-launch-portrait.webp',
  },
];

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function prefersReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function serverPrefersReducedMotion() {
  return true;
}

export default function HeroBanner() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [rotationPreference, setRotationPreference] = useState<boolean | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    prefersReducedMotion,
    serverPrefersReducedMotion,
  );
  const rotating = rotationPreference ?? !reducedMotion;

  useEffect(() => {
    if (!rotating) return;

    const timer = window.setInterval(() => {
      if (!document.hidden) {
        setActiveIndex((index) => (index + 1) % BANNERS.length);
      }
    }, ROTATION_INTERVAL);

    return () => window.clearInterval(timer);
  }, [rotating]);

  return (
    <section
      className={styles.hero}
      aria-label="HOONS highlights"
      aria-roledescription="carousel"
      onFocus={(event) => {
        if (event.target.matches(':focus-visible') && !event.currentTarget.contains(event.relatedTarget)) {
          setRotationPreference(false);
        }
      }}
    >
      <h1 className="sr-only">{INTRO_TITLE}</h1>
      <div className={styles.heroSlides} aria-live={rotating ? 'off' : 'polite'}>
        {BANNERS.map((banner, index) => (
          <div
            key={banner.id}
            className={styles.heroSlide}
            data-banner={banner.id}
            data-active={index === activeIndex}
            aria-hidden={index !== activeIndex}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${BANNERS.length}`}
          >
            <div className={banner.id === 'launch' ? styles.offerMedia : styles.heroMedia}>
              <Image
                src={banner.image}
                alt=""
                fill
                unoptimized
                preload={index === 0}
                loading={index === 0 ? undefined : 'eager'}
                className={banner.id === 'launch' ? styles.offerImage : styles.heroImage}
              />
            </div>
            {banner.eyebrow ? (
              <div className={styles.offerCopy}>
                <p className={styles.offerEyebrow}>{banner.eyebrow}</p>
                <h2 className={styles.offerTitle}>{banner.title}</h2>
              </div>
            ) : (
              <p className={styles.heroTitle}>{banner.title}</p>
            )}
          </div>
        ))}
      </div>

      <div className={styles.heroControls} role="group" aria-label="Banner controls">
        {BANNERS.map((banner, index) => (
          <button
            key={banner.id}
            type="button"
            className={styles.bannerIndicator}
            aria-label={`Show ${banner.title}`}
            aria-current={index === activeIndex ? 'true' : undefined}
            onClick={() => {
              setActiveIndex(index);
              setRotationPreference(false);
            }}
          />
        ))}
        <button
          type="button"
          className={styles.bannerRotation}
          aria-label={rotating ? 'Pause banner rotation' : 'Play banner rotation'}
          onClick={() => setRotationPreference(!rotating)}
        >
          {rotating ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
        </button>
      </div>
    </section>
  );
}
