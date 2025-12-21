'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef } from 'react';

export default function Home() {
  const isScrolling = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const scrollToNext = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isScrolling.current) return;

      const sections = [
        document.querySelector('header'),
        document.getElementById('philosophy'),
        document.getElementById('designers'),
        document.getElementById('services'),
        document.getElementById('gallery'),
        document.getElementById('contact'),
      ].filter(Boolean) as HTMLElement[];

      const currentScroll = window.scrollY + window.innerHeight / 2;
      let currentSectionIndex = -1;

      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        const sectionTop = rect.top + window.scrollY;
        const sectionBottom = sectionTop + rect.height;

        if (currentScroll >= sectionTop && currentScroll < sectionBottom) {
          currentSectionIndex = index;
        }
      });

      if (currentSectionIndex === -1) {
        // Find closest section
        sections.forEach((section, index) => {
          const rect = section.getBoundingClientRect();
          const sectionTop = rect.top + window.scrollY;
          if (window.scrollY < sectionTop && currentSectionIndex === -1) {
            currentSectionIndex = index;
          }
        });
        if (currentSectionIndex === -1) currentSectionIndex = 0;
      }

      const deltaY = e.deltaY;
      let nextSectionIndex = currentSectionIndex;

      if (deltaY > 0 && currentSectionIndex < sections.length - 1) {
        // Scrolling down
        nextSectionIndex = currentSectionIndex + 1;
      } else if (deltaY < 0 && currentSectionIndex > 0) {
        // Scrolling up
        nextSectionIndex = currentSectionIndex - 1;
      } else {
        return; // Already at top or bottom
      }

      if (nextSectionIndex !== currentSectionIndex) {
        e.preventDefault();
        isScrolling.current = true;

        const nextSection = sections[nextSectionIndex];
        if (nextSection) {
          nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        if (scrollTimeout.current) {
          clearTimeout(scrollTimeout.current);
        }

        scrollTimeout.current = setTimeout(() => {
          isScrolling.current = false;
        }, 1000);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  return (
    <main className="bg-white text-primary font-sans antialiased selection:bg-black selection:text-white">
      {/* Hero section */}
      <header className="relative min-h-screen flex items-center justify-center overflow-hidden snap-start snap-always">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/30 z-10" />
          <img
            alt="Salon Interior"
            className="w-full h-full object-cover filter grayscale"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAjezB-u2p4uPWbCMa53RhgxLNLmo3KtUz-UcrgIT6sYsrWp2D5SzQHDBrHfSg4CYauze_yotUncpnjIQgbi4BKKJEWdxh0ER9x_RgO2s8edgCS60VqaBFFrQq3qlXkt2M27cSt4Ia6qGN9JjSVQ-jl4fye9U8C7gQ7G7I5Q3xSyUXoPVD8e45Nu_vjWYWlKsFYQm4uwk15UB7W6BXVjOi9n7ONHb8M9G8Xu4PoNR0ctCoWJsrQTQxjbVXfNL4K4Fr7RUfripjUmBMf"
          />
        </div>
        <div className="relative z-20 container mx-auto px-6 text-center text-white mt-12">
          <span className="inline-block py-1 px-3 border border-white/30 rounded-full text-[10px] md:text-xs font-bold tracking-[0.2em] mb-8 uppercase backdrop-blur-sm">
            Sydney Based
          </span>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-semibold tracking-tighter mb-8 leading-[0.9] drop-shadow-2xl">
            DEFINE
            <br />
            YOUR VIBE
          </h1>
          <p className="text-lg md:text-xl font-light text-gray-100 max-w-xl mx-auto mb-12 leading-relaxed opacity-90">
            Where minimalism meets artistry. Experience the finest hair styling in a space curated for your comfort.
          </p>
          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <Link href="/booking">
              <button className="w-full sm:w-auto bg-white text-black px-10 py-4 rounded-full font-bold text-sm tracking-widest uppercase hover:bg-gray-100 transition-all transform hover:-translate-y-1 shadow-lg">
                Book Appointment
              </button>
            </Link>
            <button className="w-full sm:w-auto text-white border border-white/40 px-10 py-4 rounded-full font-medium text-sm tracking-widest uppercase hover:bg-white/10 backdrop-blur-sm transition-all hover:border-white">
              View Gallery
            </button>
          </div>
        </div>
        <button
          onClick={() => scrollToNext('philosophy')}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 animate-bounce cursor-pointer hover:text-white transition-colors z-30"
          aria-label="Scroll to next section"
        >
          <span className="material-symbols-outlined text-3xl font-light">keyboard_arrow_down</span>
        </button>
      </header>

      {/* Philosophy section */}
      <section id="philosophy" className="relative py-32 bg-white snap-start snap-always min-h-screen flex items-center justify-center">
        <div className="container mx-auto px-6 md:px-12 w-full">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-[0.3em] mb-8 block">
              The Philosophy
            </span>
            <h2 className="text-3xl md:text-5xl font-light leading-tight text-black mb-12">
              &quot;We believe hair is the ultimate form of self-expression. Our digital storefront reflects our
              physical space:{' '}
              <span className="font-medium italic">
                minimalist, chic, and intentionally curated.
              </span>
              &quot;
            </h2>
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-black to-transparent mx-auto opacity-20" />
          </div>
        </div>
        <button
          onClick={() => scrollToNext('designers')}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-gray-400 animate-bounce cursor-pointer hover:text-black transition-colors z-30"
          aria-label="Scroll to next section"
        >
          <span className="material-symbols-outlined text-3xl font-light">keyboard_arrow_down</span>
        </button>
      </section>

      {/* Designers section */}
      <section className="relative py-32 bg-surface overflow-hidden snap-start snap-always min-h-screen" id="designers">
        <div className="container mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <div className="relative">
              <h2 className="text-6xl md:text-9xl font-bold tracking-tighter text-gray-100 absolute -top-10 md:-top-20 -left-6 md:-left-12 pointer-events-none select-none z-0">
                ARTISTS
              </h2>
              <div className="relative z-10">
                <h2 className="text-4xl font-bold tracking-tight text-black mt-2">Our Designers</h2>
                <p className="text-gray-500 mt-2 font-light">Curated stylists for your unique look.</p>
              </div>
            </div>
            <a className="group flex items-center gap-2 text-sm font-bold border-b border-black pb-1 hover:text-gray-600 hover:border-gray-600 transition-colors" href="#">
              View All Artists
              <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {/* Designer 1 */}
            <div className="group cursor-pointer">
              <div className="relative aspect-[4/5] overflow-hidden bg-gray-200 mb-6 rounded-sm">
                <img
                  alt="Sarah Kim"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter grayscale group-hover:grayscale-0"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCCHnglU0nuikH7nZzU6MAdfR-LghoREb1bwCnLTpnez1AMmtgxzpKotGIXTs85ozXMKDE9LMvWt_8QwdDs1nIJ7pU3_CEHxfjjWYfNsnvwtHDGOt-DeqNAGwb7aiYIAB5i0e5EmVHxFakOIHEyoQGyVu-Si5t151n19BVIk9_8mcbx44nULvDrzBU2qaSHmG4a_6ksV8ThpXIcsj2YKti2w2dIATANoVE0ySSf3lHYN3PzfNu7aJnG0j8mXhWPvO0ScyzDFSMz0ZOI"
                />
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-4 py-2 text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0 shadow-lg">
                  Book Sarah
                </div>
              </div>
              <div className="flex justify-between items-baseline mb-5 px-1">
                <div>
                  <h3 className="text-xl font-bold">Sarah Kim</h3>
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Director</span>
                </div>
                <span className="text-sm font-medium hover:underline text-gray-400 hover:text-black transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">alternate_email</span>
                  sarah.haeyoom
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                <img
                  className="aspect-square object-cover bg-gray-100 grayscale-[20%] hover:grayscale-0 transition-all hover:scale-105 duration-300 rounded-sm"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjr9qDAIMtSRztubaoEBkjgiyH5DwvL9LsETlYzIroQXoqVAa9uOCN8rCe7ck7ncx2MLP_MFMUdAfhpxDrC8g9_6dzjGlUPl6W488DuahMGY0FDaFSJLYwy8QAJMIaOyBZipKfr4U_GO6WhwZyOjgIFSU6x20lwuo-RhSrdXnI-q4R_91e7SEwX6XF0jkFPthNJap5bz138HJ7qGGAdZc43HQ5AULqAckGhI03TckTfT_GvAN2OvBOqW0Bh0GIXStzuAaLZ2Vnbh4a"
                  alt="Sarah work 1"
                />
                <img
                  className="aspect-square object-cover bg-gray-100 grayscale-[20%] hover:grayscale-0 transition-all hover:scale-105 duration-300 rounded-sm"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuALsJzhBJmiwXO2dGwaHrnJSu2L-gv2AHA6B_JBRJJjBSYTeXYYo6TpGWLBDZdwlDJxrP7vR4jCKeRglbWmSqv2dcuiGumxVF-wq0ZMwzksO8Wub74AuGh3qNsD9E7zPTT818FxcFRv6-flwwhnswKTS7Z9k-Zqq8J3Q1YV6n7O8Mb2yY-GvdlagHz7WstJUrE-v3siurVxNflDC-d5HiRKB31A6BQwQQqkZGbDqwuM0TEnnqCGmrnqxcK0ZWem13mpbFsHcO_YYXSp"
                  alt="Sarah work 2"
                />
                <img
                  className="aspect-square object-cover bg-gray-100 grayscale-[20%] hover:grayscale-0 transition-all hover:scale-105 duration-300 rounded-sm"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDix8rhpYoZUvbAbCqdeSqklPBPBkj36f9MxygcATQ7A8ohrR_dwy0jcerIX31Cllu8LaL0Aa46qavJc8VabP6ulQWJBgQi4uOS6QjYT35Eda9_z_rOLVBGAYMOebPiK_L_eBJRMCeyK-RqFtZqM1zCvxx2CWKcOFAJWv-wBEB8zt13ZcwKHvsAO8zKMpNWDiZzk-viXkhs68ctjVbHGeFTgVcD3HUrNe4rxdA8kqj7l5hvtTvAlBjNu2fOeMJ4-OAWtwmugPCJ2R_8"
                  alt="Sarah work 3"
                />
              </div>
            </div>

            {/* Designer 2 */}
            <div className="group cursor-pointer">
              <div className="relative aspect-[4/5] overflow-hidden bg-gray-200 mb-6 rounded-sm">
                <img
                  alt="Minji Lee"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter grayscale group-hover:grayscale-0"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwZk888ou1oM0H0DaBwzXvYWJqGHPP2gNeyiZ55T16jfgB371KpL0f1n_H7jBiQSmZCzETwqGsrweB7wkYpqGIczhcURU8PB3k6E-7gHKpBP3-5LW7gKnbtisOoX30MCQI-fes0w3KjQGhxyjoPUEdg_eIucc4YKXblxsDDjwwaAfYPlQ8o9y9cJMwxZ9TC6YCG7yuxk0XQ8Rfe5fPPnaBKmojxzMpMBADkqCx487GWvFpiGd5U3S2Fk0xIrfJZD8QD4HS6a8FblD1"
                />
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-4 py-2 text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0 shadow-lg">
                  Book Minji
                </div>
              </div>
              <div className="flex justify-between items-baseline mb-5 px-1">
                <div>
                  <h3 className="text-xl font-bold">Minji Lee</h3>
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    Senior Stylist
                  </span>
                </div>
                <span className="text-sm font-medium hover:underline text-gray-400 hover:text-black transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">alternate_email</span>
                  minji_cuts
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                <img
                  className="aspect-square object-cover bg-gray-100 grayscale-[20%] hover:grayscale-0 transition-all hover:scale-105 duration-300 rounded-sm"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC05IZ_PqeCbKEC0Fjky3hQs-SETJvWHS1YQAr5uvRaitmWNrrxwIuoxY_5X0CmjLWc0OqU-A3JduyBvvZQIvm0tY5n67caDewmH065a4mhqwJPufl6TiPiyEa46ttmxWJ3gYuAB5Byv21ZWAiHNCyNWeb-shjWpqRgnOW5JiBcEj5kqnzDQriU7GCGHSrDtny66b-hSna05PtH_6S-DCWJbgNIiMffjcisEltWkLtv_mqFS6lg38aJKnl-UhFLVeaT9RMobu6dq8f"
                  alt="Minji work 1"
                />
                <img
                  className="aspect-square object-cover bg-gray-100 grayscale-[20%] hover:grayscale-0 transition-all hover:scale-105 duration-300 rounded-sm"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDu6jer3z88Wg_He9yb8qrmF1e6fvl0DjEYIDtJ5JF9gKhDnloOO4rWOz7JQowXtilp9ArQlMC8z4GsFKRxUMDAE5i4dFhvJRsRcCF5-0qyxa2GiyxSuRGrI8SPY0URZQHMqsPbRGsk6E-0PeQgHRIQOtFbWLNHaPLzK92a5QnjrEigmchl4QRkFRT19C1j4I7CDM-7RZkjeSjKeH_NxOrks0whUyXcB8AafvOh15YMikNKVK4TnJnRzf3VhJixtPnAuUX3dhcC8eyH"
                  alt="Minji work 2"
                />
                <img
                  className="aspect-square object-cover bg-gray-100 grayscale-[20%] hover:grayscale-0 transition-all hover:scale-105 duration-300 rounded-sm"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjr9qDAIMtSRztubaoEBkjgiyH5DwvL9LsETlYzIroQXoqVAa9uOCN8rCe7ck7ncx2MLP_MFMUdAfhpxDrC8g9_6dzjGlUPl6W488DuahMGY0FDaFSJLYwy8QAJMIaOyBZipKfr4U_GO6WhwZyOjgIFSU6x20lwuo-RhSrdXnI-q4R_91e7SEwX6XF0jkFPthNJap5bz138HJ7qGGAdZc43HQ5AULqAckGhI03TckTfT_GvAN2OvBOqW0Bh0GIXStzuAaLZ2Vnbh4a"
                  alt="Minji work 3"
                />
              </div>
            </div>

            {/* Designer 3 */}
            <div className="group cursor-pointer">
              <div className="relative aspect-[4/5] overflow-hidden bg-gray-200 mb-6 rounded-sm">
                <img
                  alt="James Park"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter grayscale group-hover:grayscale-0"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCXfJX8qeoTMXiWXUnIDVeg5XYnm5J8X4lHjRGU-AjvfpHeDBSPXYu57LI-NQjfXADMKlWcJPKknl951jZZOXiihHN8gJUuEyQqBVJhmEnt2ifzP7jGLUE-m3GmZjtKVAgVpK6Zov6V27dY68aGoaq2nrpNJACg9PLQuqwByiSbAodFg9nd712c7lk1BND_Vvsueg1pHV0NxzjlZV-Q7le2oIRQBXkwrELjKt0ovc9L52AMY5FAXT9iUU06g3MlYqXp0JA-mbFtWurP"
                />
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-4 py-2 text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0 shadow-lg">
                  Book James
                </div>
              </div>
              <div className="flex justify-between items-baseline mb-5 px-1">
                <div>
                  <h3 className="text-xl font-bold">James Park</h3>
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Top Stylist</span>
                </div>
                <span className="text-sm font-medium hover:underline text-gray-400 hover:text-black transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">alternate_email</span>
                  james.hair
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                <img
                  className="aspect-square object-cover bg-gray-100 grayscale-[20%] hover:grayscale-0 transition-all hover:scale-105 duration-300 rounded-sm"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuClG0Yr21p0wOTy0jYwdA8nULMNKZAxwlue2H3Ms75eXA-N2C5_1iw9h1gJ6YTx7FsZLK9IhDSSsT_9zhcA3ICmMlRSmaZowXJPrDo-YkJvb8A9AWuoBGmY3eX3vXAuDkLO2zocokHjcteMpUt4Cgi0J3ar5Hd6qA1xq8GkKwydZ3RsK83pXPO2rTsOMRxv1nCHjtX8LL-RG7WpTIKae79gNdmMXyATQ0RvmCtVkW-md4uDTajrkaqH1OAQnvFrJdc-UtTMB9Cox6AP"
                  alt="James work 1"
                />
                <img
                  className="aspect-square object-cover bg-gray-100 grayscale-[20%] hover:grayscale-0 transition-all hover:scale-105 duration-300 rounded-sm"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuALsJzhBJmiwXO2dGwaHrnJSu2L-gv2AHA6B_JBRJJjBSYTeXYYo6TpGWLBDZdwlDJxrP7vR4jCKeRglbWmSqv2dcuiGumxVF-wq0ZMwzksO8Wub74AuGh3qNsD9E7zPTT818FxcFRv6-flwwhnswKTS7Z9k-Zqq8J3Q1YV6n7O8Mb2yY-GvdlagHz7WstJUrE-v3siurVxNflDC-d5HiRKB31A6BQwQQqkZGbDqwuM0TEnnqCGmrnqxcK0ZWem13mpbFsHcO_YYXSp"
                  alt="James work 2"
                />
                <img
                  className="aspect-square object-cover bg-gray-100 grayscale-[20%] hover:grayscale-0 transition-all hover:scale-105 duration-300 rounded-sm"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC05IZ_PqeCbKEC0Fjky3hQs-SETJvWHS1YQAr5uvRaitmWNrrxwIuoxY_5X0CmjLWc0OqU-A3JduyBvvZQIvm0tY5n67caDewmH065a4mhqwJPufl6TiPiyEa46ttmxWJ3gYuAB5Byv21ZWAiHNCyNWeb-shjWpqRgnOW5JiBcEj5kqnzDQriU7GCGHSrDtny66b-hSna05PtH_6S-DCWJbgNIiMffjcisEltWkLtv_mqFS6lg38aJKnl-UhFLVeaT9RMobu6dq8f"
                  alt="James work 3"
                />
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => scrollToNext('services')}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-gray-400 animate-bounce cursor-pointer hover:text-black transition-colors z-30"
          aria-label="Scroll to next section"
        >
          <span className="material-symbols-outlined text-3xl font-light">keyboard_arrow_down</span>
        </button>
      </section>

      {/* Service menu */}
      <section className="relative py-32 bg-white border-t border-gray-100 snap-start snap-always min-h-screen" id="services">
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-4 sticky top-32 h-fit">
              <h2 className="text-5xl md:text-6xl font-bold tracking-tighter mb-6">
                Service
                <br />
                Menu
              </h2>
              <div className="w-12 h-1 bg-black mb-8" />
              <p className="text-gray-500 mb-8 font-light leading-relaxed text-lg">
                Precision cuts, bespoke colors, and restorative treatments tailored to your hair&apos;s unique texture
                and your personal style.
              </p>
              <button className="hidden lg:flex items-center gap-3 text-sm font-bold uppercase tracking-widest border-b border-black pb-2 hover:gap-5 transition-all">
                Download Full Menu <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-20">
              <div>
                <h3 className="text-lg font-bold uppercase tracking-widest border-b border-gray-200 pb-4 mb-6 text-gray-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-black rounded-full" /> 01. Cut &amp; Style
                </h3>
                <ul className="space-y-6">
                  <li className="group flex justify-between items-baseline">
                    <span className="text-lg font-medium group-hover:translate-x-2 transition-transform duration-300">
                      Women&apos;s Design Cut
                    </span>
                    <span className="font-medium text-gray-500">$85+</span>
                  </li>
                  <li className="group flex justify-between items-baseline">
                    <span className="text-lg font-medium group-hover:translate-x-2 transition-transform duration-300">
                      Men&apos;s Design Cut
                    </span>
                    <span className="font-medium text-gray-500">$65+</span>
                  </li>
                  <li className="group flex justify-between items-baseline">
                    <span className="text-lg font-medium group-hover:translate-x-2 transition-transform duration-300">
                      Fringe Trim
                    </span>
                    <span className="font-medium text-gray-500">$20</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-bold uppercase tracking-widest border-b border-gray-200 pb-4 mb-6 text-gray-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full" /> 02. Color
                </h3>
                <ul className="space-y-6">
                  <li className="group flex justify-between items-baseline">
                    <span className="text-lg font-medium group-hover:translate-x-2 transition-transform duration-300">
                      Root Touch Up
                    </span>
                    <span className="font-medium text-gray-500">$110+</span>
                  </li>
                  <li className="group flex justify-between items-baseline">
                    <span className="text-lg font-medium group-hover:translate-x-2 transition-transform duration-300">
                      Full Colour
                    </span>
                    <span className="font-medium text-gray-500">$150+</span>
                  </li>
                  <li className="group flex justify-between items-baseline">
                    <span className="text-lg font-medium group-hover:translate-x-2 transition-transform duration-300">
                      Balayage / Ombre
                    </span>
                    <span className="font-medium text-gray-500">$280+</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-bold uppercase tracking-widest border-b border-gray-200 pb-4 mb-6 text-gray-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-600 rounded-full" /> 03. Perm
                </h3>
                <ul className="space-y-6">
                  <li className="group flex justify-between items-baseline">
                    <span className="text-lg font-medium group-hover:translate-x-2 transition-transform duration-300">
                      Digital Perm
                    </span>
                    <span className="font-medium text-gray-500">$250+</span>
                  </li>
                  <li className="group flex justify-between items-baseline">
                    <span className="text-lg font-medium group-hover:translate-x-2 transition-transform duration-300">
                      Down Perm
                    </span>
                    <span className="font-medium text-gray-500">$50+</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-bold uppercase tracking-widest border-b border-gray-200 pb-4 mb-6 text-gray-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-800 rounded-full" /> 04. Care
                </h3>
                <ul className="space-y-6">
                  <li className="group flex justify-between items-baseline">
                    <span className="text-lg font-medium group-hover:translate-x-2 transition-transform duration-300">
                      Scalp Treatment
                    </span>
                    <span className="font-medium text-gray-500">$90</span>
                  </li>
                  <li className="group flex justify-between items-baseline">
                    <span className="text-lg font-medium group-hover:translate-x-2 transition-transform duration-300">
                      Hair Botox
                    </span>
                    <span className="font-medium text-gray-500">$200+</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-20 text-center lg:hidden">
            <button className="bg-black text-white px-8 py-3 rounded-full text-sm font-bold uppercase tracking-widest shadow-lg">
              View Full Menu
            </button>
          </div>
        </div>
        <button
          onClick={() => scrollToNext('gallery')}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-gray-400 animate-bounce cursor-pointer hover:text-black transition-colors z-30"
          aria-label="Scroll to next section"
        >
          <span className="material-symbols-outlined text-3xl font-light">keyboard_arrow_down</span>
        </button>
      </section>

      {/* Gallery */}
      <section className="relative py-24 bg-gray-50 border-t border-gray-100 snap-start snap-always min-h-screen" id="gallery">
        <div className="container mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <span className="material-symbols-outlined text-4xl mb-4 text-gray-400">grid_on</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">#HaeyoomSydney</h2>
            <p className="text-gray-500 font-light text-lg">
              Follow our journey{' '}
              <a
                className="text-black font-semibold underline decoration-1 underline-offset-4 hover:text-gray-600"
                href="#"
              >
                @haeyoom_sydney
              </a>
            </p>
          </div>

          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 mx-auto max-w-[1400px]">
            {[
              'AB6AXuDjr9qDAIMtSRztubaoEBkjgiyH5DwvL9LsETlYzIroQXoqVAa9uOCN8rCe7ck7ncx2MLP_MFMUdAfhpxDrC8g9_6dzjGlUPl6W488DuahMGY0FDaFSJLYwy8QAJMIaOyBZipKfr4U_GO6WhwZyOjgIFSU6x20lwuo-RhSrdXnI-q4R_91e7SEwX6XF0jkFPthNJap5bz138HJ7qGGAdZc43HQ5AULqAckGhI03TckTfT_GvAN2OvBOqW0Bh0GIXStzuAaLZ2Vnbh4a',
              'AB6AXuC05IZ_PqeCbKEC0Fjky3hQs-SETJvWHS1YQAr5uvRaitmWNrrxwIuoxY_5X0CmjLWc0OqU-A3JduyBvvZQIvm0tY5n67caDewmH065a4mhqwJPufl6TiPiyEa46ttmxWJ3gYuAB5Byv21ZWAiHNCyNWeb-shjWpqRgnOW5JiBcEj5kqnzDQriU7GCGHSrDtny66b-hSna05PtH_6S-DCWJbgNIiMffjcisEltWkLtv_mqFS6lg38aJKnl-UhFLVeaT9RMobu6dq8f',
              'AB6AXuDu6jer3z88Wg_He9yb8qrmF1e6fvl0DjEYIDtJ5JF9gKhDnloOO4rWOz7JQowXtilp9ArQlMC8z4GsFKRxUMDAE5i4dFhvJRsRcCF5-0qyxa2GiyxSuRGrI8SPY0URZQHMqsPbRGsk6E-0PeQgHRIQOtFbWLNHaPLzK92a5QnjrEigmchl4QRkFRT19C1j4I7CDM-7RZkjeSjKeH_NxOrks0whUyXcB8AafvOh15YMikNKVK4TnJnRzf3VhJixtPnAuUX3dhcC8eyH',
              'AB6AXuClG0Yr21p0wOTy0jYwdA8nULMNKZAxwlue2H3Ms75eXA-N2C5_1iw9h1gJ6YTx7FsZLK9IhDSSsT_9zhcA3ICmMlRSmaZowXJPrDo-YkJvb8A9AWuoBGmY3eX3vXAuDkLO2zocokHjcteMpUt4Cgi0J3ar5Hd6qA1xq8GkKwydZ3RsK83pXPO2rTsOMRxv1nCHjtX8LL-RG7WpTIKae79gNdmMXyATQ0RvmCtVkW-md4uDTajrkaqH1OAQnvFrJdc-UtTMB9Cox6AP',
              'AB6AXuALsJzhBJmiwXO2dGwaHrnJSu2L-gv2AHA6B_JBRJJjBSYTeXYYo6TpGWLBDZdwlDJxrP7vR4jCKeRglbWmSqv2dcuiGumxVF-wq0ZMwzksO8Wub74AuGh3qNsD9E7zPTT818FxcFRv6-flwwhnswKTS7Z9k-Zqq8J3Q1YV6n7O8Mb2yY-GvdlagHz7WstJUrE-v3siurVxNflDC-d5HiRKB31A6BQwQQqkZGbDqwuM0TEnnqCGmrnqxcK0ZWem13mpbFsHcO_YYXSp',
              'AB6AXuDix8rhpYoZUvbAbCqdeSqklPBPBkj36f9MxygcATQ7A8ohrR_dwy0jcerIX31Cllu8LaL0Aa46qavJc8VabP6ulQWJBgQi4uOS6QjYT35Eda9_z_rOLVBGAYMOebPiK_L_eBJRMCeyK-RqFtZqM1zCvxx2CWKcOFAJWv-wBEB8zt13ZcwKHvsAO8zKMpNWDiZzk-viXkhs68ctjVbHGeFTgVcD3HUrNe4rxdA8kqj7l5hvtTvAlBjNu2fOeMJ4-OAWtwmugPCJ2R_8'
            ].map((id) => (
              <div key={id} className="break-inside-avoid group relative overflow-hidden cursor-pointer">
                <img
                  alt="Gallery"
                  className="w-full h-auto grayscale-[30%] hover:grayscale-0 transition duration-700 hover:scale-105"
                  src={`https://lh3.googleusercontent.com/aida-public/${id}`}
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-3xl">favorite</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => scrollToNext('contact')}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-gray-400 animate-bounce cursor-pointer hover:text-black transition-colors z-30"
          aria-label="Scroll to next section"
        >
          <span className="material-symbols-outlined text-3xl font-light">keyboard_arrow_down</span>
        </button>
      </section>

      {/* Location + contact */}
      <section id="contact" className="flex flex-col md:flex-row min-h-[500px] snap-start snap-always">
        <div className="w-full md:w-1/2 bg-gray-100 relative min-h-[300px]">
          <img
            alt="Map"
            className="w-full h-full object-cover filter grayscale opacity-60"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDYaRkwyYRovJfwo4ZVEYdIYJz1NOlszpt6xp7gn0k5ubVY6thNOmqcX8V6Wbu7aakpYyL_iK2bHzm6HcGP7--zsRK0GHfcTv2QKFE_Ed-HIAGqZ_zWIgQYoKBU3qAA0qHca4GpyAtf9Tc6iUKfFr1H6ZS2Ovm7gc-ddf4TVXwS7lLtDeXXKbFY0cYZ1ijy2SYHLuKzyoEPBAJ4g9vd6reU5tPv8OXWkbmNP0SH7PqQLkQ-MjaFHHJfRh2Niu9X7ne5tknwRctsPHmu"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/95 p-8 shadow-2xl backdrop-blur-md pointer-events-auto transition-transform hover:scale-105 cursor-pointer rounded-xl border border-white/50">
              <div className="flex items-center justify-center gap-2 mb-2 text-black">
                <span className="material-symbols-outlined text-3xl">location_on</span>
              </div>
              <div className="text-center">
                <h3 className="font-bold text-lg mb-1">Find Us</h3>
                <p className="text-sm text-gray-500">123 George St, Sydney</p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/2 bg-primary text-white p-12 md:p-20 flex flex-col justify-center">
          <h2 className="text-3xl font-bold mb-12 tracking-tight">Visit &amp; Contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-12 mb-16">
            <div>
              <h4 className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-4">Address</h4>
              <p className="text-lg leading-relaxed font-light text-gray-200">
                Level 1, 123 George Street,
                <br />
                Sydney NSW 2000
              </p>
            </div>
            <div>
              <h4 className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-4">Contact</h4>
              <p className="text-lg leading-relaxed font-light text-gray-200 hover:text-white transition-colors cursor-pointer block mb-1">
                (02) 1234 5678
              </p>
              <p className="text-lg leading-relaxed font-light text-gray-200 hover:text-white transition-colors cursor-pointer block">
                hello@haeyoom.com.au
              </p>
            </div>
            <div className="sm:col-span-2">
              <h4 className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-4">Hours</h4>
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-16">
                <div className="text-lg font-light text-gray-200">
                  <span className="block text-gray-500 text-xs font-bold uppercase mb-2">Mon - Fri</span>
                  10:00 am - 08:00 pm
                </div>
                <div className="text-lg font-light text-gray-200">
                  <span className="block text-gray-500 text-xs font-bold uppercase mb-2">Sat - Sun</span>
                  10:00 am - 06:00 pm
                </div>
              </div>
            </div>
          </div>
          <Link href="/booking">
            <button className="self-start bg-white text-black px-12 py-5 rounded-full font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1">
              Book Your Visit
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-gray-100 text-center md:text-left">
        <div className="container mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400 font-medium">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <span className="material-symbols-outlined text-lg">content_cut</span>
            <span className="font-bold text-gray-900 text-sm tracking-tight">HAEYOOM.</span>
          </div>
          <div className="flex flex-wrap justify-center gap-8 mb-6 md:mb-0">
            <a className="hover:text-black transition-colors" href="#">
              Privacy Policy
            </a>
            <a className="hover:text-black transition-colors" href="#">
              Terms of Service
            </a>
            <a className="hover:text-black transition-colors" href="#">
              Instagram
            </a>
          </div>
          <p>© 2024 Haeyoom Sydney. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
