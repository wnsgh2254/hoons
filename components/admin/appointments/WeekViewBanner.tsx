'use client';

interface WeekViewBannerProps {
  designerName: string;
  onBackToNormalView: () => void;
}

export default function WeekViewBanner({
  designerName,
  onBackToNormalView,
}: WeekViewBannerProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between shadow-sm">
      <span className="text-sm font-bold text-gray-900">{designerName}</span>
      <button
        onClick={onBackToNormalView}
        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        일반 보기
      </button>
    </div>
  );
}
