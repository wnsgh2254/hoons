import React from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowUpRight } from 'lucide-react';

// Pages
import Home from './pages/Home';
import Locations from './pages/Locations';
import Designers from './pages/Designers';
import BookingWizard from './pages/Booking/BookingWizard';
import CheckReservation from './pages/CheckReservation';

const Header = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Minimal Sticky Header */}
      <header className="fixed top-0 left-0 w-full z-50 mix-blend-difference text-white">
        {/* Adjusted padding to px-6 md:px-12 for alignment */}
        {/* Changed items-start to items-center for vertical alignment */}
        <div className="w-full px-6 md:px-12 py-6 flex items-center justify-between text-xs md:text-sm font-light tracking-widest uppercase leading-none">
          
          {/* Left: Brand Logo (Text) */}
          <Link to="/" className="block z-50 group" onClick={closeMenu}>
            <span className="font-display text-3xl font-medium tracking-tighter group-hover:opacity-70 transition-opacity">
              HAEYOOM
            </span>
          </Link>

          {/* Center: Navigation (Desktop) */}
          <nav className="hidden md:flex space-x-12 absolute left-1/2 transform -translate-x-1/2">
            <Link to="/locations" className="hover:underline">Locations</Link>
            <Link to="/designers" className="hover:underline">Designers</Link>
            <Link to="/check" className="hover:underline">My Booking</Link>
          </nav>

          {/* Right: Book Now / Mobile Menu */}
          <div className="flex flex-col items-end gap-1">
             <div className="md:hidden">
                <button className="uppercase" onClick={toggleMenu}>
                   {isOpen ? 'Close' : 'Menu'}
                </button>
             </div>
             <Link to="/booking" className="hidden md:flex items-center gap-1 hover:underline">
                <span>Book Now</span>
                <ArrowUpRight size={12} />
             </Link>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 z-40 bg-[#F4F4F4] text-black transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} md:hidden pt-24 px-4`}>
        <nav className="flex flex-col space-y-0 border-t border-black">
          {[
            { name: 'Home', path: '/' },
            { name: 'Locations', path: '/locations' },
            { name: 'Designers', path: '/designers' },
            { name: 'My Booking', path: '/check' },
            { name: 'Book Now', path: '/booking' },
          ].map((item) => (
            <Link 
              key={item.name}
              to={item.path} 
              onClick={closeMenu}
              className="text-4xl font-display font-light uppercase tracking-tighter py-6 border-b border-black hover:bg-black hover:text-white transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
};

const Footer = () => (
  <footer className="bg-[#F4F4F4] text-black pt-20 pb-0 overflow-hidden">
    {/* Adjusted padding to px-6 md:px-12 */}
    <div className="px-6 md:px-12 mb-20">
       <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-xs uppercase tracking-widest border-t border-black pt-6">
          <div>
            <span className="block mb-4 text-gray-500">Contact</span>
            <p>info@haeyoom.com</p>
            <p>+82 2 555 0123</p>
          </div>
          <div>
            <span className="block mb-4 text-gray-500">Address</span>
            <p>Gangnam-gu</p>
            <p>Seoul, Korea</p>
          </div>
          <div>
             <span className="block mb-4 text-gray-500">Legal</span>
             <p>Privacy Policy</p>
             <p>Terms of Service</p>
          </div>
          <div className="text-right md:text-left">
             <span className="block mb-4 text-gray-500">Social</span>
             <p>Instagram</p>
          </div>
       </div>
    </div>

    {/* Massive Footer Branding - Text filling width */}
    <div className="w-full px-6 md:px-12 pb-12 border-t border-black md:border-t-0">
        <h1 className="flex justify-between w-full font-display text-[18vw] leading-[0.8] tracking-tighter select-none pointer-events-none">
          {"HAEYOOM".split('').map((char, i) => (
            <span key={i}>{char}</span>
          ))}
        </h1>
    </div>
  </footer>
);

const App = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col font-light bg-[#F4F4F4] text-black selection:bg-black selection:text-white">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/locations" element={<Locations />} />
            <Route path="/designers" element={<Designers />} />
            <Route path="/booking" element={<BookingWizard />} />
            <Route path="/check" element={<CheckReservation />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;