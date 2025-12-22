import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            헤윰
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-gray-700 hover:text-gray-900 transition-colors"
            >
              홈
            </Link>
            <Link
              href="/booking"
              className="text-gray-700 hover:text-gray-900 transition-colors"
            >
              예약하기
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}



