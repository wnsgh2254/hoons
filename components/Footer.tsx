export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">헤윰</h3>
            <p className="text-gray-400">
              프리미엄 헤어살롱
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">연락처</h4>
            <p className="text-gray-400">전화: 02-1234-5678</p>
            <p className="text-gray-400">이메일: info@hoons.com</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">운영시간</h4>
            <p className="text-gray-400">월-토: 10:00 - 20:00</p>
            <p className="text-gray-400">일요일: 휴무</p>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
          <p>&copy; 2024 헤윰. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}



