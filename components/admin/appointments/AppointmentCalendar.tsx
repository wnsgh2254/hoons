'use client';

import { buildDateFromDay, getSydneyToday } from '@/lib/utils/appointment-utils';

interface AppointmentCalendarProps {
  selectedDate: string;
  dayCounts: Record<number, number>;
  showBookingCount: boolean;
  onDateSelect: (date: string) => void;
}

export default function AppointmentCalendar({
  selectedDate,
  dayCounts,
  showBookingCount,
  onDateSelect,
}: AppointmentCalendarProps) {
  const monthLabel = new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const monthKey = selectedDate.slice(0, 7); // YYYY-MM
  const selectedDayNumber = Number(selectedDate.split('-')[2] || '0');

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5.5 shrink-0">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => {
            const date = new Date(selectedDate);
            date.setMonth(date.getMonth() - 1);
            onDateSelect(date.toISOString().split('T')[0]);
          }}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-lg">chevron_left</span>
        </button>
        <span className="text-lg font-semibold text-gray-800">{monthLabel}</span>
        <button
          type="button"
          onClick={() => {
            const date = new Date(selectedDate);
            date.setMonth(date.getMonth() + 1);
            onDateSelect(date.toISOString().split('T')[0]);
          }}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-lg">chevron_right</span>
        </button>
      </div>
      {/* Comment: Always show booking count - toggle removed */}
      <div className="grid grid-cols-7 gap-2 text-sm text-gray-500 mb-1.5 font-medium">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <span key={d} className="text-center">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {(() => {
          const [year, month] = monthKey.split('-').map((v) => Number(v));
          const daysInMonth = new Date(year, month, 0).getDate();
          const firstDay = new Date(`${monthKey}-01`).getDay();
          const cells: (number | null)[] = [
            ...Array(firstDay).fill(null),
            ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
          ];
          return cells.map((day, idx) => {
            if (!day) {
              return <div key={idx} className="h-12" />;
            }
            const isSelected = day === selectedDayNumber;
            const hasBookings = !!dayCounts[day];
            const bookingCount = dayCounts[day] || 0;
            const cellDate = buildDateFromDay(selectedDate, day);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onDateSelect(cellDate);
                }}
                className={`h-12 w-full rounded-lg flex flex-col items-center justify-center text-sm transition-all font-medium
                  ${
                    isSelected
                      ? 'bg-black text-white shadow-md'
                      : 'bg-white text-gray-800 hover:bg-gray-100 border border-transparent hover:border-gray-200'
                  }`}
              >
                <span>{day}</span>
                {hasBookings && (
                  showBookingCount ? (
                    <span className={`mt-0.5 text-[10px] font-bold ${isSelected ? 'text-white' : 'text-emerald-600'}`}>
                      {bookingCount}
                    </span>
                  ) : (
                    <span className="mt-1 h-1 w-4 rounded-full bg-emerald-500" />
                  )
                )}
              </button>
            );
          });
        })()}
      </div>
    </div>
  );
}
