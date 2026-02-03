export default function AppointmentPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F4F4F4] pt-32 pb-32">
    
      {/* Content Section */}
      <div className="px-6 md:px-12">
        <div className="max-w-4xl mx-auto space-y-16">
            
          {/* Title integrated into body */}
          <div>
            <h1 className="font-display font-light text-4xl md:text-7xl uppercase tracking-tighter leading-[0.9] mb-12">
              Appointment<br />Policy
            </h1>
            <div className="w-full h-[1px] bg-black mb-12"></div>
          </div>

          {/* Intro */}
          <section className="space-y-6 text-sm md:text-base font-light leading-relaxed">
            <p>
              At HAEYOOM, we value both your time and the time of our stylists.
            </p>
            <p>
              To ensure a calm, thoughtful, and high-quality experience for every guest, we kindly ask you to review the following appointment guidelines.
            </p>
          </section>

          {/* Section 1 */}
          <section className="border-t border-black pt-8">
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-tighter mb-6">Appointment Confirmation</h2>
            <div className="space-y-4 text-sm md:text-base font-light leading-relaxed">
              <p>All appointments require confirmation.</p>
              <p>After making a booking, you will receive a confirmation message from HAEYOOM via SMS.</p>
              <p>Please confirm your appointment by replying <strong>YES</strong>.</p>
              <p>Appointments that are not confirmed may be released to other clients.</p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="border-t border-black pt-8">
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-tighter mb-6">Arrival Time</h2>
            <div className="space-y-4 text-sm md:text-base font-light leading-relaxed">
              <p>We recommend arriving a few minutes before your scheduled appointment time to allow for a relaxed start to your service.</p>
              <p>If you arrive <strong>more than 10 minutes late</strong>, your appointment <strong>may need to be cancelled or adjusted</strong>, as it can affect the experience of other guests.</p>
              <p>In such cases, we appreciate your understanding.</p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="border-t border-black pt-8">
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-tighter mb-6">Cancellations & Rescheduling</h2>
            <div className="space-y-4 text-sm md:text-base font-light leading-relaxed">
              <p>If you need to cancel or reschedule your appointment, we kindly ask that you notify us as early as possible.</p>
              <p>Providing advance notice allows us to offer the time to another client and maintain a smooth schedule for our team.</p>
              <p>Frequent last-minute changes may impact future booking availability.</p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="border-t border-black pt-8">
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-tighter mb-6">No-Shows</h2>
            <div className="space-y-4 text-sm md:text-base font-light leading-relaxed">
              <p>Appointments that are confirmed but not attended without prior notice may be considered a no-show.</p>
              <p>To ensure fairness to all clients, repeated no-shows may result in limitations on future bookings.</p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="border-t border-black pt-8">
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-tighter mb-6">Policy Updates</h2>
            <div className="space-y-4 text-sm md:text-base font-light leading-relaxed">
              <p>This Appointment Policy may be updated from time to time.</p>
              <p>The most current version will always be available on our website.</p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="border-t border-black pt-8">
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-tighter mb-6">Contact</h2>
            <div className="space-y-4 text-sm md:text-base font-light leading-relaxed">
              <p>If you have any questions regarding your appointment, please feel free to contact us.</p>
              <p className="font-bold mt-4">HAEYOOM</p>
              <p className="font-mono">Phone: +61 432 328 002</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
