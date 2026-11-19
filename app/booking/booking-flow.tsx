'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CalendarDays, Check, CreditCard, MapPin, ShieldCheck } from 'lucide-react';
import { demoServicesForStaff } from '@/lib/hoons-demo-services';
import { HOONS_LOCATIONS, type HoonsLocationId } from '@/lib/hoons-locations';
import {
  createDemoReservation, demoDays, demoSlots, demoStaff, type DemoReservation,
  formatDemoDay, formatDemoPrice, formatDemoTime, useHoonsDemo,
} from '@/lib/hoons-booking-demo';
import BookingShell from './booking-shell';
import styles from './booking.module.css';

const STEPS = ['Appointment', 'Your details', 'Deposit'] as const;
const SAMPLE_CUSTOMER = { name: 'Alex Morgan', email: 'alex@example.com', phone: '0491 570 006' };
const EMPTY_CUSTOMER = { name: '', email: '', phone: '' };
const AUSTRALIAN_MOBILE = /^(?:\+?61|0)4\d{8}$/;

export default function BookingFlow({ initialLocation }: { initialLocation?: HoonsLocationId }) {
  const demo = useHoonsDemo();
  const [step, setStep] = useState(1);
  const [locationId, setLocationId] = useState<HoonsLocationId | undefined>(initialLocation);
  const [staffId, setStaffId] = useState<DemoReservation['staffId']>();
  const [serviceId, setServiceId] = useState<DemoReservation['serviceId']>();
  const [day, setDay] = useState('');
  const [time, setTime] = useState<number>();
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [testCard, setTestCard] = useState('approved');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reservation, setReservation] = useState<DemoReservation>();
  const stepHeading = useRef<HTMLHeadingElement>(null);

  const locations = HOONS_LOCATIONS.filter(({ id }) => !demo.closedLocations.includes(id));
  const location = locations.find(({ id }) => id === locationId);
  const stylists = demoStaff(demo).filter((member) => member.locationId === location?.id);
  const stylist = stylists.find(({ id }) => id === staffId);
  const services = stylist ? demoServicesForStaff(demo.catalog, stylist.id) : [];
  const service = services.find(({ id }) => id === serviceId);
  const days = demoDays();
  const slots = stylist && service && days.includes(day) ? demoSlots(demo, stylist, service, day) : [];
  const selection = location && stylist && service && time !== undefined && slots.includes(time)
    ? { locationId: location.id, staffId: stylist.id, serviceId: service.id, day, start: time }
    : null;

  useEffect(() => {
    if (step !== 1) stepHeading.current?.focus();
  }, [step]);

  function changeStep(next: number) {
    setStep(next);
    setError('');
    if (next === 1) window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function checkCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (customer.name.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }
    if (!AUSTRALIAN_MOBILE.test(customer.phone.replace(/[\s()-]/g, ''))) {
      setError('Enter an Australian mobile number or use the sample details.');
      return;
    }
    changeStep(3);
  }

  async function finishBooking() {
    if (!selection || !service || saving) return;
    if (service.deposit > 0 && testCard === 'declined') {
      setError('The test card was declined. Choose the approved demo card and try again.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = await createDemoReservation(selection, service);
      if (saved) {
        setReservation(saved);
        changeStep(4);
      } else {
        setError('This appointment changed while you were booking. Go back to choose a new time.');
      }
    } catch {
      setError('This browser could not save the demo booking. Check that local storage is available and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <BookingShell>
      <main className={styles.main}>
        <div className={styles.introduction}>
          <div className={styles.kicker}>HOONS online booking</div>
          <h1>Book an appointment</h1>
          <p>Try the booking experience with sample appointments and demo payments.</p>
        </div>

        <ol className={styles.steps} aria-label="Booking steps">
          {STEPS.map((label, index) => (
            <li key={label} aria-current={step === index + 1 ? 'step' : undefined} data-done={step > index + 1}>
              <span>{step > index + 1 ? <Check size={14} aria-hidden="true" /> : index + 1}</span>
              {label}
            </li>
          ))}
        </ol>

        {step === 4 && reservation ? (
          <section className={`${styles.panel} ${styles.confirmation}`}>
            <Check size={28} className={styles.successIcon} aria-hidden="true" />
            <h2 ref={stepHeading} tabIndex={-1}>Demo booking confirmed</h2>
            <p>Your reference is <strong>{reservation.reference}</strong>.</p>
            <p>{reservation.serviceSnapshot?.deposit ? 'The deposit payment was simulated.' : 'This service has no deposit.'} No payment or messages were sent.</p>
            <div className={styles.actions}>
              <Link className={styles.primary} href={`/booking/lookup?reference=${reservation.reference}`}>View demo booking <ArrowRight size={16} /></Link>
              <Link className={styles.secondary} href="/">Back to home</Link>
            </div>
          </section>
        ) : (
          <div className={styles.grid}>
            <section className={styles.panel} aria-labelledby="step-heading">
              <h2 id="step-heading" ref={stepHeading} tabIndex={-1}>
                {step === 1 ? 'Choose your appointment' : step === 2 ? 'Your details' : 'Review and deposit'}
              </h2>

              {step === 1 && (
                <form onSubmit={(event) => { event.preventDefault(); if (selection) changeStep(2); }}>
                  <fieldset className={styles.fieldset}>
                    <legend>Location</legend>
                    {locations.length === 0 && <p className={styles.hint}>Online booking is currently paused for all locations.</p>}
                    {locationId && !location && <p className={styles.hint}>That location is not currently accepting online bookings.</p>}
                    <div className={styles.options}>
                      {locations.map((venue) => (
                        <label className={styles.option} key={venue.id}>
                          <input type="radio" name="location" value={venue.id} checked={location?.id === venue.id} onChange={() => {
                            setLocationId(venue.id); setStaffId(undefined); setServiceId(undefined); setDay(''); setTime(undefined);
                          }} />
                          <strong>{venue.name}</strong><span>{venue.suburb}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className={styles.fieldset} disabled={!location}>
                    <legend>Designer</legend>
                    {!location && <p className={styles.hint}>Choose a location first.</p>}
                    {location && stylists.length === 0 && <p className={styles.hint}>There are no designers assigned here. Try another location.</p>}
                    <div className={styles.options}>
                      {stylists.map((member) => (
                        <label className={styles.option} key={member.id}>
                          <input type="radio" name="designer" value={member.id} checked={stylist?.id === member.id} onChange={() => {
                            setStaffId(member.id); setServiceId(undefined); setDay(''); setTime(undefined);
                          }} />
                          <strong lang={member.id === 'director' ? 'ko' : undefined}>{member.name}</strong>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className={styles.fieldset} disabled={!stylist}>
                    <legend>Service</legend>
                    {!stylist ? <p className={styles.hint}>Choose a designer to view the sample services.</p>
                      : services.length === 0 ? <p className={styles.hint}>This designer has no services available for online booking.</p> : (
                      <div className={styles.options}>
                        {services.map((item) => (
                          <label key={item.id} className={styles.option}>
                            <input type="radio" name="service" value={item.id} checked={service?.id === item.id} onChange={() => {
                              setServiceId(item.id); setDay(''); setTime(undefined);
                            }} />
                            <strong>{item.name}</strong>
                            <span>{item.minutes} min · {formatDemoPrice(item.price)}</span>
                            <span>{item.deposit ? `${formatDemoPrice(item.deposit)} deposit` : 'No deposit'}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </fieldset>

                  <fieldset className={styles.fieldset} disabled={!stylist || !service}>
                    <legend>Date and time</legend>
                    {!stylist || !service ? <p className={styles.hint}>Choose a service to see times.</p> : (
                      <>
                        <p className={styles.hint}>Sample availability in Sydney time.</p>
                        <div className={styles.pills}>
                          {days.map((date) => (
                            <label className={styles.pill} key={date}>
                              <input type="radio" name="date" value={date} checked={day === date} onChange={() => {
                                setDay(date); setTime(undefined);
                              }} />
                              {formatDemoDay(date)}
                            </label>
                          ))}
                        </div>
                        {day && slots.length === 0 && <p className={styles.hint}>No appointments are available on this day.</p>}
                        {slots.length > 0 && (
                          <div className={styles.pills}>
                            {slots.map((start) => (
                              <label className={styles.pill} key={start}>
                                <input type="radio" name="time" value={start} checked={time === start} onChange={() => setTime(start)} />
                                {formatDemoTime(start)}
                              </label>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </fieldset>

                  <div className={styles.actions}>
                    <button className={styles.primary} type="submit" disabled={!selection}>
                      Continue to your details <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                </form>
              )}

              {!selection && step > 1 && (
                <p className={styles.feedback} role="alert">This appointment is no longer available. Go back to choose another time.</p>
              )}

              {step === 2 && (
                <form onSubmit={checkCustomer}>
                  <p className={styles.hint}>Use the example details to try this form without entering personal information.</p>
                  <button type="button" className={styles.sample} onClick={() => { setCustomer(SAMPLE_CUSTOMER); setError(''); }}>
                    Use sample details
                  </button>
                  <div className={styles.fields}>
                    <label>Full name<input required autoComplete="name" maxLength={100} value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} /></label>
                    <label>Email address<input required type="email" autoComplete="email" maxLength={160} value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} /></label>
                    <label>Mobile number<input required type="tel" autoComplete="tel" maxLength={24} value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} /></label>
                  </div>
                  {error && <p className={styles.feedback} role="alert">{error}</p>}
                  <div className={styles.actions}>
                    <button type="button" className={styles.secondary} onClick={() => changeStep(1)}><ArrowLeft size={16} aria-hidden="true" /> Back</button>
                    <button type="submit" className={styles.primary} disabled={!selection}>Review booking <ArrowRight size={16} aria-hidden="true" /></button>
                  </div>
                </form>
              )}

              {step === 3 && service && (
                <>
                  <dl className={styles.customerSummary}>
                    <div><dt>Name</dt><dd>{customer.name.trim()}</dd></div>
                    <div><dt>Email</dt><dd>{customer.email}</dd></div>
                    <div><dt>Mobile</dt><dd>{customer.phone}</dd></div>
                  </dl>
                  {service.deposit > 0 ? (
                    <fieldset className={styles.fieldset} disabled={saving}>
                      <legend><CreditCard size={18} aria-hidden="true" /> Demo card</legend>
                      <p className={styles.hint}>Choose a test result. No card details are needed.</p>
                      <div className={styles.options}>
                        <label className={styles.option}>
                          <input type="radio" name="test-card" value="approved" checked={testCard === 'approved'} onChange={() => { setTestCard('approved'); setError(''); }} />
                          <strong>Approved card</strong><span>Visa ending in 4242</span>
                        </label>
                        <label className={styles.option}>
                          <input type="radio" name="test-card" value="declined" checked={testCard === 'declined'} onChange={() => { setTestCard('declined'); setError(''); }} />
                          <strong>Declined card</strong><span>Visa ending in 0002</span>
                        </label>
                      </div>
                    </fieldset>
                  ) : <p className={styles.notice}><ShieldCheck size={18} aria-hidden="true" /> No deposit is required for this service.</p>}
                  {error && <p className={styles.feedback} role="alert">{error}</p>}
                  <div className={styles.actions}>
                    <button type="button" className={styles.secondary} disabled={saving} onClick={() => changeStep(2)}><ArrowLeft size={16} aria-hidden="true" /> Back</button>
                    <button type="button" className={styles.primary} disabled={!selection || saving} onClick={finishBooking}>
                      {saving ? 'Saving…' : service.deposit ? `Pay ${formatDemoPrice(service.deposit)} demo deposit` : 'Confirm demo booking'}
                    </button>
                  </div>
                </>
              )}
            </section>

            <aside className={styles.summary} aria-labelledby="summary-heading">
              <h2 id="summary-heading">Your appointment</h2>
              <div className={styles.summaryEntry}>
                <MapPin size={17} aria-hidden="true" />
                <div><strong>{location?.name ?? 'Location'}</strong><span>{location?.address ?? 'Choose a HOONS studio'}</span></div>
              </div>
              <div className={styles.summaryEntry}>
                <CalendarDays size={17} aria-hidden="true" />
                <div><strong>{day && time !== undefined ? `${formatDemoDay(day)}, ${formatDemoTime(time)}` : 'Date and time'}</strong><span>{stylist && service ? `${service.name} · ${stylist.name}` : 'Choose your designer and service'}</span></div>
              </div>
              <dl className={styles.totals}>
                <div><dt>Sample service total</dt><dd>{service ? formatDemoPrice(service.price) : '—'}</dd></div>
                <div><dt>Deposit due now</dt><dd>{service ? formatDemoPrice(service.deposit) : '—'}</dd></div>
                {service && service.deposit > 0 && <div><dt>Remaining at salon</dt><dd>{formatDemoPrice(service.price - service.deposit)}</dd></div>}
              </dl>
              <p className={styles.summaryNote}><ShieldCheck size={16} aria-hidden="true" /> Demo only. No real payment or appointment.</p>
            </aside>
          </div>
        )}
      </main>
    </BookingShell>
  );
}
