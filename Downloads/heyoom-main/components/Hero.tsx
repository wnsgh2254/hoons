import Link from 'next/link';
import Button from './Button';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
      <div className="absolute inset-0 bg-[url('/images/hero-bg.jpg')] bg-cover bg-center opacity-10"></div>
      <div className="relative z-10 container mx-auto px-4 text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
          헤윰
        </h1>
        <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-2xl mx-auto">
          당신의 아름다움을 완성하는 프리미엄 헤어살롱
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/booking">
            <Button>예약하기</Button>
          </Link>
          <Link href="#gallery">
            <Button variant="outline">갤러리 보기</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}



