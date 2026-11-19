'use client';

import { useState } from 'react';
import { HOONS_LOCATIONS } from '@/lib/hoons-locations';
import {
  allDemoStaff, demoReservationService, formatDemoDay, formatDemoPrice, formatDemoTime, useHoonsDemo,
} from '@/lib/hoons-booking-demo';
import BookingShell from '../booking-shell';
import styles from '../booking.module.css';

export default function BookingLookup({ initialReference }: { initialReference: string }) {
  const [reference, setReference] = useState(initialReference);
  const [submitted, setSubmitted] = useState(initialReference.trim().toUpperCase());
  const demo = useHoonsDemo();
  const appointment = demo.reservations.find((record) => record.reference === submitted);
  const location = HOONS_LOCATIONS.find(({ id }) => id === appointment?.locationId);
  const stylist = allDemoStaff(demo).find(({ id }) => id === appointment?.staffId);
  const service = appointment && demoReservationService(demo, appointment);

  return (
    <BookingShell lookup>
      <main className={styles.main}>
        <div className={styles.introduction}>
          <div className={styles.kicker}>HOONS online booking</div>
          <h1>My booking</h1>
          <p>Find a demo booking made on this browser.</p>
        </div>
        <section className={`${styles.panel} ${styles.lookup}`} aria-label="Find a demo booking">
          <form className={styles.fields} onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(reference.trim().toUpperCase());
          }}>
            <label>Booking reference
              <input required maxLength={30} placeholder="HOONS-XXXXXXXX" value={reference} onChange={(event) => setReference(event.target.value)} />
            </label>
            <div><button type="submit" className={styles.primary}>Find booking</button></div>
          </form>
          <div aria-live="polite">
            {appointment && location && stylist && service ? (
              <dl className={styles.customerSummary}>
                <div><dt>Location</dt><dd>{location.name}</dd></div>
                <div><dt>Designer</dt><dd>{stylist.name}</dd></div>
                <div><dt>Service</dt><dd>{service.name}</dd></div>
                <div><dt>Sydney time</dt><dd>{formatDemoDay(appointment.day)}, {formatDemoTime(appointment.start)}</dd></div>
                <div><dt>Simulated deposit</dt><dd>{formatDemoPrice(service.deposit)}</dd></div>
              </dl>
            ) : submitted && <p className={styles.feedback}>No demo booking with that reference was found on this browser.</p>}
          </div>
        </section>
      </main>
    </BookingShell>
  );
}
