'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { HOONS_LOCATIONS } from '@/lib/hoons-locations';
import { useHoonsDemo } from '@/lib/hoons-booking-demo';
import HeroBanner from './hero-banner';
import styles from './landing.module.css';

export default function Home() {
  const demo = useHoonsDemo();
  const locationsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = locationsRef.current;
    if (!section || !('IntersectionObserver' in window)
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const targets = section.querySelectorAll<HTMLElement>('[data-scroll-reveal]');
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.scrollReveal = 'visible';
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -32px 0px' });

    for (const target of targets) {
      if (target.getBoundingClientRect().top < window.innerHeight) continue;
      target.dataset.scrollReveal = 'pending';
      observer.observe(target);
    }

    return () => {
      observer.disconnect();
      for (const target of targets) target.dataset.scrollReveal = '';
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey && event.shiftKey && event.key === 'L') {
        event.preventDefault();
        window.location.href = '/admin/login';
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={styles.landing} lang="en-AU">
      <header className={styles.header}>
        <Link href="/" className={styles.wordmark} aria-label="HOONS home">HOONS</Link>
        <nav className={styles.navigation} aria-label="Main navigation">
          <Link href="#locations">Location</Link>
        </nav>
      </header>

      <main>
        <HeroBanner />

        <Link href="/booking" className={styles.bookingButton}>
          Book an appointment <ArrowRight size={16} aria-hidden="true" />
        </Link>

        <section id="locations" ref={locationsRef} className={styles.location} aria-labelledby="location-title">
          <h2 id="location-title" data-scroll-reveal="" className={styles.sectionTitle}>Location</h2>
          <div className={styles.locationGrid}>
            {HOONS_LOCATIONS.map((location) => (
              <article key={location.id} data-scroll-reveal="" className={styles.locationCard}>
                <div className={styles.locationPhoto}>
                  <Image src={location.image} alt="" fill sizes="(max-width: 560px) 88vw, (max-width: 1079px) 42vw, 21vw" />
                </div>
                <div className={styles.locationDetails}>
                  <p className={styles.suburb}>{location.suburb}</p>
                  <h3>{location.name}</h3>
                  <p>{location.address}</p>
                  {demo.closedLocations.includes(location.id) ? (
                    <p className={styles.locationStatus}>Online booking paused</p>
                  ) : (
                    <Link href={`/booking?location=${location.id}`} className={styles.locationLink} aria-label={`Book at ${location.name}`}>
                      Book here <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
