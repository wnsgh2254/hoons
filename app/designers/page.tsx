'use client';

import { useState, useEffect } from 'react';

// Comment: Mock data for shops (will be replaced with API call)
const SHOPS = [
  {
    id: 'shop_meadowbank',
    name: 'HAEYOOM Meadowbank',
    address: 'SHEPHERDS BAY PLAZA, Level LG, SHOP 6.11/11A Bay Dr, Meadowbank NSW 2114',
    phone: '02-555-0123',
    hours: '10:00 - 20:00',
    image: 'https://i.pinimg.com/1200x/24/78/0d/24780ddba9bd63fc622543639c163940.jpg',
  },
  {
    id: 'shop_haymarket',
    name: 'HAEYOOM Haymarket',
    address: 'Shop4, 770 George St, Sydney NSW 2000',
    phone: '02-790-0987',
    hours: '10:00 - 19:00',
    image: 'https://i.pinimg.com/1200x/10/48/a2/1048a22becabf97a20d9cab8c2f9a2e6.jpg',
  },
];

// Comment: Designer interface
interface Designer {
  id: string;
  shopId: string;
  name: string;
  role: string;
  profileImage: string;
  description: string;
  specialties: string[];
}

// Comment: Mock designers data (will be replaced with API call)
const MOCK_DESIGNERS: Designer[] = [
  {
    id: 'des_1',
    shopId: 'shop_meadowbank',
    name: 'KIM MIN-JUN',
    role: 'Director',
    profileImage: 'https://i.pinimg.com/736x/d8/44/7c/d8447c644a6a8cef4cd2612cc51608f6.jpg',
    description: 'Expert in structural cuts and modern texture.',
    specialties: ['Architectural Cut', 'Texture Perm'],
  },
  {
    id: 'des_2',
    shopId: 'shop_meadowbank',
    name: 'LEE SEO-YUN',
    role: 'Senior Stylist',
    profileImage: 'https://i.pinimg.com/1200x/50/ea/43/50ea43053ac7ced97256cb97cb2f6087.jpg',
    description: 'Specializes in color correction and soft aesthetics.',
    specialties: ['Personal Color', 'Layered Cut'],
  },
  {
    id: 'des_3',
    shopId: 'shop_haymarket',
    name: 'PARK JI-HO',
    role: 'Chief Director',
    profileImage: 'https://i.pinimg.com/736x/1b/2d/96/1b2d96a2fe7d31acb7caf804ab3dfd30.jpg',
    description: 'Creating timeless beauty with minimal touch.',
    specialties: ['Classic Cut', 'Volume Perm'],
  },
];

export default function DesignersPage() {
  const [selectedShop, setSelectedShop] = useState<string>('all');
  const [designers, setDesigners] = useState<Designer[]>(MOCK_DESIGNERS);
  const [shops, setShops] = useState(SHOPS);

  // Comment: Load designers and shops from API
  useEffect(() => {
    const loadData = async () => {
      try {
        // Comment: Load shops
        const shopsRes = await fetch('/api/shops');
        if (shopsRes.ok) {
          const shopsData = await shopsRes.json();
          if (shopsData.shops) {
            setShops(shopsData.shops.map((shop: any) => ({
              id: `shop_${shop.id}`,
              name: shop.name || `HAEYOOM ${shop.location || 'Shop'}`,
              address: shop.address || '',
              phone: shop.phone || '',
              hours: shop.hours || '',
              image: shop.image || SHOPS[0].image,
            })));
          }
        }

        // Comment: Load designers
        // TODO: Create API endpoint that returns full designer data with profileImage, description, specialties
        // For now, using mock data
        const designersRes = await fetch('/api/designers');
        if (designersRes.ok) {
          const designersData = await designersRes.json();
          // Comment: Map API data to Designer interface when API is ready
          // setDesigners(designersData.designers.map(...));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  const filteredDesigners = selectedShop === 'all' 
    ? designers 
    : designers.filter(d => d.shopId === selectedShop);

  // Comment: Calculate how many filler blocks needed for 4 columns
  const totalItems = filteredDesigners.length;
  const itemsInLastRow = totalItems % 4;
  const fillerCount = itemsInLastRow === 0 ? 2 : 4 - itemsInLastRow;

  return (
    <div className="min-h-screen bg-[#F4F4F4] pt-24">
       <div className="pt-8 px-6 md:px-12 border-b border-black flex flex-col md:flex-row justify-between items-end pb-6">
            <h1 className="font-display font-light text-6xl md:text-8xl uppercase tracking-tighter text-black">
                Designers
            </h1>
            <div className="flex gap-4 mb-2 md:mb-4">
                <button 
                    onClick={() => setSelectedShop('all')}
                    className={`px-4 py-2 text-xs uppercase font-light tracking-widest border border-black transition-colors ${selectedShop === 'all' ? 'bg-black text-white' : 'text-black hover:bg-black hover:text-white'}`}
                >
                    All
                </button>
                {shops.map(shop => (
                    <button 
                        key={shop.id}
                        onClick={() => setSelectedShop(shop.id)}
                        className={`px-4 py-2 text-xs uppercase font-light tracking-widest border border-black transition-colors ${selectedShop === shop.id ? 'bg-black text-white' : 'text-black hover:bg-black hover:text-white'}`}
                    >
                        {shop.name.replace('HAEYOOM ', '')}
                    </button>
                ))}
            </div>
       </div>

       {/* Grid - 4 columns */}
       <div className="grid grid-cols-1 md:grid-cols-4">
          {filteredDesigners.map((designer, index) => {
            const isLastColumnDesktop = (index + 1) % 4 === 0;
            return (
              <div 
                key={designer.id} 
                className={`group border-b border-black relative bg-[#F4F4F4] hover:bg-white transition-colors ${!isLastColumnDesktop ? 'md:border-r md:border-black' : ''}`}
              >
                  <div className="aspect-[4/5] overflow-hidden border-b border-black relative">
                       <img 
                         src={designer.profileImage} 
                         alt={designer.name} 
                         className="w-full h-full object-cover grayscale mix-blend-multiply group-hover:mix-blend-normal transition-all duration-500" 
                       />
                       
                       <div className="absolute bottom-0 left-0 bg-black text-white px-3 py-1">
                          <span className="text-xs uppercase tracking-widest">{designer.role}</span>
                       </div>
                  </div>
                  
                  <div className="p-8">
                      <h3 className="font-display font-light text-4xl uppercase tracking-tighter mb-3 text-black">{designer.name}</h3>
                      <p className="text-sm font-mono uppercase text-black mb-8">{shops.find(s => s.id === designer.shopId)?.name.replace('HAEYOOM ', '') || ''}</p>
                      
                      <p className="text-base leading-tight mb-8 min-h-[3em] font-light text-black">
                        {designer.description}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {designer.specialties.map(spec => (
                            <span key={spec} className="border border-black px-3 py-1 text-[10px] md:text-xs uppercase font-light tracking-wider text-black">
                                {spec}
                            </span>
                        ))}
                      </div>
                  </div>
              </div>
            );
          })}
          
          {/* Filler blocks - Adjusted for 4 columns */}
          {Array.from({ length: fillerCount }).map((_, i) => (
             <div 
                key={`filler-${i}`} 
                className="hidden md:flex border-b border-black md:border-r md:[&:nth-child(4n)]:border-r-0 bg-[#EAEAEA] min-h-[400px] items-center justify-center"
             >
                 <span className="font-display font-light text-7xl text-gray-300 uppercase tracking-tighter">Haeyoom</span>
             </div>
          ))}
       </div>
    </div>
  );
}
