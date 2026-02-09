'use client';

interface ScheduleGridHeaderProps {
  isWeekViewMode: boolean;
  weekViewDesignerId: number | null;
  weekDates: string[];
  visibleDesigners: string[];
  allDesigners: Array<{ id: number; name: string }>;
  selectedDesignerFilter: string;
  weekViewStartDate: string;
  openDesignerDropdown: number | null;
  onDesignerDropdownToggle: (designerId: number | null) => void;
  onOpenWeekView: (designerId: number, designerName: string) => void;
  onCloseWeekView: () => void;
  onOpenRestriction: (designerId: number, designerName: string) => void;
  onOpenHolidayModal: (designerId: number, designerName: string) => void;
}

export default function ScheduleGridHeader({
  isWeekViewMode,
  weekViewDesignerId,
  weekDates,
  visibleDesigners,
  allDesigners,
  selectedDesignerFilter,
  weekViewStartDate,
  openDesignerDropdown,
  onDesignerDropdownToggle,
  onOpenWeekView,
  onCloseWeekView,
  onOpenRestriction,
  onOpenHolidayModal,
}: ScheduleGridHeaderProps) {
  if (!isWeekViewMode) {
    // Day view header
    return (
      <div 
        className="sticky top-0 bg-[#f8f9fc] shadow-sm" 
        style={{
          position: 'sticky', 
          top: 0,
          zIndex: 100,
          width: 'max-content',
          minWidth: '100%'
        }}
      >
        {/* First row: Time header + Date headers */}
        <div className="flex border-b border-[#e2e8f0]">
          {/* Time column header - sticky left */}
          <div 
            className="w-20 shrink-0 border-r border-[#e2e8f0] bg-[#f8f9fc] flex flex-col items-center justify-center p-2"
            style={{ 
              position: 'sticky', 
              left: 0,
              zIndex: 50,
              backgroundColor: '#f8f9fc',
              boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
            }}
          >
            <span className="text-xs font-medium text-gray-600">시간</span>
          </div>
          {/* Week date headers */}
          {weekDates.map((dateStr) => {
            const date = new Date(dateStr);
            const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const designerColumnWidth = visibleDesigners.length * 150; // Each designer column is min 150px
            return (
              <div key={dateStr} className="border-r border-[#e2e8f0] bg-[#f8f9fc] shrink-0" style={{ width: `${designerColumnWidth}px` }}>
                <div className="px-2 py-2 text-center border-b border-[#e2e8f0] flex items-center justify-center" style={{ minHeight: '40px' }}>
                  <p className="text-xs font-bold text-[#0d121b]">{month}-{day} ({dayName})</p>
                </div>
                {/* Designer headers for this date - hide when filtering by specific designer */}
                {selectedDesignerFilter === '전체' && (
                  <div className="grid" style={{ gridTemplateColumns: `repeat(${visibleDesigners.length}, 150px)` }}>
                    {visibleDesigners.map((name) => {
                      const designer = allDesigners.find((d) => d.name === name);
                      const designerId = designer?.id;
                      return (
                        <div
                          key={`${dateStr}-${name}`}
                          className="relative px-2 py-2 bg-white/50 backdrop-blur-sm border-r border-[#e2e8f0] last:border-r-0 flex items-center justify-center"
                          style={{ minHeight: '40px' }}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDesignerDropdownToggle(
                                openDesignerDropdown === designerId ? null : designerId || null,
                              );
                            }}
                            className="w-full text-center hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <p className="text-xs font-bold text-[#0d121b] truncate">{name}</p>
                          </button>
                          {designerId &&
                            openDesignerDropdown === designerId && (
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px]">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenWeekView(designerId, name);
                                    onDesignerDropdownToggle(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                                >
                                  일주일 보기
                                </button>
                                {isWeekViewMode && weekViewDesignerId === designerId && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onCloseWeekView();
                                      onDesignerDropdownToggle(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    일주일 보기 종료
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenRestriction(designerId, name);
                                    onDesignerDropdownToggle(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  예약금지 등록
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenHolidayModal(designerId, name);
                                    onDesignerDropdownToggle(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg"
                                >
                                  임의 휴일 및 특근 설정
                                </button>
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Week view header
  return (
    <div 
      className="sticky top-0 flex border-b border-[#e2e8f0] bg-[#f8f9fc] shadow-sm"
      style={{ position: 'sticky', top: 0, zIndex: 100 }}
    >
      {/* Time column header */}
      <div className="w-20 shrink-0 border-r border-[#e2e8f0] bg-[#f8f9fc] flex flex-col items-center justify-center p-2">
        <span className="text-xs font-medium text-gray-600">시간</span>
      </div>
      {weekViewDesignerId ? (
        <div className="grid flex-1 relative" style={{ gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))' }}>
          {/* Vertical column dividers for week view header */}
          {Array.from({ length: 7 }).map((_, colIndex) => {
            const columnWidth = 100 / 7;
            return (
              <div
                key={`week-header-divider-${colIndex}`}
                className="absolute border-r border-[#e2e8f0] pointer-events-none z-0"
                style={{
                  left: `${(colIndex + 1) * columnWidth}%`,
                  width: '1px',
                  top: 0,
                  bottom: 0,
                  height: '100%',
                }}
              />
            );
          })}
          {Array.from({ length: 7 }).map((_, dayIndex) => {
            const currentDate = new Date(weekViewStartDate);
            currentDate.setDate(currentDate.getDate() + dayIndex);
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayName = ['일', '월', '화', '수', '목', '금', '토'][currentDate.getDay()];
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            return (
              <div
                key={dayIndex}
                className="relative px-2 py-2 bg-white/50 backdrop-blur-sm z-10"
              >
                <div className="text-center">
                  <p className="text-xs font-bold text-[#0d121b]">{dayName}</p>
                  <p className="text-[10px] text-[#64748b]">{month}-{day}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
