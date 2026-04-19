'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

// Comment: Mock data for shops
const SHOPS = [
  {
    id: 'shop_meadowbank',
    name: 'HAEYOOM Meadowbank',
    address: 'SHEPHERDS BAY PLAZA, Level LG, SHOP 6.11/11A Bay Dr, Meadowbank NSW 2114',
    image: 'https://i.pinimg.com/1200x/24/78/0d/24780ddba9bd63fc622543639c163940.jpg',
    googleMapLink: 'https://maps.app.goo.gl/bBgziGMSs97zmAV38',
  },
  {
    id: 'shop_haymarket',
    name: 'HAEYOOM Haymarket',
    address: 'Shop4, 770 George St, Sydney NSW 2000',
    image: 'https://i.pinimg.com/1200x/10/48/a2/1048a22becabf97a20d9cab8c2f9a2e6.jpg',
    googleMapLink: 'https://maps.app.goo.gl/zKKP5E6WnwyoJhUn9',
  },
];

// Comment: Minimal type for home page designers fetched from /api/designers
interface HomeDesigner {
  id: number;
  name: string;
  english_name: string | null;
  role: string;
  shop_id: number | null;
  instagramLink?: string | null;
}

const Home = () => {
  const [selectedShop, setSelectedShop] = useState<number | 'all'>('all');
  const [designers, setDesigners] = useState<HomeDesigner[]>([]);
  const [designerShops, setDesignerShops] = useState<{ id: number; name: string }[]>([]);

  // Comment: Keyboard shortcut for hidden login access (Ctrl+Shift+L)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Comment: Ctrl+Shift+L to access login page
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        window.location.href = '/admin/login';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Comment: Load designers & shops via API routes (server uses real Supabase env)
  useEffect(() => {
    async function fetchDesignersAndShops() {
      try {
        const [designersRes, shopsRes] = await Promise.all([
          fetch('/api/designers'),
          fetch('/api/shops'),
        ]);

        if (!designersRes.ok) {
          throw new Error('Failed to fetch designers');
        }
        if (!shopsRes.ok) {
          throw new Error('Failed to fetch shops');
        }

        const designersJson = await designersRes.json();
        const shopsJson = await shopsRes.json();

        const apiDesigners: HomeDesigner[] = (designersJson.designers || []) as HomeDesigner[];
        const apiShops: { id: number; name: string }[] = (shopsJson.shops || []).map(
          (shop: any) => ({
            id: shop.id,
            name: shop.name || `HAEYOOM ${shop.location || 'Shop'}`,
          })
        );

        const roleRank = (role: string | null | undefined) => {
          const r = (role || '').toUpperCase();
          if (r.includes('DIRECTOR')) return 0;
          if (r.includes('MANAGER')) return 1;
          if (r.includes('DESIGNER')) return 2;
          return 3;
        };

        // Comment: Ensure designers are ordered by role then name
        const orderedDesigners = apiDesigners.slice().sort((a, b) => {
          const ra = roleRank(a.role);
          const rb = roleRank(b.role);
          if (ra !== rb) return ra - rb;
          return (a.name || '').localeCompare(b.name || '');
        });

        setDesigners(orderedDesigners);
        setDesignerShops(apiShops);
      } catch (error) {
        // Comment: Log error for debugging, but keep page rendering
        console.error('Error loading designers for home page:', error);
      }
    }

    fetchDesignersAndShops();
  }, []);

  const filteredDesigners =
    selectedShop === 'all'
      ? designers
      : designers.filter((d) => d.shop_id === selectedShop);

  return (
    <div className="w-full bg-[#F4F4F4] text-black">
      
      {/* HERO SECTION: Single Large Image - full coverage so no white gap when zoomed out */}
      <section className="relative w-full min-h-dvh overflow-hidden border-b border-black bg-[#2a2a2a]">
        <img 
            src="/images/hero.png" 
            className="absolute inset-0 w-full h-full object-cover object-top grayscale min-w-full min-h-full" 
            alt="Hero" 
        />
        
        {/* LOGO OVERLAY: Logo Image */}
        {/* Positioned at bottom with some spacing */}
        <div className="absolute bottom-4 md:bottom-16 left-0 w-full px-6 md:px-12 z-20 pointer-events-none">
            <Image 
                src="/images/logo-black.png" 
                alt="HAEYOOM" 
                width={2400} 
                height={2400}
                className="w-full h-auto"
                priority
            />
        </div>
      </section>

      {/* SPLIT HEADER: BOOK / NOW */}
      <section className="border-b border-black bg-[#F4F4F4]">
        {/* Adjusted padding to px-6 md:px-12 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-4 px-6 md:px-12 py-12 md:py-20 overflow-hidden">
            <h2 className="font-display font-normal text-6xl md:text-8xl uppercase tracking-tighter">Book</h2>
            <Link href="/booking" className="w-full md:w-auto text-center text-sm md:text-base font-normal uppercase tracking-[0.18em] border border-black px-6 md:px-8 py-3 text-black hover:bg-black hover:text-white transition-colors whitespace-normal md:whitespace-nowrap break-words">
                Book Appointment <ArrowRight size={14} className="inline ml-1" />
            </Link>
            <h2 className="hidden md:block font-display font-normal text-6xl md:text-8xl uppercase tracking-tighter text-left md:text-right self-end md:self-auto">Now</h2>
        </div>
      </section>

      {/* BIG STATEMENT TEXT */}
      <section id="about" className="py-32 px-6 md:px-12 bg-[#F4F4F4] overflow-hidden">
        <div className="w-full">
             <h3 className="font-display font-normal text-6xl md:text-8xl leading-[0.9] uppercase tracking-tighter mb-12 text-black">
                HAEYOOM originated from a pure Korean word that means "beautiful thoughts."
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-black pt-8">
                <p className="text-base md:text-lg font-normal leading-relaxed max-w-lg text-black">
                    We create moments whee beautiful thoughts bloom, in beautiful spaces, with beautiful people. Beautiful Think-we hope it becomes a lasting echo in your heart.
                </p>
                <div className="text-right flex flex-col items-end gap-4">
            </div>
          </div>
        </div>
      </section>

      {/* Services section intentionally removed.
          Future plan: open a popup menu board with uploaded images. */}

      {/* SPACE / LOCATIONS STRIP */}
      <section id="locations" className="border-t border-black">
          {SHOPS.map((shop, idx) => (
             <div key={shop.id} className={`grid grid-cols-1 md:grid-cols-12 ${idx !== SHOPS.length - 1 ? 'border-b border-black' : ''}`}>
                 <div className="md:col-span-8 border-b md:border-b-0 md:border-r border-black relative min-h-[50vh]">
                     {/* Added absolute inset-0 to make image strictly fill the container height */}
                     <img 
                        src={shop.image} 
                        className="absolute inset-0 w-full h-full object-cover grayscale" 
                        alt={shop.name} 
                     />
            </div>
                 <div className="md:col-span-4 p-8 md:p-12 flex flex-col justify-between bg-[#F4F4F4]">
              <div>
                        <span className="block text-xs uppercase tracking-widest mb-4">Location 0{idx + 1}</span>
                        
                        <h4 className="font-display font-normal text-2xl md:text-3xl uppercase tracking-tighter leading-none mb-6">
                            <span className="block mb-2">HAEYOOM</span>
                            {shop.name.replace('HAEYOOM ', '')}
                        </h4>
                        
                        <p className="text-base leading-relaxed text-black">
                           {shop.address}
                        </p>
              </div>
                     <a 
                        href={shop.googleMapLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="self-start mt-8 border border-black px-8 py-4 text-xs uppercase tracking-widest text-black hover:bg-black hover:text-white transition-colors"
                     >
                        View on Map
                     </a>
              </div>
            </div>
          ))}
      </section>

      <section id="designers" className="border-t border-black bg-[#F4F4F4]">
        <div className="w-full">
          <div className="px-6 md:px-12 pt-12 md:pt-24 pb-12 md:pb-24">
            <h4 className="font-display font-normal text-6xl md:text-8xl uppercase tracking-tighter mb-6 md:mb-9 text-left text-black">Designers</h4>
            <div className="flex gap-4 mb-2 md:mb-4 shrink-0">
                  <button 
                      onClick={() => setSelectedShop('all')}
                      className={`px-4 py-2 text-xs uppercase font-normal tracking-widest border border-black ${selectedShop === 'all' ? 'bg-black text-white' : 'text-black hover:bg-black hover:text-white'}`}
                  >
                      All
                  </button>
                  {designerShops.map((shop) => (
                      <button 
                          key={shop.id}
                          onClick={() => setSelectedShop(shop.id)}
                          className={`px-4 py-2 text-xs uppercase font-normal tracking-widest border border-black ${selectedShop === shop.id ? 'bg-black text-white' : 'text-black hover:bg-black hover:text-white'}`}
                      >
                          {shop.name.replace('HAEYOOM ', '')}
                      </button>
                  ))}
              </div>
            {/* Comment: Designer profiles will be displayed here */}
            {/* TODO: Add designer profiles from database */}
          </div>
          {/* Grid - Changed to 4 columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-b border-black">
              {filteredDesigners.map((designer, index) => {
                const totalItems = filteredDesigners.length;
                const lastRowStartMobile = Math.floor((totalItems - 1) / 2) * 2;
                const lastRowStartDesktop = Math.floor((totalItems - 1) / 4) * 4;
                const isLastRowMobile = index >= lastRowStartMobile;
                const isLastRowDesktop = index >= lastRowStartDesktop;
                
                return (
                  <div 
                    key={designer.id} 
                    className={`group md:border-r p-8 md:nth-[4n]:border-r-0 relative bg-[#F4F4F4] hover:bg-white transition-colors ${!isLastRowMobile ? 'border-b border-black' : ''} ${!isLastRowDesktop ? 'md:border-b md:border-black' : 'md:border-b-0'}`}
                  >
                    {/* <div className="flex flex-wrap gap-2 mb-3">
                          <span className="border border-black px-3 py-1 text-[10px] md:text-xs uppercase font-normal tracking-wider">
                          {designer.role}
                          </span>
                    </div> */}

                    <span className="block text-xs uppercase tracking-widest mb-2">{designer.role}</span>

                    <h4 className="font-display font-normal text-2xl md:text-3xl uppercase tracking-titter mb-8">
                      {designer.english_name || designer.name}
                    </h4>


                    {designer.instagramLink && (
                      <a 
                        href={designer.instagramLink ?? undefined} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hidden md:flex items-center gap-1 hover:underline text-xs uppercase text-black"
                      >
                          <span>Instagram</span>
                          <ArrowUpRight size={12} />
                      </a>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      {/* EXPLORE SECTION - Elfsight Instagram Feed widget */}
      <section id="explore" className="bg-[#F4F4F4]">
        <Script src="https://elfsightcdn.com/platform.js" strategy="lazyOnload" />
        <div className="w-full">
          <div className="px-6 md:px-12 pt-12 md:pt-24 pb-12 md:pb-24">
            <h4 className="font-display font-normal text-6xl md:text-8xl uppercase tracking-tighter mb-4 text-left text-black">Explore</h4>
            <p className="font-normal text-lg text-left text-black">Discover our latest styles and inspirations from our designers&apos; Instagram.</p>
          </div>
          <div
            className="elfsight-app-c3f65fc0-2543-463a-b7c9-9c8f2a655e4b"
            data-elfsight-app-lazy
          />
        </div>
      </section>

      {/* NEW CTA SECTION */}
      <section className="bg-[#F4F4F4] px-6 md:px-12 py-32">
         <div className="w-full border-t border-black pt-12 flex flex-col md:flex-row justify-between md:items-end gap-10">
             <h2 className="font-display font-normal text-6xl md:text-8xl uppercase tracking-tighter leading-[0.9] text-left text-black">
                Ready to<br/>Transform?
             </h2>
             <Link 
                href="/booking" 
                className="inline-block border border-black px-12 py-5 text-sm uppercase tracking-widest text-black hover:bg-black hover:text-white transition-colors mb-2"
             >
                Book Appointment
          </Link>
        </div>
      </section>

        </div>
  );
};

export default Home;
