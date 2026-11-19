import Image from 'next/image';
import Link from 'next/link';

export default function MainFooter({ warm = false, showBooking = false }: { warm?: boolean; showBooking?: boolean }) {
  return (
    <footer style={showBooking ? { paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' } : undefined} className={warm
      ? 'bg-[#fffaf4] px-[6.25vw] py-12 text-center text-[#624f44] md:py-16'
      : 'overflow-hidden bg-black pt-20 pb-10 text-white'}>
      {warm ? (
        <Link
          href="/"
          aria-label="HOONS home"
          className="mb-5 inline-block text-[2rem] leading-none tracking-[-0.045em] text-[#3c2b23] [font-family:Didot,Baskerville,Georgia,serif]"
        >
          HOONS
        </Link>
      ) : (
        <div className="mb-8 flex justify-center px-6 md:px-12">
          <Image
            src="/images/logo-white.png"
            alt="HOONS"
            width={2400}
            height={2400}
            style={{ height: '48px', width: 'auto' }}
            priority
          />
        </div>
      )}
      <p className={warm ? 'text-xs leading-loose' : 'px-6 pb-8 text-center text-xs text-gray-200 md:px-12'}>
        {showBooking && (
          <>
            <Link href="/booking/lookup" className="hover:underline">
              My booking
            </Link>
            {' | '}
          </>
        )}
        © Copyright 2026 HOONS |{' '}
        <Link href="/privacy-policy" className="hover:underline">
          Privacy Policy
        </Link>
        {' | '}
        <Link href="/appointment-policy" className="hover:underline">
          Appointment Policy
        </Link>
      </p>
    </footer>
  );
}
