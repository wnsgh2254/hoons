'use client';

interface CurrentTimeLineProps {
  currentSydneyTime: { top: number; label: string } | null;
}

export default function CurrentTimeLine({ currentSydneyTime }: CurrentTimeLineProps) {
  if (!currentSydneyTime) return null;

  return (
    <div
      className="absolute w-full border-t-2 border-[#135bec] z-10 pointer-events-none flex items-center"
      style={{ top: currentSydneyTime.top + 8 }} // Add padding offset
    >
      <div className="absolute left-0 -translate-y-1/2 bg-[#135bec] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-r-md">
        {currentSydneyTime.label}
      </div>
      <div className="size-2 rounded-full bg-[#135bec] -ml-1" />
    </div>
  );
}
