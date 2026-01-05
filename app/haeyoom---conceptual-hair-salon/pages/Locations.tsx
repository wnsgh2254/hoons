import React from 'react';
import { SHOPS } from '../services/mockData';

const Locations = () => {
  return (
    <div className="min-h-screen bg-[#F4F4F4]">
      {/* Page Title */}
      <div className="pt-32 pb-12 px-6 md:px-12 border-b border-black">
        <h1 className="font-display font-light text-6xl md:text-8xl uppercase tracking-tighter">
            Locations
        </h1>
      </div>

      {/* Shops Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2">
          {SHOPS.map((shop, index) => (
            <div key={shop.id} className={`border-b border-black ${index % 2 === 0 ? 'md:border-r' : ''} group`}>
                <div className="relative aspect-video overflow-hidden border-b border-black">
                     <img 
                        src={shop.image} 
                        alt={shop.name} 
                        className="w-full h-full object-cover grayscale group-hover:scale-105 transition-transform duration-700"
                     />
                     <div className="absolute top-4 left-4 bg-white px-4 py-2 border border-black">
                        <span className="text-xs uppercase font-light tracking-widest">{shop.id.split('_')[1]}</span>
                     </div>
                </div>
                
                <div className="p-8 md:p-14 bg-[#F4F4F4] group-hover:bg-white transition-colors min-h-[340px] flex flex-col justify-between">
                    <div>
                        <h2 className="font-display font-light text-5xl md:text-6xl uppercase tracking-tighter mb-10 leading-none">
                            {shop.name.replace('HAEYOOM ', '')}
                        </h2>
                        
                        <div className="space-y-6 text-sm md:text-base font-mono uppercase text-gray-700">
                            <p className="border-l-2 border-black pl-4">{shop.address}</p>
                            <p className="border-l-2 border-black pl-4">{shop.phone}</p>
                            <p className="border-l-2 border-black pl-4">{shop.hours}</p>
                        </div>
                    </div>

                    <div className="pt-8 mt-10 border-t border-gray-300">
                         <button className="w-full flex justify-between items-center uppercase font-light text-sm tracking-widest hover:underline">
                            <span>View on Map</span>
                            <span>{'->'}</span>
                         </button>
                    </div>
                </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default Locations;