'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

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

// Comment: Get today's date string in Sydney timezone (YYYY-MM-DD)
function getSydneyToday(): string {
  const sydney = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' })
  );
  const year = sydney.getFullYear();
  const month = String(sydney.getMonth() + 1).padStart(2, '0');
  const day = String(sydney.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Comment: In-page payment form with Payment Element (Salon de Jessie style) – must be inside Elements
function PaymentForm({
  returnUrl,
  depositAmount,
  isSubmitting,
  setIsSubmitting,
}: {
  returnUrl: string;
  depositAmount: number;
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsSubmitting(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
          payment_method_data: {
            billing_details: {
              name: undefined,
              address: undefined,
            },
          },
        },
      });
      if (error) {
        console.error('Payment confirmation error:', error);
        alert(error.message ?? 'Payment failed. Please try again.');
      }
    } catch (err: unknown) {
      console.error('Payment error:', err);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase mb-2">Payment information</h3>
        <div className="border border-black p-4 bg-[#F4F4F4] min-h-[200px]">
          <PaymentElement
            options={{
              layout: 'tabs',
              paymentMethodOrder: ['card', 'google_pay'],
            }}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={!stripe || !elements || isSubmitting}
        className="w-full font-bold text-lg px-10 py-4 shadow-lg shadow-gray-400/50 bg-black hover:bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        {isSubmitting ? (
          <>
            <span className="inline-block size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <span>Pay & Confirm</span>
            <span className="material-symbols-outlined">lock</span>
          </>
        )}
      </button>
    </form>
  );
}

export default function BookingPage() {
  const [step, setStep] = useState<'service' | 'deposit' | 'confirmed'>('service');
  const [selectedDate, setSelectedDate] = useState<string>(getSydneyToday()); // Comment: Date in YYYY-MM-DD format
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [selectedDesigner, setSelectedDesigner] = useState<Designer | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>('2:00 PM');
  const [shopsDb, setShopsDb] = useState<any[]>([]);
  const [loadingShops, setLoadingShops] = useState<boolean>(true);
  const [designersForShop, setDesignersForShop] = useState<any[]>([]);
  const [availableDesignerIds, setAvailableDesignerIds] = useState<number[]>([]);
  const [loadingDesigners, setLoadingDesigners] = useState<boolean>(false);
  const [servicesForShop, setServicesForShop] = useState<any[]>([]);
  const [bookingItemsForShop, setBookingItemsForShop] = useState<any[]>([]);
  const [businessHoursForShop, setBusinessHoursForShop] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>(''); // Comment: Customer name for booking
  const [customerPhone, setCustomerPhone] = useState<string>(''); // Comment: Customer phone number for booking
  const [customerGreeting, setCustomerGreeting] = useState<string | null>(null); // Comment: Greeting text based on existing/new customer
  const [existingCustomerId, setExistingCustomerId] = useState<number | null>(null); // Comment: Existing customer id if found
  const [loadingCustomer, setLoadingCustomer] = useState<boolean>(false); // Comment: Loading state when resolving customer
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null); // Comment: PaymentIntent client_secret for Payment Element
  const [paymentIntentBookingId, setPaymentIntentBookingId] = useState<number | null>(null); // Comment: booking_id from create-payment-intent (for return_url)
  const [checkoutError, setCheckoutError] = useState<string | null>(null); // Comment: Error when creating payment intent
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false); // Comment: Loading state for payment intent
  const [checkoutRetry, setCheckoutRetry] = useState<number>(0); // Comment: Increment to retry creating payment intent
  const [showPaymentForm, setShowPaymentForm] = useState<boolean>(false); // Comment: Delay mount to avoid multiple Elements in React Strict Mode

  const paymentIntentFetchedRef = useRef(false); // Comment: Only fetch payment intent once per deposit visit (or on retry)
  const lastFetchedCheckoutRetryRef = useRef<number>(0);

  // Comment: Refs to enable smooth scrolling to each step section
  const dateSectionRef = useRef<HTMLElement | null>(null);
  const venueSectionRef = useRef<HTMLElement | null>(null);
  const designerSectionRef = useRef<HTMLElement | null>(null);
  const serviceSectionRef = useRef<HTMLElement | null>(null);
  const timeSectionRef = useRef<HTMLElement | null>(null);
  const contactSectionRef = useRef<HTMLElement | null>(null); // Comment: Ref for customer contact step

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

  // Load all services on mount (all designers can do all services regardless of venue or role)
  useEffect(() => {
    void loadAllServices();
  }, []);

  // Load booking items on mount (shared across all shops)
  useEffect(() => {
    void loadBookingItems();
  }, []);

  // Load business hours when shop is selected
  useEffect(() => {
    if (selectedShop && shopsDb.length > 0) {
      const currentShop = shopsDb.find((s) => String(s.id) === selectedShop);
      if (currentShop?.id) {
        void loadBusinessHours(currentShop.id);
      }
    } else {
      void loadBusinessHours();
    }
  }, [selectedShop, shopsDb]);

  // Comment: Load available designers when date and shop are selected
  useEffect(() => {
    if (selectedDate && selectedShop && shopsDb.length > 0) {
      const currentShop = shopsDb.find((s) => String(s.id) === selectedShop);
      if (currentShop && currentShop.id) {
        void loadAvailableDesigners(selectedDate, currentShop.id);
      }
    } else {
      setDesignersForShop([]);
      setAvailableDesignerIds([]);
    }
  }, [selectedDate, selectedShop, shopsDb]);

  // Comment: Load available designers for a given date and shop
  const loadAvailableDesigners = async (date: string, shopIdDb: number | null) => {
    if (!date || !shopIdDb) {
      setDesignersForShop([]);
      setAvailableDesignerIds([]);
      return;
    }

    try {
      setLoadingDesigners(true);
      // Comment: First, get available designer IDs for this date and shop
      const availabilityRes = await fetch(`/api/designer-schedules?date=${encodeURIComponent(date)}&shopId=${shopIdDb}`);
      const availabilityData = await availabilityRes.json();
      
      if (!availabilityRes.ok) {
        console.error('Error fetching designer availability:', availabilityData.error);
        setDesignersForShop([]);
        setAvailableDesignerIds([]);
        return;
      }

      const availableIds = availabilityData.designerIds || [];
      setAvailableDesignerIds(availableIds);

      // Comment: Then, get full designer details for available designers
      if (availableIds.length === 0) {
        setDesignersForShop([]);
        return;
      }

      const designersRes = await fetch(`/api/designers?shopId=${shopIdDb}`);
      const designersData = await designersRes.json();
      
      if (!designersRes.ok) {
        console.error('Error fetching designers:', designersData.error);
        setDesignersForShop([]);
        return;
      }

      // Comment: Filter designers to only include those available on the selected date
      const allDesigners = designersData.designers || [];
      const availableDesigners = allDesigners.filter((d: any) => availableIds.includes(d.id));
      setDesignersForShop(availableDesigners);
    } catch (error) {
      console.error('Unexpected error fetching available designers:', error);
      setDesignersForShop([]);
      setAvailableDesignerIds([]);
    } finally {
      setLoadingDesigners(false);
    }
  };

  // Load all active services (all designers can do all services regardless of venue or role)
  const loadAllServices = async () => {
    try {
      const res = await fetch(`/api/services`);
      const json = await res.json();
      if (!res.ok) {
        console.error('Error fetching services via API:', json.error);
        return;
      }
      setServicesForShop(json.services || []);
    } catch (error) {
      console.error('Unexpected error fetching services:', error);
    }
  };

  // Load booking items from admin reservation settings
  const loadBookingItems = async () => {
    try {
      const params = new URLSearchParams({ activeOnly: 'true' });
      const res = await fetch(`/api/booking-items?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setBookingItemsForShop(json.bookingItems || []);
      }
    } catch (error) {
      console.error('Error fetching booking items:', error);
    }
  };

  // Load business hours from admin reservation settings
  const loadBusinessHours = async (shopIdDb?: number | null) => {
    try {
      const params = new URLSearchParams();
      if (shopIdDb) params.set('shopId', String(shopIdDb));
      const res = await fetch(`/api/business-hours?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setBusinessHoursForShop(json.businessHours || []);
      }
    } catch (error) {
      console.error('Error fetching business hours:', error);
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
    // Comment: Use english_name for display in booking flow
    name: (d.english_name as string) || (d.name as string),
    title: (d.role as string) || '',
    image: '',
    available: true,
    availableText: '',
    description: '',
    portfolio: [],
    selected: selectedDesigner ? selectedDesigner.id === String(d.id) : false,
  }));

  // Comment: Helper function to determine service category based on name
  // Remove (card) or (cash) from name for category detection
  const getServiceCategory = (name: string): string => {
    const cleanName = name.replace(/\s*\(card\)\s*/gi, '').replace(/\s*\(cash\)\s*/gi, '').trim();
    const lowerName = cleanName.toLowerCase();
    
    // Check for category suffix first (e.g., "- Perm", "- Magic", "- Hot Perm", "- Color", "- Clinic", "- Package")
    if (lowerName.includes('- perm') && !lowerName.includes('hot perm') && !lowerName.includes('magic')) return 'Perm';
    if (lowerName.includes('- magic')) return 'Magic';
    if (lowerName.includes('- hot perm')) return 'Hot Perm';
    if (lowerName.includes('- color')) return 'Color';
    if (lowerName.includes('- clinic')) return 'Clinic';
    if (lowerName.includes('- package')) return 'Package';
    
    // Check for specific patterns
    // Package category - includes packages and design additions (without category suffix)
    if (lowerName.includes('package') || (lowerName.includes('design addition') && !lowerName.includes('-'))) return 'Package';
    if (lowerName.includes('mucota') || lowerName.includes('ahyunchae') || lowerName.includes('keratin') || lowerName.includes('scalp') || lowerName.includes('sleek') || lowerName.includes('clinic')) return 'Clinic';
    if (lowerName.includes('color') || lowerName.includes('bleach') || lowerName.includes('toning')) return 'Color';
    if (lowerName.includes('special perm') || lowerName.includes('setting perm') || lowerName.includes('design setting perm')) return 'Hot Perm';
    if (lowerName.includes('magic') || lowerName.includes('iron perm') || lowerName.includes('iron root')) return 'Magic';
    if (lowerName.includes('perm') && !lowerName.includes('magic') && !lowerName.includes('special') && !lowerName.includes('setting')) return 'Perm';
    if (lowerName.includes('styling') || lowerName.includes('shampoo') || lowerName.includes('dry')) return 'Dry';
    
    // Cut category - includes all cut-related services and additions (without category suffix)
    if (lowerName.includes('cut') || 
        (lowerName.includes('length addition') && !lowerName.includes('-')) || 
        lowerName.includes('hair extension') || 
        (lowerName.includes('director level') && !lowerName.includes('-')) || 
        (lowerName.includes('manager level') && !lowerName.includes('-')) ||
        lowerName.includes('kids cut') ||
        lowerName.includes('bangs cut')) {
      return 'Cut';
    }
    
    return 'Other';
  };

  // Map services loaded from API into UI Service objects
  // Remove "(card)" or "(cash)" from name for display in booking page
  // Only show card services to customers (filter out cash services)
  // Hide services that are admin-only (additional fees like Length Addition)
  const services: Service[] = servicesForShop
    .filter((s: any) => {
      const name = (s.name as string).toLowerCase();
      // Only show card services, hide cash services from customers
      const isCardService = name.includes('(card)') || (!name.includes('(cash)') && !name.includes('(card)'));
      // Hide admin-only services (additional fees)
      const visibleTo = s.visible_to || 'customer';
      const isVisibleToCustomer = visibleTo === 'customer' || visibleTo === 'both';
      return isCardService && isVisibleToCustomer;
    })
    .map((s: any) => {
      const displayName = (s.name as string).replace(/\s*\(card\)\s*/gi, '').replace(/\s*\(cash\)\s*/gi, '').trim();
      return {
        id: String(s.id),
        name: displayName,
        price: Number(s.price),
        priceLabel: 'Standard',
        duration: `${s.duration_minutes} mins`,
        description: '',
        image: '',
        selected: selectedService ? selectedService.id === String(s.id) : false,
      };
    });

  // Group services by category (use DB category if available, otherwise fallback to name-based detection)
  // Note: services from API may not have category field, so we need to check the original service data
  const servicesByCategory = services.reduce((acc, service) => {
    // Get original service data to check category
    const originalService = servicesForShop.find((s: any) => String(s.id) === service.id);
    const category = (originalService?.category as string) || getServiceCategory(service.name);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  // Define category order
  const categoryOrder = ['Cut', 'Dry', 'Perm', 'Magic', 'Hot Perm', 'Color', 'Clinic', 'Package', 'Other'];

  // Map booking items from admin reservation settings to Service interface for customer booking
  const bookingItemServices: Service[] = bookingItemsForShop.map((item: any) => {
    const totalMinutes = (item.duration_hours || 0) * 60 + (item.duration_minutes || 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const durationParts: string[] = [];
    if (hours > 0) durationParts.push(`${hours}hr`);
    if (mins > 0) durationParts.push(`${mins}min`);
    return {
      id: `booking_item_${item.id}`,
      name: item.name,
      price: 0,
      priceLabel: '',
      duration: durationParts.join(' ') || '0min',
      description: '',
      image: '',
      selected: selectedService ? selectedService.id === `booking_item_${item.id}` : false,
    };
  });

  // Use booking items if available, otherwise fallback to services
  const displayServices = bookingItemServices.length > 0 ? bookingItemServices : services;

  // Generate dynamic time slots from business hours
  const dynamicTimeSlots = useMemo(() => {
    if (businessHoursForShop.length === 0 || !selectedDate) {
      return { morning: [] as string[], afternoon: [] as string[], evening: [] as string[] };
    }

    // Convert JS day (0=Sun) to Korean day
    const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = DAYS_KO[new Date(selectedDate).getDay()];

    // Find matching business hours for this day
    const matchingHours = businessHoursForShop.filter((h: any) =>
      Array.isArray(h.days) && h.days.includes(dayOfWeek),
    );

    if (matchingHours.length === 0) {
      return { morning: [] as string[], afternoon: [] as string[], evening: [] as string[] };
    }

    // Generate 30-min slots
    const allSlots: string[] = [];
    for (const h of matchingHours) {
      const [startH, startM] = (h.start_time as string).split(':').map(Number);
      const [endH, endM] = (h.end_time as string).split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      for (let m = startMinutes; m < endMinutes; m += 30) {
        const hour = Math.floor(m / 60);
        const minute = m % 60;
        const isPM = hour >= 12;
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const timeStr = `${displayHour}:${String(minute).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
        if (!allSlots.includes(timeStr)) {
          allSlots.push(timeStr);
        }
      }
    }

    // Sort slots chronologically
    const parseTime = (t: string) => {
      const [timePart, ampm] = t.split(' ');
      const [h, min] = timePart.split(':').map(Number);
      let hour24 = h;
      if (ampm === 'PM' && h !== 12) hour24 += 12;
      if (ampm === 'AM' && h === 12) hour24 = 0;
      return hour24 * 60 + min;
    };
    allSlots.sort((a, b) => parseTime(a) - parseTime(b));

    // Group into Morning/Afternoon/Evening
    const morning: string[] = [];
    const afternoon: string[] = [];
    const evening: string[] = [];

    for (const slot of allSlots) {
      const mins = parseTime(slot);
      if (mins < 720) morning.push(slot); // Before 12:00
      else if (mins < 1020) afternoon.push(slot); // 12:00 - 17:00
      else evening.push(slot); // 17:00+
    }

    return { morning, afternoon, evening };
  }, [businessHoursForShop, selectedDate]);

  const hasTimeSlots = dynamicTimeSlots.morning.length > 0 || dynamicTimeSlots.afternoon.length > 0 || dynamicTimeSlots.evening.length > 0;

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    // Comment: When date changes, clear downstream selections
    setSelectedShop(null);
    setSelectedDesigner(null);
    setSelectedService(null);
    setSelectedTime(null);
  };

  const handleShopSelect = (shopId: string) => {
    setSelectedShop(shopId);
    // Comment: When shop changes, clear downstream selections
    setSelectedDesigner(null);
    setSelectedService(null);
    setSelectedTime(null);
  };

  const handleDesignerSelect = (designer: Designer) => {
    setSelectedDesigner(designer);
    // Comment: When designer changes, clear downstream selections
    setSelectedService(null);
    setSelectedTime(null);
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    // Comment: When service changes, clear time selection
    setSelectedTime(null);
    // Close modal after selection
    setIsServiceModalOpen(false);
    setSelectedCategory(null);
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setIsServiceModalOpen(true);
  };

  // Comment: When each step is selected, scroll to the corresponding section after render
  useEffect(() => {
    if (selectedDate) {
      scrollToSection(venueSectionRef);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedShop) {
      scrollToSection(designerSectionRef);
    }
  }, [selectedShop]);

  useEffect(() => {
    if (selectedDesigner) {
      scrollToSection(serviceSectionRef);
    }
  }, [selectedDesigner]);

  useEffect(() => {
    if (selectedService) {
      scrollToSection(timeSectionRef);
    }
  }, [selectedService]);

  useEffect(() => {
    if (selectedTime) {
      scrollToSection(contactSectionRef);
    }
  }, [selectedTime]);

  // Comment: When moving to deposit step, smoothly scroll to top
  useEffect(() => {
    if (step === 'deposit' || step === 'confirmed') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

  // Comment: When on deposit step and using embedded checkout, create session and get client_secret
  const stripePublishableKey = typeof process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY === 'string'
    ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    : null;
  const stripePromise = useMemo(
    () => (stripePublishableKey ? loadStripe(stripePublishableKey) : null),
    [stripePublishableKey],
  );

  useEffect(() => {
    if (step !== 'deposit') {
      setCheckoutClientSecret(null);
      setPaymentIntentBookingId(null);
      setCheckoutError(null);
      setShowPaymentForm(false);
      paymentIntentFetchedRef.current = false;
      return;
    }
    if (!stripePublishableKey) return;
    if (!selectedDate || !selectedTime || !selectedService || !selectedDesigner || !selectedShop) return;
    // Comment: Only fetch once per deposit visit (or when user clicks Try again)
    if (paymentIntentFetchedRef.current && lastFetchedCheckoutRetryRef.current === checkoutRetry) {
      return;
    }
    paymentIntentFetchedRef.current = true;
    lastFetchedCheckoutRetryRef.current = checkoutRetry;

    const currentShop = shopsDb.find((s) => String(s.id) === selectedShop) as { id: number; name?: string } | undefined;
    const shopDbId = currentShop?.id ?? null;
    const designerId = selectedDesigner ? Number(selectedDesigner.id) : null;
    const serviceId = selectedService ? Number(selectedService.id) : null;
    const day = selectedDate ? Number(selectedDate.split('-')[2]) : null;
    const formattedDateLabel = selectedDate
      ? new Date(selectedDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '';
    const depositAmt = selectedService ? selectedService.price * 0.2 : 0;

    setCheckoutError(null);
    setCheckoutLoading(true);
    setCheckoutClientSecret(null);

    fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopId: shopDbId,
        designerId,
        serviceId,
        day,
        timeLabel: selectedTime,
        totalAmount: selectedService?.price ?? null,
        depositAmount: depositAmt,
        fullDate: selectedDate,
        customerName,
        customerPhone,
        existingCustomerId,
        serviceName: selectedService?.name ?? '',
        shopName: currentShop?.name ?? '',
        designerName: selectedDesigner?.name ?? '',
        formattedDateLabel,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setCheckoutError(data.error);
          return;
        }
        if (data.client_secret) {
          setCheckoutClientSecret(data.client_secret);
          setPaymentIntentBookingId(data.booking_id ?? null);
        } else {
          setCheckoutError('Payment form could not be created.');
        }
      })
      .catch((err) => {
        console.error('Error creating payment intent:', err);
        setCheckoutError(err?.message || 'Failed to load payment form.');
      })
      .finally(() => {
        setCheckoutLoading(false);
      });
  }, [step, stripePublishableKey, selectedDate, selectedTime, selectedService, selectedDesigner, selectedShop, customerName, customerPhone, existingCustomerId, shopsDb, checkoutRetry]);

  // Comment: Delay mounting Payment Element to avoid multiple Elements in React Strict Mode
  useEffect(() => {
    if (!checkoutClientSecret) {
      setShowPaymentForm(false);
      return;
    }
    const t = setTimeout(() => setShowPaymentForm(true), 150);
    return () => clearTimeout(t);
  }, [checkoutClientSecret]);

  // Comment: Move to deposit UI step (no DB write yet)
  const goToDeposit = () => {
    setStep('deposit');
  };

  // Comment: Resolve customer (existing or new) before moving to deposit step
  const resolveCustomerAndGoToDeposit = async () => {
    if (
      !selectedDate ||
      !selectedTime ||
      !selectedService ||
      !selectedDesigner ||
      !selectedShop ||
      !customerName.trim() ||
      !customerPhone.trim()
    ) {
      return;
    }

    try {
      setLoadingCustomer(true);
      setCustomerGreeting(null);

      // Comment: First, try to look up existing customer by phone (read-only)
      const lookupRes = await fetch('/api/customers/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: customerPhone,
        }),
      });

      if (lookupRes.ok) {
        const lookupJson = await lookupRes.json();
        if (lookupJson.exists && lookupJson.customer?.id) {
          // Comment: Existing customer found – remember id and show welcome-back greeting
          setExistingCustomerId(lookupJson.customer.id as number);
          const displayName = lookupJson.customer.name || customerName;
          setCustomerGreeting(`Welcome back ${displayName}`);
          setStep('deposit');
          return;
        }
      }

      // Comment: No existing customer – show welcome for new customer only (DB insert will happen on Pay Deposit)
      setCustomerGreeting(`Welcome ${customerName}`);
      setStep('deposit');
    } catch (error) {
      console.error('Error resolving customer before deposit step:', error);
      // Comment: Fallback – still allow progressing without greeting
      setCustomerGreeting(null);
      setStep('deposit');
    } finally {
      setLoadingCustomer(false);
    }
  };

  // Comment: Create Stripe Checkout session for deposit payment and create booking in DB
  const handlePayDeposit = async () => {
    if (isSubmitting) return;
    if (!selectedDate || !selectedTime || !selectedService || !selectedDesigner || !selectedShop) return;

    setIsSubmitting(true);
    try {
      const currentShop = shops.find((s) => s.id === selectedShop) as any;
      const shopDbId = currentShop?._dbId ?? null;
      const designerId = selectedDesigner ? Number(selectedDesigner.id) : null;
      const serviceId = selectedService ? Number(selectedService.id) : null;
      // Comment: Extract day from YYYY-MM-DD format
      const day = selectedDate ? Number(selectedDate.split('-')[2]) : null;

      const formattedDateLabel = selectedDate
        ? new Date(selectedDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : '';

      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopId: shopDbId,
          designerId,
          serviceId,
          day,
          timeLabel: selectedTime,
          totalAmount: selectedService?.price ?? null,
          depositAmount,
          fullDate: selectedDate, // Comment: Pass full date in YYYY-MM-DD format
          customerName, // Comment: Optional customer name field
          customerPhone, // Comment: Optional customer phone field
          existingCustomerId, // Comment: Optional existing customer ID if already resolved
          serviceName: selectedService?.name ?? '',
          shopName: currentShop?.name ?? '',
          designerName: selectedDesigner?.name ?? '',
          formattedDateLabel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('Error creating Stripe checkout session:', data.error);
        alert(data.error || 'Failed to start payment. Please try again.');
        return;
      }

      if (data.url) {
        // Comment: Redirect to hosted Stripe Checkout page
        window.location.href = data.url as string;
      } else {
        alert('Payment URL was not returned from the server.');
      }
    } catch (error) {
      console.error('Error starting Stripe deposit payment:', error);
      alert('결제를 시작하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === 'deposit') {
      setStep('service');
    } else if (step === 'confirmed') {
      setStep('deposit');
    }
  };

  // Comment: Reset all selections to start a new booking
  const resetBookingFlow = () => {
    setStep('service');
    setSelectedDate(getSydneyToday());
    setSelectedShop(null);
    setSelectedDesigner(null);
    setSelectedService(null);
    setSelectedTime('2:00 PM');
    setCustomerName('');
    setCustomerPhone('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPrice = selectedService ? selectedService.price : 0;
  const depositAmount = totalPrice * 0.2; // 20% deposit

  // Step 4: Deposit Payment
  if (step === 'deposit') {
    return (
      <div className="w-full bg-[#F4F4F4] font-display min-h-screen flex flex-col overflow-x-hidden antialiased pt-24">
        <main className="grow w-full max-w-[1280px] mx-auto px-6 md:px-12 pt-8 pb-24 space-y-16">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400 uppercase">01. Appointment Details</span>
            <span className="material-symbols-outlined text-[16px] text-gray-400">chevron_right</span>
            <span className="text-black font-bold uppercase">02. Confirmation & Payment</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            <section className="lg:col-span-8 space-y-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-slate-900 mb-2 uppercase">Secure Your Booking</h1>
                <p className="text-gray-500">Pay your deposit by card to confirm your appointment.</p>
                {customerGreeting && (
                  <div className="mt-4 inline-flex items-center gap-3 border border-black px-4 py-2 bg-[#F4F4F4]">
                    <span className="material-symbols-outlined text-base">person</span>
                    <span className="text-sm font-normal tracking-widest uppercase">{customerGreeting}</span>
                  </div>
                )}
              </div>
              <div className="bg-[#F4F4F4] border border-black p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-2 uppercase">Payment</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-6">
                  Enter your card details below. Payment is secure and handled by Stripe. No card
                  details are stored on HAEYOOM servers.
                </p>
                {stripePublishableKey && checkoutClientSecret && showPaymentForm && stripePromise && paymentIntentBookingId != null && (
                  <Elements
                    key={checkoutClientSecret}
                    stripe={stripePromise}
                    options={{
                      clientSecret: checkoutClientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          borderRadius: '0px',
                          colorBackground: '#F4F4F4',
                          colorText: '#0f172a',
                          colorPrimary: '#0f172a',
                          colorDanger: '#dc2626',
                        },
                      },
                    }}
                  >
                    <PaymentForm
                      returnUrl={
                        typeof window !== 'undefined'
                          ? `${window.location.origin}/booking/confirmed?booking_id=${paymentIntentBookingId}&shop=${encodeURIComponent(shops.find((s) => s.id === selectedShop)?.name ?? '')}&designer=${encodeURIComponent(selectedDesigner?.name ?? '')}&service=${encodeURIComponent(selectedService?.name ?? '')}&date=${encodeURIComponent(selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '')}&time=${encodeURIComponent(selectedTime ?? '')}&deposit=${depositAmount.toFixed(2)}`
                          : ''
                      }
                      depositAmount={depositAmount}
                      isSubmitting={isSubmitting}
                      setIsSubmitting={setIsSubmitting}
                    />
                  </Elements>
                )}
                {stripePublishableKey && checkoutLoading && (
                  <div className="flex items-center justify-center gap-3 py-12 text-gray-600">
                    <span className="inline-block size-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Loading payment form...</span>
                  </div>
                )}
                {stripePublishableKey && checkoutError && !checkoutLoading && (
                  <div className="py-4">
                    <p className="text-sm text-red-600 mb-4">{checkoutError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setCheckoutError(null);
                        setCheckoutClientSecret(null);
                        setPaymentIntentBookingId(null);
                        setCheckoutRetry((r) => r + 1);
                      }}
                      className="text-sm font-medium text-black underline hover:no-underline"
                    >
                      Try again
                    </button>
                  </div>
                )}
                {!stripePublishableKey && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Your payment will be completed on a secure Stripe checkout page. No card
                      details are stored on HAEYOOM servers.
                    </p>
                    <button
                      type="button"
                      onClick={handlePayDeposit}
                      className={`w-full md:w-auto font-bold text-lg px-10 py-4 shadow-lg shadow-gray-400/50 transform transition-all flex items-center justify-center gap-3 ${
                        isSubmitting
                          ? 'bg-gray-300 text-gray-700 cursor-wait'
                          : 'bg-black hover:bg-gray-800 text-white hover:-translate-y-0.5 active:translate-y-0'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="inline-block size-5 border border-black border-t-transparent animate-spin" />
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
                )}
              </div>
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={handleBack}
                  className="px-6 py-3 text-sm font-normal uppercase tracking-widest border border-black text-black hover:bg-black hover:text-white transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Back
                </button>
                {!stripePublishableKey && (
                  <div className="w-full md:w-auto" />
                )}
              </div>
            </section>
            <aside className="lg:col-span-4 space-y-6">
              <div className="bg-[#F4F4F4]  p-6 border border-black">
                <h4 className="text-lg font-bold text-slate-900 mb-4 uppercase">Booking Summary</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-start pb-4 border-b border-black">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{selectedService?.name}</p>
                      <p className="text-xs text-gray-500">With {selectedDesigner?.name}</p>
                    </div>
                    <p className="text-sm font-medium text-slate-900">${selectedService?.price.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-sm text-gray-500">Date & Time</span>
                    <span className="text-sm font-medium text-slate-900">
                      {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''} at {selectedTime}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-sm text-gray-500">Duration</span>
                    <span className="text-sm font-medium text-slate-900">{selectedService?.duration}</span>
                  </div>
                  <div className="pt-4 border-t border-black">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-500">Total Amount</span>
                      <span className="text-lg font-bold text-black">${totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-black">
                      <span className="text-sm font-medium text-slate-900">Deposit (20%)</span>
                      <span className="text-xl font-bold text-black">${depositAmount.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Remaining ${(totalPrice - depositAmount).toFixed(2)} will be paid on the day of your appointment.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-[#F4F4F4] p-4  flex gap-3 items-start border border-black">
                <span className="material-symbols-outlined text-black mt-0.5 text-lg">info</span>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Your deposit is non-refundable but can be rescheduled up to 24 hours before your appointment.
                </p>
              </div>
            </aside>
          </div>
        </main>
      </div>
    );
  }

  // Step 5: Booking Confirmed
  if (step === 'confirmed') {
    return (
      <div className="w-full bg-[#F4F4F4] font-display min-h-screen flex flex-col overflow-x-hidden antialiased pt-24">
        <main className="grow w-full max-w-[1280px] mx-auto px-6 md:px-12 py-10">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center justify-center  bg-emerald-100 text-emerald-700 px-4 py-2 text-sm font-medium gap-2">
              <span className="material-symbols-outlined">check_circle</span>
              <span>Booking Confirmed</span>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-slate-900 uppercase">
                Your appointment is confirmed
              </h1>
              <p className="text-gray-500">
                Thank you. Your deposit has been recorded and your spot is now secured.
              </p>
            </div>
            <div className="mt-6 inline-flex flex-col items-start gap-3 bg-[#F4F4F4] border border-black  px-6 py-5 text-left">
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
                    {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''} at {selectedTime}
                  </span>
                </div>
              </div>
              <div className="pt-3 border-t border-black w-full flex justify-between text-sm">
                <span className="text-gray-500">Deposit paid</span>
                <span className="font-bold text-slate-900">${depositAmount.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-center gap-4 pt-4">
              <button
                type="button"
                onClick={resetBookingFlow}
                className="px-6 py-3 text-sm font-normal uppercase tracking-widest border border-black text-black hover:bg-black hover:text-white transition-colors"
              >
                Make another booking
              </button>
              <Link
                href="/"
                className="px-6 py-3  text-sm font-normal uppercase tracking-widest border border-black text-black hover:bg-black hover:text-white transition-colors"
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
    <div className="w-full bg-[#F4F4F4] font-display antialiased min-h-screen pt-24">
      <main className="grow w-full max-w-[1280px] mx-auto px-6 md:px-12 pt-8 pb-24 space-y-16">
        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-black font-bold uppercase">01. Appointment Details</span>
          <span className="material-symbols-outlined text-[16px] text-gray-400">chevron_right</span>
          <span className="text-gray-400 uppercase">02. Confirmation & Payment</span>
        </div>

        <div className="space-y-32">
        {/* 01. Date Selection */}
        <section ref={dateSectionRef} className="space-y-6">
          <div className="border-b border-black pb-4">
            <h1 className="text-3xl md:text-4xl font-normal text-black mb-2 tracking-tight uppercase flex items-center gap-2">
              <span className="bg-black text-white text-sm font-bold px-2 py-1">01</span>
              Select Date
            </h1>
            <p className="font-normal text-lg text-left text-gray-500">Choose your preferred appointment date.</p>
          </div>
          <div className="max-w-md">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              min={getSydneyToday()}
              className="w-full px-4 py-3 border border-black  text-lg font-medium text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
            />
          </div>
        </section>

        {/* 02. Venue Selection (appears after date is chosen) */}
        {selectedDate && (
          <section
            ref={venueSectionRef}
            className="transition-all duration-500 space-y-6"
          >
            <div className="border-b border-black pb-4">
              <h1 className="text-3xl md:text-4xl font-normal text-black mb-2 tracking-tight uppercase flex items-center gap-2">
                <span className="bg-black text-white text-sm font-bold px-2 py-1">02</span>
                Select Location
              </h1>
              <p className="font-normal text-lg text-left text-gray-500">Choose your preferred salon location.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {loadingShops && shops.length === 0 && (
                <>
                  {[1, 2].map((skeleton) => (
                    <div
                      key={skeleton}
                      className="bg-[#F4F4F4] border border-black  p-8 animate-pulse"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="bg-gray-200  p-3 w-10 h-10" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 w-1/2" />
                          <div className="h-3 bg-gray-100 w-3/4" />
                        </div>
                      </div>
                      <div className="h-3 bg-gray-100 w-2/3" />
                    </div>
                  ))}
                </>
              )}
              {!loadingShops &&
                shops.map((shop) => {
                  const isSelected = selectedShop === shop.id;
                  return (
                    <button
                      key={shop.id}
                      type="button"
                      onClick={() => {
                        handleShopSelect(shop.id);
                      }}
                      className={`text-left border border-black p-8 cursor-pointer transition-all ${
                        isSelected ? 'bg-black text-white' : 'bg-[#F4F4F4] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-4 mb-2">
                        {/* <div className={`p-3 ${isSelected ? 'bg-white text-black' : 'bg-black text-white'}`}>
                          <span className="material-symbols-outlined">location_on</span>
                        </div> */}
                        <div className="flex-1">
                          <h3
                            className={`text-xl font-normal mb-1 uppercase ${
                              isSelected ? 'text-white' : 'text-black'
                            }`}
                          >
                            {shop.name}
                          </h3>
                          <p className={`text-sm ${isSelected ? 'text-gray-200' : 'text-gray-600'}`}>
                            {shop.address}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </section>
        )}

        {/* 03. Designer Selection (only after date and venue are chosen) */}
        {selectedDate && selectedShop && (
          <section
            ref={designerSectionRef}
            className="transition-all duration-500 space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4 pb-4 border-b border-black">
              <h1 className="text-3xl md:text-4xl font-normal text-black mb-2 tracking-tight uppercase flex items-center gap-2">
                <span className="bg-black text-white text-sm font-bold px-2 py-1">03</span>
                Select Designer
              </h1>
            </div>
            {loadingDesigners ? (
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border border-black border-t-black  animate-spin"></div>
                <p className="text-gray-500 text-sm mt-4">Loading available designers...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {designers.map((designer) => {
                  const isSelected = designer.selected;
                  return (
                    <button
                      key={designer.id}
                      type="button"
                      onClick={() => handleDesignerSelect(designer)}
                      className={`border border-black p-8 text-left flex flex-col gap-2 transition-all ${
                        isSelected ? 'bg-black text-white' : 'bg-[#F4F4F4] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div>
                          <h4
                            className={`text-lg font-bold ${
                              isSelected ? 'text-white' : 'text-black'
                            }`}
                          >
                            {designer.name}
                          </h4>
                          <p className={`text-sm ${isSelected ? 'text-gray-200' : 'text-gray-500'}`}>
                            {designer.title}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {designers.length === 0 && !loadingDesigners && (
                  <p className="text-gray-500 text-sm col-span-full">
                    No designers available for this date and location. Please try a different date or location.
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* 04. Service Selection (only after designer is chosen) */}
        {selectedDate && selectedShop && selectedDesigner && (
          <section
            ref={serviceSectionRef}
            className="transition-all duration-500"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4 pb-4 border-b border-black">
              <h1 className="text-3xl md:text-4xl font-normal text-black mb-2 tracking-tight uppercase flex items-center gap-2">
                <span className="bg-black text-white text-sm font-bold px-2 py-1">04</span>
                Select Service
              </h1>
            </div>
            {displayServices.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No services found. Please configure booking items in the admin panel.
              </p>
            ) : bookingItemServices.length > 0 ? (
              /* Booking items: flat list (no categories) */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {bookingItemServices.map((service) => {
                  const isSelected = service.selected;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => handleServiceSelect(service)}
                      className={`text-left border border-black p-4 flex flex-col justify-between gap-3 transition-all ${
                        isSelected ? 'bg-black text-white' : 'bg-[#F4F4F4] hover:bg-white'
                      }`}
                    >
                      <div>
                        <h4
                          className={`text-base font-bold mb-1 ${
                            isSelected ? 'text-white' : 'text-black'
                          }`}
                        >
                          {service.name}
                        </h4>
                        <p className={`text-xs ${isSelected ? 'text-gray-200' : 'text-gray-500'}`}>
                          Duration:{' '}
                          <span className="font-medium">{service.duration}</span>
                        </p>
                      </div>
                      {service.price > 0 && (
                        <div className="flex items-center justify-between mt-2">
                          <span
                            className={`text-sm font-semibold ${
                              isSelected ? 'text-white' : 'text-gray-900'
                            }`}
                          >
                            From ${service.price.toFixed(0)}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Fallback: original categorized services */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {categoryOrder.map((category) => {
                  const categoryServices = servicesByCategory[category];
                  if (!categoryServices || categoryServices.length === 0) return null;

                  const isSelected =
                    selectedService && getServiceCategory(selectedService.name) === category;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleCategoryClick(category)}
                      className={`border border-black p-6 transition-all text-center ${
                        isSelected ? 'bg-black text-white' : 'bg-[#F4F4F4] hover:bg-white'
                      }`}
                    >
                      <h4
                        className={`text-lg font-bold mb-2 ${
                          isSelected ? 'text-white' : 'text-black'
                        }`}
                      >
                        {category}
                      </h4>
                      <p className={`text-sm ${isSelected ? 'text-gray-200' : 'text-gray-500'}`}>
                        {categoryServices.length} services
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Service Selection Modal (fallback for categorized services) */}
            {isServiceModalOpen && selectedCategory && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsServiceModalOpen(false)}>
                <div className="bg-[#F4F4F4]  max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-black" onClick={(e) => e.stopPropagation()}>
                  <div className="sticky top-0 bg-[#F4F4F4] border-b border-black px-6 py-4 flex items-center justify-between">
                    <h1 className="text-3xl font-normal text-black uppercase">{selectedCategory}</h1>
                    <button
                      type="button"
                      onClick={() => setIsServiceModalOpen(false)}
                      className="text-gray-500 hover:text-black transition-colors"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {servicesByCategory[selectedCategory]?.map((service) => {
                          const isSelected = service.selected;
                          return (
                            <button
                              key={service.id}
                              type="button"
                              onClick={() => handleServiceSelect(service)}
                              className={`text-left border border-black p-4 flex flex-col justify-between gap-3 transition-all ${
                                isSelected ? 'bg-black text-white' : 'bg-[#F4F4F4] hover:bg-white'
                              }`}
                            >
                              <div>
                                <h4
                                  className={`text-base font-bold mb-1 ${
                                    isSelected ? 'text-white' : 'text-black'
                                  }`}
                                >
                                  {service.name}
                                </h4>
                                <p className={`text-xs ${isSelected ? 'text-gray-200' : 'text-gray-500'}`}>
                                  Duration:{' '}
                                  <span className="font-medium">
                                    {service.duration}
                                  </span>
                                </p>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <span
                                  className={`text-sm font-semibold ${
                                    isSelected ? 'text-white' : 'text-gray-900'
                                  }`}
                                >
                                  From ${service.price.toFixed(0)}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 05. Time Selection + Continue (only after service is chosen) */}
        {selectedDate && selectedShop && selectedDesigner && selectedService && (
          <section ref={timeSectionRef} className="space-y-6">
            <div className="flex items-center justify-between gap-6 mb-2 border-b border-black pb-4">
              <h1 className="text-3xl md:text-4xl font-normal text-black mb-2 tracking-tight uppercase flex items-center gap-2">
                <span className="bg-black text-white text-sm font-bold px-2 py-1">05</span>
                Select Time
              </h1>
            </div>
                <div className="space-y-4">
                  {!hasTimeSlots ? (
                    <p className="text-gray-500 text-sm">
                      No available time slots for this date. Please select a different date.
                    </p>
                  ) : (
                    <>
                      {dynamicTimeSlots.morning.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1">Morning</span>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {dynamicTimeSlots.morning.map((time) => {
                              const isSelected = time === selectedTime;
                              return (
                                <button
                                  key={time}
                                  onClick={() => setSelectedTime(time)}
                                  className={`py-2 px-2 border text-xs md:text-sm transition-all ${
                                    isSelected
                                      ? 'bg-black text-white font-normal uppercase border border-black'
                                      : 'border-black text-black hover:bg-white bg-[#F4F4F4]'
                                  }`}
                                >
                                  {time}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {dynamicTimeSlots.afternoon.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1">Afternoon</span>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {dynamicTimeSlots.afternoon.map((time) => {
                              const isSelected = time === selectedTime;
                              return (
                                <button
                                  key={time}
                                  onClick={() => setSelectedTime(time)}
                                  className={`py-2 px-2 border text-xs md:text-sm transition-all ${
                                    isSelected
                                      ? 'bg-black text-white font-normal uppercase border border-black'
                                      : 'border-black text-black hover:bg-white bg-[#F4F4F4]'
                                  }`}
                                >
                                  {time}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {dynamicTimeSlots.evening.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1">Evening</span>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {dynamicTimeSlots.evening.map((time) => {
                              const isSelected = time === selectedTime;
                              return (
                                <button
                                  key={time}
                                  onClick={() => setSelectedTime(time)}
                                  className={`py-2 px-2 border text-xs md:text-sm transition-all ${
                                    isSelected
                                      ? 'bg-black text-white font-normal uppercase border border-black'
                                      : 'border-black text-black hover:bg-white bg-[#F4F4F4]'
                                  }`}
                                >
                                  {time}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}

        {/* 06. Customer Details (only after time is chosen) */}
        {selectedDate && selectedShop && selectedDesigner && selectedService && selectedTime && (
          <section ref={contactSectionRef} className="space-y-6">
            <div className="flex items-center justify-between gap-6 mb-2 border-b border-black pb-4">
              <h1 className="text-3xl md:text-4xl font-normal text-black mb-2 tracking-tight uppercase flex items-center gap-2">
                <span className="bg-black text-white text-sm font-bold px-2 py-1">06</span>
                Your Details
              </h1>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="customer-name" className="text-sm font-medium text-gray-600">
                  Full Name
                </label>
                <input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-white border border-black px-4 py-3 text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="customer-phone" className="text-sm font-medium text-gray-600">
                  Mobile Number
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 0400 000 000"
                  className="w-full bg-white border border-black px-4 py-3 text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
                />
              </div>
            </div>
            <div className="pt-10 flex justify-end">
              <button
                type="button"
                onClick={resolveCustomerAndGoToDeposit}
                className="bg-black hover:bg-gray-800 text-white font-normal uppercase tracking-widest px-8 py-3 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={
                  !selectedDate ||
                  !selectedTime ||
                  !selectedService ||
                  !selectedDesigner ||
                  !selectedShop ||
                  !customerName.trim() ||
                  !customerPhone.trim() ||
                  loadingCustomer
                }
              >
                <span>{loadingCustomer ? 'Checking customer...' : 'Continue to Payment'}</span>
                {!loadingCustomer && <span className="material-symbols-outlined text-sm">arrow_forward</span>}
              </button>
            </div>
          </section>
        )}
        </div>

      </main>
      {/* Sticky summary bar removed: UX now advances automatically on selection */}
    </div>
  );
}