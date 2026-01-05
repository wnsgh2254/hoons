import React, { useState } from 'react';
import { Search } from 'lucide-react';

const CheckReservation = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<null | any>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    if (name && phone) {
        setTimeout(() => {
            setResult({
                shop: 'HAEYOOM GANGNAM',
                designer: 'KIM MIN-JUN',
                service: 'Architectural Cut',
                date: '2024-05-20',
                time: '14:00'
            });
        }, 800);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F4] pt-40 px-6">
      <div className="max-w-xl mx-auto">
        <h1 className="font-display font-light text-6xl md:text-8xl uppercase tracking-tighter mb-4 text-center">My Booking</h1>
        
        <form onSubmit={handleSearch} className="space-y-16 mt-24">
            <div className="relative">
                <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-transparent border-b-2 border-black py-4 text-3xl font-light uppercase tracking-widest focus:outline-none placeholder-gray-400"
                    placeholder="YOUR NAME"
                    required
                />
            </div>
            <div className="relative">
                <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-transparent border-b-2 border-black py-4 text-3xl font-light uppercase tracking-widest focus:outline-none placeholder-gray-400"
                    placeholder="PHONE"
                    required
                />
            </div>
            <button 
                type="submit" 
                className="w-full bg-black text-white py-6 text-base uppercase font-light tracking-widest hover:bg-white hover:text-black border border-black transition-colors"
            >
                Find Reservation
            </button>
        </form>

        {hasSearched && result && (
            <div className="mt-16 bg-white border border-black p-10 animate-fade-in">
                <div className="flex justify-between items-center mb-10 border-b border-black pb-4">
                     <span className="font-display font-light text-3xl uppercase tracking-tighter">Found</span>
                     <span className="text-green-600 font-mono text-sm uppercase">Confirmed</span>
                </div>
                <div className="grid grid-cols-2 gap-y-8 font-mono text-sm uppercase">
                    <div className="text-gray-500">Location</div>
                    <div className="font-bold text-right">{result.shop}</div>
                    
                    <div className="text-gray-500">Date</div>
                    <div className="font-bold text-right">{result.date} / {result.time}</div>
                    
                    <div className="text-gray-500">Service</div>
                    <div className="font-bold text-right">{result.service}</div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default CheckReservation;