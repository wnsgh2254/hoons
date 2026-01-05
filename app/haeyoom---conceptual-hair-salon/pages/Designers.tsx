import React, { useState } from 'react';
import { DESIGNERS, SHOPS } from '../services/mockData';

const Designers = () => {
  const [selectedShop, setSelectedShop] = useState<string>('all');

  const filteredDesigners = selectedShop === 'all' 
    ? DESIGNERS 
    : DESIGNERS.filter(d => d.shopId === selectedShop);

  return (
    <div className="min-h-screen bg-[#F4F4F4]">
       <div className="pt-32 px-6 md:px-12 border-b border-black flex flex-col md:flex-row justify-between items-end pb-6">
            <h1 className="font-display font-light text-6xl md:text-8xl uppercase tracking-tighter">
                Designers
            </h1>
            <div className="flex gap-4 mb-2 md:mb-4">
                <button 
                    onClick={() => setSelectedShop('all')}
                    className={`px-4 py-2 text-xs uppercase font-light tracking-widest border border-black ${selectedShop === 'all' ? 'bg-black text-white' : 'hover:bg-black hover:text-white'}`}
                >
                    All
                </button>
                {SHOPS.map(shop => (
                    <button 
                        key={shop.id}
                        onClick={() => setSelectedShop(shop.id)}
                        className={`px-4 py-2 text-xs uppercase font-light tracking-widest border border-black ${selectedShop === shop.id ? 'bg-black text-white' : 'hover:bg-black hover:text-white'}`}
                    >
                        {shop.name.replace('HAEYOOM ', '')}
                    </button>
                ))}
            </div>
       </div>

       {/* Grid - Changed to 4 columns */}
       <div className="grid grid-cols-1 md:grid-cols-4">
          {filteredDesigners.map((designer) => (
              <div 
                key={designer.id} 
                className="group border-b border-black md:border-r md:[&:nth-child(4n)]:border-r-0 relative bg-[#F4F4F4] hover:bg-white transition-colors"
              >
                  <div className="aspect-[4/5] overflow-hidden border-b border-black relative">
                       <img src={designer.profileImage} alt={designer.name} className="w-full h-full object-cover grayscale mix-blend-multiply group-hover:mix-blend-normal transition-all duration-500" />
                       
                       <div className="absolute bottom-0 left-0 bg-black text-white px-3 py-1">
                          <span className="text-xs uppercase tracking-widest">{designer.role}</span>
                       </div>
                  </div>
                  
                  <div className="p-8">
                      <h3 className="font-display font-light text-4xl uppercase tracking-tighter mb-3">{designer.name}</h3>
                      <p className="text-sm font-mono uppercase text-gray-500 mb-8">{SHOPS.find(s => s.id === designer.shopId)?.name.replace('HAEYOOM ', '')}</p>
                      
                      <p className="text-base leading-tight mb-8 min-h-[3em] font-light">
                        {designer.description}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {designer.specialties.map(spec => (
                            <span key={spec} className="border border-black px-3 py-1 text-[10px] md:text-xs uppercase font-light tracking-wider">
                                {spec}
                            </span>
                        ))}
                      </div>
                  </div>
              </div>
          ))}
          
          {/* Filler blocks - Adjusted for 4 columns */}
          {[1,2].map(i => (
             <div 
                key={i} 
                className="hidden md:flex border-b border-black md:border-r md:[&:nth-child(4n)]:border-r-0 bg-[#EAEAEA] min-h-[400px] items-center justify-center"
             >
                 <span className="font-display font-light text-7xl text-gray-300 uppercase tracking-tighter">Haeyoom</span>
             </div>
          ))}
       </div>
    </div>
  );
};

export default Designers;