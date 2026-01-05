import React, { useState, useMemo } from 'react';
import { BookingState, BookingStep, Shop, Service, Designer } from '../../types';
import { SHOPS, SERVICES, DESIGNERS, generateTimeSlots } from '../../services/mockData';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const StepShop = ({ onSelect, selectedId }: { onSelect: (s: Shop) => void, selectedId?: string }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 border-t border-black">
    {SHOPS.map((shop, idx) => (
      <button 
        key={shop.id} 
        onClick={() => onSelect(shop)}
        className={`group text-left relative border-b border-black ${idx % 2 === 0 ? 'md:border-r' : ''} hover:bg-black hover:text-white transition-colors h-72 md:h-[450px] flex flex-col justify-between p-8`}
      >
        <div className="flex justify-between items-start w-full z-10">
             <span className="font-display font-light text-4xl md:text-6xl uppercase tracking-tighter leading-none">{shop.name.replace('HAEYOOM ', '')}</span>
             <span className="font-mono text-sm border border-current px-3 rounded-full">{idx + 1}</span>
        </div>
        
        <div className="z-10 space-y-2">
             <p className="text-sm uppercase tracking-widest font-light">Address</p>
             <p className="text-sm font-mono opacity-80">{shop.address}</p>
        </div>

        {/* Hover Image Reveal */}
        <img 
            src={shop.image} 
            className={`absolute inset-0 w-full h-full object-cover grayscale opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none`}
            alt=""
        />
      </button>
    ))}
  </div>
);

const StepService = ({ onSelect, selectedId }: { onSelect: (s: Service) => void, selectedId?: string }) => (
  <div className="border-t border-black">
    {SERVICES.map((service, index) => (
      <button 
        key={service.id} 
        onClick={() => onSelect(service)}
        className={`w-full flex items-center justify-between p-8 border-b border-black transition-all ${selectedId === service.id ? 'bg-black text-white' : 'hover:bg-gray-200'}`}
      >
        <div className="flex items-baseline gap-10">
            <span className="font-mono text-sm opacity-50">0{index + 1}</span>
            <div className="text-left">
                <h4 className="font-display font-light text-3xl md:text-5xl uppercase tracking-tighter leading-none">{service.name}</h4>
                <span className="text-xs uppercase tracking-widest opacity-70 mt-1 block">{service.category}</span>
            </div>
        </div>
        <div className="text-right">
          <p className="font-light text-xl">${service.price.toLocaleString()} AUD</p>
          <p className="text-xs font-mono uppercase opacity-70">{service.durationMin} MIN</p>
        </div>
      </button>
    ))}
  </div>
);

const StepDesigner = ({ shopId, onSelect, selectedId }: { shopId: string, onSelect: (d: Designer) => void, selectedId?: string }) => {
  const shopDesigners = useMemo(() => DESIGNERS.filter(d => d.shopId === shopId), [shopId]);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 border-t border-l border-black">
      {shopDesigners.map(designer => (
        <button 
          key={designer.id} 
          onClick={() => onSelect(designer)}
          className={`relative p-8 text-left border-r border-b border-black transition-colors ${selectedId === designer.id ? 'bg-black text-white' : 'hover:bg-white'}`}
        >
          <div className="aspect-square bg-gray-300 mb-6 overflow-hidden border border-current">
             <img src={designer.profileImage} className="w-full h-full object-cover grayscale mix-blend-multiply" alt={designer.name} />
          </div>
          <h4 className="font-display font-light text-2xl uppercase tracking-tighter">{designer.name}</h4>
          <p className="text-xs uppercase tracking-widest mt-2 opacity-70">{designer.role}</p>
        </button>
      ))}
    </div>
  );
};

const StepDateTime = ({ onSelect, selectedDate, selectedTime }: { onSelect: (date: string, time: string) => void, selectedDate: string | null, selectedTime: string | null }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayState, setSelectedDayState] = useState<string>(selectedDate || '');
  const [time, setTime] = useState<string>(selectedTime || '');
  const slots = useMemo(() => generateTimeSlots(), []);

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const empties = Array.from({ length: firstDay }, (_, i) => i);

  const handleDayClick = (day: number) => {
     const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
     setSelectedDayState(dateStr);
  };

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

  return (
    <div className="border-t border-black grid grid-cols-1 lg:grid-cols-2">
      
      {/* Calendar Section */}
      <div className="border-b lg:border-b-0 border-black p-8 md:p-12">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
             <h3 className="font-display font-light text-3xl uppercase tracking-tighter">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
             </h3>
             <div className="flex gap-4">
                 <button onClick={prevMonth} className="hover:opacity-50"><ChevronLeft/></button>
                 <button onClick={nextMonth} className="hover:opacity-50"><ChevronRight/></button>
             </div>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 mb-4">
             {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                 <div key={d} className="text-xs uppercase tracking-widest text-gray-400 text-center py-2">{d}</div>
             ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1 md:gap-2">
              {empties.map(i => <div key={`empty-${i}`} />)}
              {daysArray.map(day => {
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = selectedDayState === dateStr;
                  return (
                      <button
                        key={day}
                        onClick={() => handleDayClick(day)}
                        className={`aspect-square flex items-center justify-center text-sm font-light border border-transparent hover:border-black transition-all rounded-full
                            ${isSelected ? 'bg-black text-white' : 'hover:bg-gray-100'}
                        `}
                      >
                          {day}
                      </button>
                  );
              })}
          </div>
      </div>

      {/* Time Slots Section */}
      <div className={`border-l border-black p-8 md:p-12 transition-opacity duration-500 ${selectedDayState ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
          <h3 className="font-display font-light text-3xl uppercase tracking-tighter mb-8 flex justify-between">
              <span>Time</span>
              {selectedDayState && <span className="text-lg font-mono tracking-normal">{selectedDayState}</span>}
          </h3>
          
          <div className="grid grid-cols-3 gap-3">
             {slots.map((slot, i) => (
                <button
                    key={i}
                    disabled={!slot.available}
                    onClick={() => {
                        setTime(slot.time);
                        onSelect(selectedDayState, slot.time);
                    }}
                    className={`py-3 text-sm font-mono border border-black transition-all ${!slot.available ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed line-through' : time === slot.time ? 'bg-black text-white' : 'hover:bg-black hover:text-white'}`}
                >
                    {slot.time}
                </button>
             ))}
          </div>
          {!selectedDayState && (
              <p className="mt-8 text-sm uppercase tracking-widest text-red-500 text-center">Please select a date first</p>
          )}
      </div>

    </div>
  );
};

const BookingWizard = () => {
  const [step, setStep] = useState<BookingStep>(BookingStep.SHOP_SELECT);
  const [bookingData, setBookingData] = useState<BookingState>({
    shop: null,
    service: null,
    designer: null,
    date: null,
    time: null,
    customerName: '',
    customerPhone: ''
  });

  const updateData = (updates: Partial<BookingState>) => {
    setBookingData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => { if (step < BookingStep.COMPLETE) setStep(step + 1); };
  const prevStep = () => { if (step > BookingStep.SHOP_SELECT) setStep(step - 1); };

  if (step === BookingStep.COMPLETE) {
    return (
      <div className="min-h-screen bg-[#F4F4F4] flex flex-col items-center justify-center p-8 border-t border-black mt-20">
         <h1 className="font-display font-light text-[15vw] leading-none uppercase tracking-tighter mb-6">Done.</h1>
         <div className="w-full max-w-lg border-t border-b border-black py-6 mb-16">
            <div className="flex justify-between text-sm uppercase font-mono mb-3">
                <span>Ref</span>
                <span>#HY-{Math.floor(Math.random() * 10000)}</span>
            </div>
            <div className="flex justify-between text-sm uppercase font-mono">
                <span>Client</span>
                <span>{bookingData.customerName}</span>
            </div>
         </div>
         <Link to="/" className="uppercase font-light tracking-widest text-sm border border-black px-14 py-5 hover:bg-black hover:text-white transition-colors">
            Return Home
         </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F4] text-black pt-32 pb-32">
      <div className="w-full px-6 md:px-12">
        
        {/* Brutalist Header */}
        <div className="mb-16 border-b border-black pb-6 flex flex-col md:flex-row md:items-end justify-between">
            <h1 className="font-display font-light text-[10vw] md:text-[6vw] uppercase tracking-tighter leading-[0.8]">
                {step === BookingStep.SHOP_SELECT && "Select Location"}
                {step === BookingStep.SERVICE_SELECT && "Select Services"}
                {step === BookingStep.DESIGNER_SELECT && "Select Designer"}
                {step === BookingStep.DATE_SELECT && "Schedule"}
                {step === BookingStep.PAYMENT && "Confirm"}
            </h1>
            <div className="text-right mt-6 md:mt-0">
                <p className="font-mono text-sm">STEP 0{step + 1} / 05</p>
            </div>
        </div>

        {/* Content */}
        <div className="min-h-[400px]">
          {step === BookingStep.SHOP_SELECT && (
            <StepShop 
                onSelect={(s) => { updateData({ shop: s, service: null, designer: null }); setTimeout(nextStep, 300); }} 
                selectedId={bookingData.shop?.id} 
            />
          )}
          {step === BookingStep.SERVICE_SELECT && (
            <StepService 
                onSelect={(s) => { updateData({ service: s }); setTimeout(nextStep, 300); }} 
                selectedId={bookingData.service?.id} 
            />
          )}
          {step === BookingStep.DESIGNER_SELECT && bookingData.shop && (
            <StepDesigner 
                shopId={bookingData.shop.id} 
                onSelect={(d) => { updateData({ designer: d }); setTimeout(nextStep, 300); }} 
                selectedId={bookingData.designer?.id} 
            />
          )}
          {step === BookingStep.DATE_SELECT && (
            <StepDateTime 
                selectedDate={bookingData.date}
                selectedTime={bookingData.time}
                onSelect={(d, t) => updateData({ date: d, time: t })} 
            />
          )}
          {step === BookingStep.PAYMENT && (
            <div className="border-t border-black pt-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                     <div className="space-y-16">
                         <div className="group">
                            <label className="block font-mono text-sm uppercase mb-3">Full Name</label>
                            <input 
                                type="text" 
                                className="w-full bg-transparent border-b border-black py-4 text-4xl font-display font-light uppercase tracking-tighter focus:outline-none placeholder-gray-300"
                                placeholder="NAME"
                                value={bookingData.customerName}
                                onChange={(e) => updateData({ customerName: e.target.value })}
                            />
                         </div>
                         <div className="group">
                            <label className="block font-mono text-sm uppercase mb-3">Phone</label>
                            <input 
                                type="tel" 
                                className="w-full bg-transparent border-b border-black py-4 text-4xl font-display font-light uppercase tracking-tighter focus:outline-none placeholder-gray-300"
                                placeholder="NUMBER"
                                value={bookingData.customerPhone}
                                onChange={(e) => updateData({ customerPhone: e.target.value })}
                            />
                         </div>
                     </div>
                     
                     <div className="bg-white p-10 border border-black h-fit">
                         <h3 className="font-display font-light text-3xl uppercase tracking-tighter mb-10">Summary</h3>
                         <ul className="space-y-5 font-mono text-sm uppercase border-b border-black pb-10 mb-10">
                             <li className="flex justify-between"><span>Location</span> <span>{bookingData.shop?.name}</span></li>
                             <li className="flex justify-between"><span>Service</span> <span>{bookingData.service?.name}</span></li>
                             <li className="flex justify-between"><span>Time</span> <span>{bookingData.date} / {bookingData.time}</span></li>
                             <li className="flex justify-between mt-6 text-lg font-bold">
                                <span>Total</span> 
                                <span>{bookingData.service ? `$${bookingData.service.price}` : '$0'} AUD</span>
                             </li>
                         </ul>
                         
                         {bookingData.customerName && bookingData.customerPhone && (
                             <button 
                                onClick={() => setStep(BookingStep.COMPLETE)}
                                className="w-full bg-black text-white py-5 uppercase font-light tracking-widest hover:bg-gray-800"
                             >
                                 Execute Payment
                             </button>
                         )}
                     </div>
                </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-16 pt-10 border-t border-black">
          <button 
            onClick={prevStep} 
            disabled={step === BookingStep.SHOP_SELECT}
            className={`flex items-center space-x-2 text-sm uppercase font-light tracking-widest ${step === BookingStep.SHOP_SELECT ? 'opacity-0' : 'hover:opacity-50'}`}
          >
            <span>&lt;- Back</span>
          </button>

          {step === BookingStep.DATE_SELECT && (
              <button 
                onClick={nextStep} 
                className={`flex items-center space-x-2 text-sm uppercase font-light tracking-widest hover:opacity-50`}
             >
                <span>Next -&gt;</span>
             </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default BookingWizard;