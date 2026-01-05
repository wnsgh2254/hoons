import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowDown, Plus } from 'lucide-react';
import { SHOPS } from '../services/mockData';

// Generate more mock data for the gallery
const GALLERY_ITEMS = Array.from({ length: 36 }, (_, i) => ({
  id: i,
  title: `Style 0${i + 1}`,
  category: ['Cut', 'Perm', 'Color'][i % 3],
  image: `https://picsum.photos/id/${10 + i * 2}/800/800`,
}));

const Home = () => {
  const [galleryLimit, setGalleryLimit] = useState(12); // Start with 12 items (3 rows of 4)

  const handleLoadMore = () => {
    setGalleryLimit(prev => prev + 12);
  };

  return (
    <div className="w-full bg-[#F4F4F4]">
      
      {/* HERO SECTION: Single Large Image sticking to top */}
      {/* Added border-b border-black */}
      <section className="relative w-full h-screen overflow-hidden border-b border-black">
        <img 
            src="https://i.pinimg.com/1200x/54/ec/4d/54ec4d860f6bf566fdc9a6f06028bf45.jpg" 
            className="w-full h-full object-cover grayscale" 
            alt="Hero" 
        />
        
        {/* LOGO OVERLAY: Massive Text Overlay */}
        {/* Changed text-white to text-black */}
        {/* Positioned at bottom with some spacing */}
        <div className="absolute bottom-4 md:bottom-8 left-0 w-full px-6 md:px-12 z-20 pointer-events-none">
            <h1 className="flex justify-between w-full font-display text-black text-[18vw] leading-[0.8] tracking-tighter">
                {"HAEYOOM".split('').map((char, i) => (
                    <span key={i}>{char}</span>
                ))}
            </h1>
        </div>
      </section>

      {/* SPLIT HEADER: BOOK / NOW */}
      <section className="border-b border-black bg-[#F4F4F4]">
        {/* Adjusted padding to px-6 md:px-12 */}
        <div className="flex justify-between items-center px-6 md:px-12 py-12 md:py-20 overflow-hidden">
            <h2 className="font-display font-light text-6xl md:text-8xl uppercase tracking-tighter">Book</h2>
            <Link to="/booking" className="text-sm md:text-base font-light uppercase tracking-widest border border-black px-8 py-3 hover:bg-black hover:text-white transition-colors whitespace-nowrap mx-4">
                Book Appointment <ArrowRight size={14} className="inline ml-1" />
            </Link>
            <h2 className="font-display font-light text-6xl md:text-8xl uppercase tracking-tighter text-right">Now</h2>
        </div>
      </section>

      {/* PRODUCT GRID (Services) - 4 Columns on one line */}
      <section className="bg-[#F4F4F4]">
        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-black">
             {[
                { title: 'Cut', price: '65', img: 'https://i.pinimg.com/736x/46/14/a3/4614a381370f5bdaf30c8b0853e9436d.jpg' },
                { title: 'Perm', price: '300', img: 'https://i.pinimg.com/736x/df/7c/cb/df7ccbcffc5d71ffea4b8cbb8a529625.jpg' },
                { title: 'Color', price: '220', img: 'https://i.pinimg.com/736x/d0/9c/f5/d09cf50e9c06f929e6bb7270b769a4fe.jpg' },
                { title: 'Care', price: '150', img: 'https://i.pinimg.com/736x/1a/c2/6d/1ac26da7d8e22cb9872a2a2f2ce46cfc.jpg' },
             ].map((item, idx) => (
                <div key={idx} className="group relative aspect-square border-r border-black last:border-r-0 md:last:border-r-0 odd:border-r md:odd:border-r overflow-hidden">
                    <img 
                        src={item.img} 
                        alt={item.title} 
                        className="absolute inset-0 w-full h-full object-cover grayscale group-hover:scale-105 transition-transform duration-700" 
                    />
                    {/* Dark gradient overlay for white text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                    
                    <div className="absolute inset-0 p-6 flex flex-col justify-end">
                        <div className="flex justify-between items-end text-white z-10">
                            {/* Matching size with Space section text below: text-2xl md:text-3xl */}
                            <span className="font-display font-light text-2xl md:text-3xl uppercase tracking-tighter">{item.title}</span>
                            <span className="font-mono text-xs md:text-sm opacity-90">${item.price} AUD</span>
                        </div>
                    </div>
                </div>
             ))}
        </div>
      </section>

      {/* BIG STATEMENT TEXT */}
      <section className="py-32 px-6 md:px-12 bg-[#F4F4F4] overflow-hidden">
        <div className="w-full">
             <h3 className="font-display font-light text-6xl md:text-8xl leading-[0.9] uppercase tracking-tighter mb-12">
                Our creations are singular, never seen elsewhere and do not follow fashion.
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-black pt-8">
                <p className="text-base md:text-lg font-light leading-relaxed max-w-lg">
                    Nevertheless, they are anchored in a history. Our references are linked to what inspires and drives us: an artistic movement, an architectural style, a way of life...
                </p>
                <div className="text-right flex flex-col items-end gap-4">
                    <Link to="/designers" className="inline-block border-b border-black pb-1 uppercase text-sm font-light tracking-widest hover:text-gray-600 transition-colors">
                        View Designers {'->'}
                    </Link>
                </div>
             </div>
        </div>
      </section>

      {/* SPACE / LOCATIONS STRIP */}
      <section className="border-t border-black">
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
                        <span className="block text-xs uppercase tracking-widest mb-4">Space 0{idx + 1}</span>
                        
                        <h4 className="font-display font-light text-2xl md:text-3xl uppercase tracking-tighter leading-none mb-6">
                            <span className="block mb-2">HAEYOOM</span>
                            {shop.name.replace('HAEYOOM ', '')}
                        </h4>
                        
                        <p className="text-base leading-relaxed text-gray-600">
                           {shop.address}
                        </p>
                     </div>
                     <Link to="/locations" className="self-start mt-8 border border-black px-8 py-4 text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
                        View on Map
                     </Link>
                 </div>
             </div>
          ))}
      </section>

      {/* GALLERY LAYOUT (formerly Journal) */}
      <section className="border-t border-black bg-[#F4F4F4]">
         <div className="w-full">
             {/* Header with equal top and bottom padding to spacing */}
             <div className="px-6 md:px-12 pt-12 md:pt-24 pb-12 md:pb-24">
                <h4 className="font-display font-light text-6xl md:text-8xl uppercase tracking-tighter mb-4 text-left">Explore</h4>
                <p className="font-light text-lg text-left text-gray-500">Discover our latest styles and inspirations.</p>
             </div>
            
            {/* Gallery Grid - Full Width */}
            <div className="grid grid-cols-2 md:grid-cols-4 border-t border-black">
                {GALLERY_ITEMS.slice(0, galleryLimit).map((item, idx) => (
                    <div 
                        key={item.id} 
                        className="group relative aspect-square border-r border-b border-black md:nth-child(4n):border-r-0 overflow-hidden"
                    >
                        <img 
                            src={item.image} 
                            alt={item.title} 
                            className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" 
                        />
                        {/* Minimal overlay on hover */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="text-center text-white p-4">
                                <span className="block font-display text-2xl uppercase tracking-tighter">{item.title}</span>
                                <span className="text-xs font-mono uppercase tracking-widest">{item.category}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Load More Button */}
            {galleryLimit < GALLERY_ITEMS.length && (
                <div className="flex justify-center py-16 bg-[#F4F4F4] border-t border-black">
                    <button 
                        onClick={handleLoadMore}
                        className="group flex flex-col items-center gap-2 text-xs uppercase tracking-widest hover:opacity-70 transition-opacity"
                    >
                        <div className="border border-black rounded-full p-3 group-hover:bg-black group-hover:text-white transition-colors">
                             <Plus size={20} />
                        </div>
                        <span>Load More Styles</span>
                    </button>
                </div>
            )}
         </div>
      </section>

      {/* NEW CTA SECTION */}
      <section className="bg-[#F4F4F4] px-6 md:px-12 py-32">
         <div className="w-full border-t border-black pt-12 flex flex-col md:flex-row justify-between md:items-end gap-10">
             <h2 className="font-display font-light text-6xl md:text-8xl uppercase tracking-tighter leading-[0.9] text-left">
                Ready to<br/>Transform?
             </h2>
             <Link to="/booking" className="inline-block border border-black px-12 py-5 text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors mb-2">
                Book Appointment
             </Link>
         </div>
      </section>

    </div>
  );
};

export default Home;