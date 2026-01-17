import Image from 'next/image';
import Link from 'next/link';

export default function MainFooter() {
    return (
      <footer className="bg-[#000000] text-white pt-20 pb-10 overflow-hidden">
        {/* Adjusted padding to px-6 md:px-12 */}
        <div className="flex justify-center px-6 md:px-12 mb-8">
            <Image 
                src="/images/logo-white.png" 
                alt="HAEYOOM" 
                width={2400} 
                height={2400}
                style={{ 
                    // mixBlendMode: 'normal',
                    height: '48px',
                    width: 'auto'
                }}
                priority
            />
        </div>

        {/* Copyright and Policy Links */}
        <div className="px-6 md:px-12 pb-8">
          <p className="text-xs text-gray-200 text-center">
            © Copyright 2026 HAEYOOM |{' '}
            <Link href="/privacy-policy" className="hover:underline">
              Privacy Policy
            </Link>
            {' | '}
            <Link href="/appointment-policy" className="hover:underline">
              Appointment Policy
            </Link>
          </p>
        </div>
      </footer>
    );
  }