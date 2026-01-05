'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import AdminSidebar from '@/components/AdminSidebar';

// Comment: Dynamically import the app to avoid SSR issues with React Router
const ConceptualHairSalonApp = dynamic(
  () => import('../../haeyoom---conceptual-hair-salon/App'),
  { ssr: false }
);

export default function TestEnvPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Comment: Close sidebar when clicking outside or mouse leaves sidebar area
  useEffect(() => {
    if (!isSidebarOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const sidebar = document.getElementById('admin-sidebar');
      const hoverArea = document.getElementById('sidebar-hover-area');
      
      // Comment: Don't close if clicking inside sidebar or hover area
      if (sidebar && sidebar.contains(target)) {
        return;
      }
      if (hoverArea && hoverArea.contains(target)) {
        return;
      }
      
      setIsSidebarOpen(false);
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSidebarOpen]);

  return (
    <div className="bg-white text-slate-900 font-display antialiased overflow-hidden h-screen flex">
      <AdminSidebar isSidebarOpen={isSidebarOpen} />

      {/* Main content */}
      <main className={`flex-1 flex flex-col h-full overflow-hidden relative bg-white transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'ml-64' : ''
      }`}>
        {/* Comment: Hover area on top left to show sidebar */}
        <div
          id="sidebar-hover-area"
          className="fixed top-0 left-0 w-16 h-16 z-[60] cursor-pointer"
          onMouseEnter={() => setIsSidebarOpen(true)}
        />
        
        <div className="flex-1 overflow-auto bg-white">
          {/* Comment: Render the conceptual hair salon app directly */}
          <ConceptualHairSalonApp />
        </div>
      </main>
    </div>
  );
}
