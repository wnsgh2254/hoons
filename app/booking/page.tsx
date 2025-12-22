'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Designer {
  id: string;
  name: string;
  title: string;
  image: string;
  available: boolean;
  availableText: string;
  description: string;
  portfolio: string[];
  selected: boolean;
}

interface Service {
  id: string;
  name: string;
  price: number;
  priceLabel: string;
  duration: string;
  description: string;
  image: string;
  selected: boolean;
}

export default function BookingPage() {
  const [step, setStep] = useState<'service' | 'deposit' | 'confirmed'>('service');
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [selectedDesigner, setSelectedDesigner] = useState<Designer | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(24);
  const [selectedTime, setSelectedTime] = useState<string | null>('2:00 PM');
  const [serviceCategory, setServiceCategory] = useState('Cut & Style');
  const [shopsDb, setShopsDb] = useState<any[]>([]);
  const [loadingShops, setLoadingShops] = useState<boolean>(true); // Comment: Track initial venue loading state
  const [designersForShop, setDesignersForShop] = useState<any[]>([]);
  const [servicesForShop, setServicesForShop] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // Comment: Track loading state when creating booking

  // Comment: Refs to enable smooth scrolling to each step section
  const serviceSectionRef = useRef<HTMLElement | null>(null);
  const designerSectionRef = useRef<HTMLElement | null>(null);
  const dateSectionRef = useRef<HTMLElement | null>(null);
  const timeSectionRef = useRef<HTMLElement | null>(null);

  // Comment: Helper to smoothly scroll to a section
  const scrollToSection = (ref: { current: HTMLElement | null }) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Load shops via API so newly added venues appear automatically
  useEffect(() => {
    const loadShops = async () => {
      try {
        const res = await fetch('/api/shops');
        const json = await res.json();
        if (!res.ok) {
          console.error('Error fetching shops via API:', json.error);
          return;
        }
        setShopsDb(json.shops || []);
      } catch (error) {
        console.error('Unexpected error fetching shops:', error);
      } finally {
        setLoadingShops(false);
      }
    };

    loadShops();
  }, []);

  // Load active designers for a given shop (by DB id) via API
  const loadDesignersForShop = async (shopIdDb: number) => {
    try {
      const res = await fetch(`/api/designers?shopId=${shopIdDb}`);
      const json = await res.json();
      if (!res.ok) {
        console.error('Error fetching designers for shop via API:', json.error);
        return;
      }
      setDesignersForShop(json.designers || []);
    } catch (error) {
      console.error('Unexpected error fetching designers for shop:', error);
    }
  };

  // Load active services for a given shop (by DB id) via API
  const loadServicesForShop = async (shopIdDb: number) => {
    try {
      const res = await fetch(`/api/services?shopId=${shopIdDb}`);
      const json = await res.json();
      if (!res.ok) {
        console.error('Error fetching services for shop via API:', json.error);
        return;
      }
      setServicesForShop(json.services || []);
    } catch (error) {
      console.error('Unexpected error fetching services for shop:', error);
    }
  };

  const shops =
    shopsDb.map((s) => ({
      id: String(s.id),
      name: s.name as string,
      address: (s.location as string | null) ?? '',
      _dbId: s.id as number,
    }));

  // Map designers loaded from API into UI Designer objects
  const designers: Designer[] = designersForShop.map((d: any) => ({
    id: String(d.id),
    name: d.name as string,
    title: (d.role as string) || '',
    image: '',
    available: true,
    availableText: '',
    description: '',
    portfolio: [],
    selected: selectedDesigner ? selectedDesigner.id === String(d.id) : false,
  }));

  // Map services loaded from API into UI Service objects
  const services: Service[] = servicesForShop.map((s: any) => ({
    id: String(s.id),
    name: s.name as string,
    price: Number(s.price),
    priceLabel: 'Standard',
    duration: `${s.duration_minutes} mins`,
    description: '',
    image: '',
    selected: selectedService ? selectedService.id === String(s.id) : false,
  }));

  const handleDesignerSelect = (designer: Designer) => {
    setSelectedDesigner(designer);
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    // Comment: When service changes, clear downstream selections
    setSelectedDesigner(null);
    setSelectedDate(null);
    setSelectedTime(null);
  };

  // Comment: When each step is selected, scroll to the corresponding section after render
  useEffect(() => {
    if (selectedShop) {
      scrollToSection(serviceSectionRef);
    }
  }, [selectedShop]);

  useEffect(() => {
    if (selectedService) {
      scrollToSection(designerSectionRef);
    }
  }, [selectedService]);

  useEffect(() => {
    if (selectedDesigner) {
      scrollToSection(dateSectionRef);
    }
  }, [selectedDesigner]);

  useEffect(() => {
    if (selectedDate) {
      scrollToSection(timeSectionRef);
    }
  }, [selectedDate]);

  // Comment: When moving to deposit step, smoothly scroll to top
  useEffect(() => {
    if (step === 'deposit' || step === 'confirmed') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

  // Comment: Move to deposit UI step (no DB write yet)
  const goToDeposit = () => {
    setStep('deposit');
  };

  // Comment: Create booking in DB when deposit is paid (simulated)
  const handlePayDeposit = async () => {
    if (isSubmitting) return;
    if (!selectedDate || !selectedTime || !selectedService || !selectedDesigner || !selectedShop) return;

    setIsSubmitting(true);
    try {
      const currentShop = shops.find((s) => s.id === selectedShop) as any;
      const shopDbId = currentShop?._dbId ?? null;
      const designerId = selectedDesigner ? Number(selectedDesigner.id) : null;
      const serviceId = selectedService ? Number(selectedService.id) : null;

      await fetch('/api/appointment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopId: shopDbId,
          designerId,
          serviceId,
          day: selectedDate,
          timeLabel: selectedTime,
          totalAmount: selectedService?.price ?? null,
          depositAmount,
        }),
      });
      // TODO: Optionally show a success toast or redirect
    } catch (error) {
      console.error('Error calling booking API:', error);
    } finally {
      setIsSubmitting(false);
      // Comment: After (simulated) payment success, move to confirmation page
      setStep('confirmed');
    }
  };

  const handleBack = () => {
    if (step === 'deposit') {
      setStep('service');
    } else if (step === 'confirmed') {
      setStep('deposit');
    }
  };

  const totalPrice = selectedService ? selectedService.price : 0;
  const depositAmount = totalPrice * 0.2; // 20% deposit

  // Step 4: Deposit Payment
  if (step === 'deposit') {
    return (
      <div className="bg-white text-slate-900 font-display min-h-screen flex flex-col overflow-x-hidden antialiased selection:bg-gray-200 selection:text-black pt-20">
        <main className="flex-grow w-full max-w-[1280px] mx-auto px-4 md:px-6 py-8">
          <div className="flex items-center gap-2 mb-6 text-sm">
            <Link href="/" className="text-gray-500 hover:text-black transition-colors">
              Home
            </Link>
            <span className="text-gray-300">/</span>
            <Link href="/booking" className="text-gray-500 hover:text-black transition-colors">
              Booking
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-black font-medium">Deposit</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            <aside className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-black">receipt_long</span>
                  Booking Summary
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-start pb-4 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{selectedService?.name}</p>
                      <p className="text-xs text-gray-500">With {selectedDesigner?.name}</p>
                    </div>
                    <p className="text-sm font-medium text-slate-900">${selectedService?.price.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-sm text-gray-500">Date & Time</span>
                    <span className="text-sm font-medium text-slate-900">
                      Oct {selectedDate}, 2023 at {selectedTime}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-sm text-gray-500">Duration</span>
                    <span className="text-sm font-medium text-slate-900">{selectedService?.duration}</span>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-500">Total Amount</span>
                      <span className="text-lg font-bold text-black">${totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className="text-sm font-medium text-slate-900">Deposit (20%)</span>
                      <span className="text-xl font-bold text-black">${depositAmount.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Remaining ${(totalPrice - depositAmount).toFixed(2)} will be paid on the day of your appointment.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg flex gap-3 items-start border border-gray-200">
                <span className="material-symbols-outlined text-black mt-0.5 text-lg">info</span>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Your deposit is non-refundable but can be rescheduled up to 24 hours before your appointment.
                </p>
              </div>
            </aside>
            <section className="lg:col-span-8 space-y-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 mb-2">Secure Your Booking</h1>
                <p className="text-gray-500">Pay your deposit to confirm your appointment.</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Payment Method</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {['Card', 'Cash', 'Transfer'].map((method) => (
                    <button
                      key={method}
                      className="p-4 border-2 border-gray-200 rounded-xl hover:border-black transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-2xl text-gray-400">
                          {method === 'Card' ? 'credit_card' : method === 'Cash' ? 'payments' : 'account_balance'}
                        </span>
                        <span className="font-medium text-slate-900">{method}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600" htmlFor="card-number">
                      Card Number
                    </label>
                    <input
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
                      id="card-number"
                      placeholder="1234 5678 9012 3456"
                      type="text"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600" htmlFor="expiry">
                        Expiry Date
                      </label>
                      <input
                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
                        id="expiry"
                        placeholder="MM/YY"
                        type="text"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600" htmlFor="cvv">
                        CVV
                      </label>
                      <input
                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
                        id="cvv"
                        placeholder="123"
                        type="text"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600" htmlFor="card-name">
                      Cardholder Name
                    </label>
                    <input
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
                      id="card-name"
                      placeholder="John Doe"
                      type="text"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={handleBack}
                  className="px-6 py-3 rounded-lg text-sm font-medium text-gray-600 hover:text-black hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Back
                </button>
                <button
                  type="button"
                  onClick={handlePayDeposit}
                  className={`w-full md:w-auto font-bold text-lg px-10 py-4 rounded-xl shadow-lg shadow-gray-400/50 transform transition-all flex items-center justify-center gap-3 ${
                    isSubmitting
                      ? 'bg-gray-300 text-gray-700 cursor-wait'
                      : 'bg-black hover:bg-gray-800 text-white hover:-translate-y-0.5 active:translate-y-0'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block size-5 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Processing payment...</span>
                    </>
                  ) : (
                    <>
                      <span>Pay Deposit ${depositAmount.toFixed(2)}</span>
                      <span className="material-symbols-outlined">lock</span>
                    </>
                  )}
                </button>
              </div>
            </section>
          </div>
        </main>
        <footer className="border-t border-gray-200 bg-white py-8 mt-12">
          <div className="max-w-[1280px] mx-auto px-6 text-center">
            <p className="text-gray-400 text-xs">© 2023 Haeyoom Hair Salon. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

  // Step 5: Booking Confirmed
  if (step === 'confirmed') {
    return (
      <div className="bg-white text-slate-900 font-display min-h-screen flex flex-col overflow-x-hidden antialiased selection:bg-gray-200 selection:text-black pt-24">
        <main className="flex-grow w-full max-w-[1280px] mx-auto px-4 md:px-6 py-10">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 px-4 py-2 text-sm font-medium gap-2">
              <span className="material-symbols-outlined">check_circle</span>
              <span>Booking Confirmed</span>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
                Your appointment is confirmed
              </h1>
              <p className="text-gray-500">
                Thank you. Your deposit has been recorded and your spot is now secured.
              </p>
            </div>
            <div className="mt-6 inline-flex flex-col items-start gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-6 py-5 text-left">
              <p className="text-sm font-semibold text-gray-700">Booking details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div className="flex justify-between sm:block">
                  <span className="text-gray-500">Location</span>
                  <span className="sm:block font-medium text-slate-900">
                    {shops.find((s) => s.id === selectedShop)?.name}
                  </span>
                </div>
                <div className="flex justify-between sm:block">
                  <span className="text-gray-500">Designer</span>
                  <span className="sm:block font-medium text-slate-900">{selectedDesigner?.name}</span>
                </div>
                <div className="flex justify-between sm:block">
                  <span className="text-gray-500">Service</span>
                  <span className="sm:block font-medium text-slate-900">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between sm:block">
                  <span className="text-gray-500">Date &amp; Time</span>
                  <span className="sm:block font-medium text-slate-900">
                    Oct {selectedDate}, 2023 at {selectedTime}
                  </span>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-200 w-full flex justify-between text-sm">
                <span className="text-gray-500">Deposit paid</span>
                <span className="font-bold text-slate-900">${depositAmount.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-center gap-4 pt-4">
              <Link
                href="/booking"
                className="px-6 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Make another booking
              </Link>
              <Link
                href="/"
                className="px-6 py-3 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800 transition-colors"
              >
                Back to home
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Step 2: Service & Designer Selection
  return (
    <div className="bg-white text-zinc-900 font-display antialiased selection:bg-black selection:text-white min-h-screen pt-24">
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-6 md:px-10 lg:px-40 py-8 space-y-16">
        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-black font-bold">Shop</span>
          <span className="material-symbols-outlined text-[16px] text-gray-400">chevron_right</span>
          <span className="text-black font-bold">Service</span>
          <span className="material-symbols-outlined text-[16px] text-gray-400">chevron_right</span>
          <span className="text-gray-400">Time</span>
          <span className="material-symbols-outlined text-[16px] text-gray-400">chevron_right</span>
          <span className="text-gray-400">Deposit</span>
        </div>

        {/* 01. Venue Selection */}
        <section className="space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-black mb-2 tracking-tight">Select Location</h1>
            <p className="text-gray-600 text-lg font-light">Choose your preferred salon location.</p>
          </div>
          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-500 ${
              selectedShop ? 'opacity-100 translate-y-0' : 'opacity-100 translate-y-0'
            }`}
          >
            {loadingShops && shops.length === 0 && (
              <>
                {[1, 2].map((skeleton) => (
                  <div
                    key={skeleton}
                    className="bg-white border-2 border-gray-100 rounded-2xl p-8 shadow-sm animate-pulse"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="bg-gray-200 rounded-full p-3 w-10 h-10" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                      </div>
                    </div>
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                  </div>
                ))}
              </>
            )}
            {!loadingShops &&
              shops.map((shop) => (
                <button
                  key={shop.id}
                  type="button"
                  onClick={() => {
                    // Comment: When changing venue, reset all downstream selections
                    setSelectedShop(shop.id);
                    setSelectedService(null);
                    setSelectedDesigner(null);
                    setSelectedDate(null);
                    setSelectedTime(null);
                    if ((shop as any)._dbId) {
                      void loadDesignersForShop((shop as any)._dbId);
                      void loadServicesForShop((shop as any)._dbId);
                    }
                    // Comment: After selecting a shop, scroll to the service section
                    scrollToSection(serviceSectionRef);
                  }}
                  className={`text-left bg-white border-2 rounded-2xl p-8 cursor-pointer transition-all shadow-sm hover:shadow-lg ${
                    selectedShop === shop.id ? 'border-black scale-[1.01]' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-start gap-4 mb-2">
                    <div className="bg-black text-white rounded-full p-3">
                      <span className="material-symbols-outlined">location_on</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-black mb-1">{shop.name}</h3>
                      <p className="text-gray-600 text-sm">{shop.address}</p>
                    </div>
                    {selectedShop === shop.id && (
                      <div className="bg-black text-white rounded-full p-1">
                        <span className="material-symbols-outlined text-sm">check</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
          </div>
        </section>

        {/* 02. Service Selection (appears after venue is chosen) */}
        <section
          ref={serviceSectionRef}
          className={`transition-all duration-500 ${
            selectedShop ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
          }`}
        >
          <div className="flex items-center justify-between gap-6 mb-8 border-b border-gray-200 pb-4">
            <h3 className="text-2xl font-bold text-black flex items-center gap-2">
              <span className="bg-black text-white text-xs font-bold px-2 py-1 rounded">02</span>
              Select Service
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => handleServiceSelect(service)}
                className={`text-left bg-white border-2 rounded-2xl p-5 flex flex-col justify-between gap-3 transition-all shadow-sm hover:shadow-md ${
                  service.selected ? 'border-black' : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <div>
                  <h4 className="text-black text-lg font-bold mb-1">{service.name}</h4>
                  <p className="text-sm text-gray-500">
                    Duration: <span className="font-medium text-gray-800">{service.duration}</span>
                  </p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-semibold text-gray-900">${service.price}</span>
                  {service.selected && (
                    <span className="inline-flex items-center justify-center rounded-full bg-black text-white text-xs px-2 py-1">
                      Selected
                    </span>
                  )}
                </div>
              </button>
            ))}
            {services.length === 0 && (
              <p className="text-gray-500 text-sm col-span-full">
                No services found for this shop. Please configure services in the admin panel.
              </p>
            )}
          </div>
        </section>

        {/* 03. Designer Selection (only after service is chosen) */}
        {services.length > 0 && selectedService && (
          <section
            ref={designerSectionRef}
            className="transition-all duration-500 opacity-100 translate-y-0 space-y-10"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4 border-b border-gray-200 pb-4">
              <h3 className="text-2xl font-bold text-black flex items-center gap-2">
                <span className="bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded">03</span>
                Select Designer
              </h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {designers.map((designer) => (
                <button
                  key={designer.id}
                  type="button"
                  onClick={() => handleDesignerSelect(designer)}
                  className={`bg-white border-2 rounded-2xl p-6 text-left flex flex-col gap-2 transition-all shadow-sm hover:shadow-md ${
                    designer.selected ? 'border-black' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div>
                      <h4 className="text-lg font-bold text-black">{designer.name}</h4>
                      <p className="text-sm text-gray-500">{designer.title}</p>
                    </div>
                    {designer.selected && (
                      <div className="rounded-full bg-black text-white px-2 py-1 text-xs font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">check</span>
                        Selected
                      </div>
                    )}
                  </div>
                </button>
              ))}
              {designers.length === 0 && (
                <p className="text-gray-500 text-sm col-span-full">
                  No designers linked to this shop yet. Please configure staff in the admin panel.
                </p>
              )}
            </div>

            {/* 04. Date Selection (only after designer is chosen) */}
            {selectedDesigner && (
              <section ref={dateSectionRef} className="space-y-6">
                <div className="flex items-center justify-between gap-6 mb-2 border-b border-gray-200 pb-4">
                  <h3 className="text-2xl font-bold text-black flex items-center gap-2">
                    <span className="bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded">04</span>
                    Select Date
                  </h3>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <button className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <h2 className="text-sm md:text-base font-bold text-slate-900">October 2023</h2>
                    <button className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-7 text-center py-3 bg-gray-50">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <span key={day} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        {day}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 text-center p-3 gap-y-3 gap-x-1 md:gap-x-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28].map(
                      (day) => {
                        const isOff = day === 10 || day === 17;
                        const isSelected = day === selectedDate;
                        return (
                          <button
                            key={day}
                            onClick={() => {
                              if (isOff) return;
                              setSelectedDate(day);
                              // Comment: After choosing date, scroll to time section
                              scrollToSection(timeSectionRef);
                            }}
                            className={`h-9 w-full flex items-center justify-center rounded-lg text-xs transition-colors ${
                              isOff
                                ? 'text-gray-400 cursor-not-allowed'
                                : isSelected
                                ? 'bg-linear-to-br from-gray-800 to-black text-white font-bold shadow-md shadow-gray-500/30'
                                : 'text-slate-900 hover:bg-gray-100'
                            }`}
                            disabled={isOff}
                            title={isOff ? 'Day Off' : ''}
                          >
                            {day}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* 05. Time Selection + Continue (only after date is chosen) */}
            {selectedDesigner && selectedDate && (
              <section ref={timeSectionRef} className="space-y-6">
                <div className="flex items-center justify-between gap-6 mb-2 border-b border-gray-200 pb-4">
                  <h3 className="text-2xl font-bold text-black flex items-center gap-2">
                    <span className="bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded">05</span>
                    Select Time
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1">Morning</span>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'].map((time) => {
                        const isDisabled = time === '10:00 AM' || time === '11:30 AM';
                        const isSelected = time === selectedTime;
                        return (
                          <button
                            key={time}
                            onClick={() => {
                              if (isDisabled) return;
                              setSelectedTime(time);
                            }}
                            className={`py-2 px-2 rounded-lg border text-xs md:text-sm transition-all ${
                              isDisabled
                                ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                                : isSelected
                                ? 'bg-linear-to-br from-gray-800 to-black text-white font-bold shadow-md shadow-gray-900/20 transform scale-105 border border-transparent'
                                : 'border-gray-200 text-slate-900 hover:border-black hover:text-black bg-white'
                            }`}
                            disabled={isDisabled}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1">Afternoon</span>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {['12:00 PM', '1:00 PM', '2:00 PM', '3:30 PM', '4:00 PM'].map((time) => {
                        const isDisabled = time === '4:00 PM';
                        const isSelected = time === selectedTime;
                        return (
                          <button
                            key={time}
                            onClick={() => {
                              if (isDisabled) return;
                              setSelectedTime(time);
                            }}
                            className={`py-2 px-2 rounded-lg border text-xs md:text-sm transition-all ${
                              isDisabled
                                ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                                : isSelected
                                ? 'bg-linear-to-br from-gray-800 to-black text-white font-bold shadow-md shadow-gray-900/20 transform scale-105 border border-transparent'
                                : 'border-gray-200 text-slate-900 hover:border-black hover:text-black bg-white'
                            }`}
                            disabled={isDisabled}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1">Evening</span>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {['5:00 PM', '6:00 PM'].map((time) => {
                        const isSelected = time === selectedTime;
                        return (
                          <button
                            key={time}
                            onClick={() => {
                              setSelectedTime(time);
                            }}
                            className={`py-2 px-2 rounded-lg border text-xs md:text-sm transition-all ${
                              isSelected
                                ? 'bg-linear-to-br from-gray-800 to-black text-white font-bold shadow-md shadow-gray-900/20 transform scale-105 border border-transparent'
                                : 'border-gray-200 text-slate-900 hover:border-black hover:text-black bg-white'
                            }`}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedDate || !selectedTime || !selectedService || !selectedDesigner || !selectedShop) return;
                        goToDeposit();
                      }}
                      className="bg-black hover:bg-gray-800 text-white font-semibold px-8 py-3 rounded-xl shadow-md flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={
                        !selectedDate || !selectedTime || !selectedService || !selectedDesigner || !selectedShop
                      }
                    >
                      <span>Continue to Payment</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </section>
            )}
          </section>
        )}
      </main>
      {/* Sticky summary bar removed: UX now advances automatically on selection */}
    </div>
  );
}
