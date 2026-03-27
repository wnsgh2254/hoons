'use client';

interface ScheduleGridHeaderProps {
  isWeekViewMode: boolean;
  weekViewDesignerId: number | null;
  weekDates: string[];
  visibleDesigners: string[];
  allDesigners: Array<{ id: number; name: string; shop_id?: number }>;
  allShops: Array<{ id: number; name: string }>;
  selectedDesignerFilter: string;
  weekViewStartDate: string;
  openDesignerDropdown: number | null;
  onDesignerDropdownToggle: (designerId: number | null) => void;
  onOpenWeekView: (designerId: number, designerName: string) => void;
  onCloseWeekView: () => void;
  onOpenRestriction: (designerId: number, designerName: string) => void;
  onOpenHolidayModal: (designerId: number, designerName: string) => void;
  onOpenAttendanceModal: (designerId: number, designerName: string) => void;
  canUseAttendanceManagement?: boolean;
  availableDesignerIds?: number[];
  weekViewAvailableDates?: Set<string>;
}

export default function ScheduleGridHeader({
  isWeekViewMode,
  weekViewDesignerId,
  weekDates,
  visibleDesigners,
  allDesigners,
  allShops,
  selectedDesignerFilter,
  weekViewStartDate,
  openDesignerDropdown,
  onDesignerDropdownToggle,
  onOpenWeekView,
  onCloseWeekView,
  onOpenRestriction,
  onOpenHolidayModal,
  onOpenAttendanceModal,
  canUseAttendanceManagement = false,
  availableDesignerIds = [],
  weekViewAvailableDates = new Set(),
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
          width: 'fit-content',
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
            return (
              <div key={dateStr} className="border-r border-[#e2e8f0] bg-[#f8f9fc] flex-1" style={{ minWidth: `${visibleDesigners.length * 150}px` }}>
                {/* Shop grouping + Designer headers - hide only when a specific designer is selected */}
                {(selectedDesignerFilter === '전체' ||
                  selectedDesignerFilter === '전체(휴무 제외)') && (() => {
                  // Compute shop groups from visible designers
                  const shopGroups: Array<{ shopId: number | null; shopName: string; count: number }> = [];
                  visibleDesigners.forEach((name) => {
                    const designer = allDesigners.find((d) => d.name === name);
                    const shopId = designer?.shop_id || null;
                    const shop = shopId ? allShops.find((s) => s.id === shopId) : null;
                    const shopName = shop?.name || '미지정';
                    const lastGroup = shopGroups[shopGroups.length - 1];
                    if (lastGroup && lastGroup.shopId === shopId) {
                      lastGroup.count++;
                    } else {
                      shopGroups.push({ shopId, shopName, count: 1 });
                    }
                  });
                  const showShopRow = shopGroups.length > 1 || (shopGroups.length === 1 && shopGroups[0].shopName !== '미지정');
                  return (
                    <>
                      {showShopRow && (
                        <div className="grid border-b border-[#e2e8f0]" style={{ gridTemplateColumns: shopGroups.map((g) => `repeat(${g.count}, minmax(150px, 1fr))`).join(' ') }}>
                          {shopGroups.map((group, idx) => (
                            <div
                              key={`shop-${idx}`}
                              className="px-2 py-1.5 bg-gray-50 text-center border-r-[3px] border-[#64748b] last:border-r-0"
                              style={{ gridColumn: `span ${group.count}` }}
                            >
                              <p className="text-[11px] font-semibold text-gray-500">{group.shopName}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="grid" style={{ gridTemplateColumns: `repeat(${visibleDesigners.length}, minmax(150px, 1fr))` }}>
                    {visibleDesigners.map((name, idx) => {
                      const designer = allDesigners.find((d) => d.name === name);
                      const designerId = designer?.id;
                      const isOff = designerId ? !availableDesignerIds.includes(designerId) : false;
                      const nextName = visibleDesigners[idx + 1];
                      const nextDesigner = nextName
                        ? allDesigners.find((d) => d.name === nextName)
                        : null;
                      const isShopBoundary =
                        !!nextDesigner &&
                        (designer?.shop_id ?? null) !== (nextDesigner?.shop_id ?? null);
                      return (
                        <div
                          key={`${dateStr}-${name}`}
                          className={`relative backdrop-blur-sm border-r ${isShopBoundary ? 'border-r-[3px] border-[#64748b]' : 'border-[#e2e8f0]'} last:border-r-0 flex items-center justify-center ${isOff ? 'bg-gray-200' : 'bg-white/50'}`}
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
                            className="w-full h-full px-2 py-2 text-center hover:bg-gray-100 transition-colors"
                          >
                            <p className={`text-xs font-bold truncate ${isOff ? 'text-gray-400' : 'text-[#0d121b]'}`}>{name}</p>
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
                                  className={`w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 ${canUseAttendanceManagement ? '' : 'last:rounded-b-lg'}`}
                                >
                                  임의 휴일 및 특근 설정
                                </button>
                                {canUseAttendanceManagement && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenAttendanceModal(designerId, name);
                                      onDesignerDropdownToggle(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg"
                                  >
                                    출/퇴근 관리
                                  </button>
                                )}
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                    </>
                  );
                })()}
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
      className="sticky top-0 bg-[#f8f9fc] shadow-sm"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: 'fit-content',
        minWidth: '100%'
      }}
    >
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
        {weekViewDesignerId ? (
          <div className="grid flex-1" style={{ gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))' }}>
            {Array.from({ length: 7 }).map((_, dayIndex) => {
              const currentDate = new Date(weekViewStartDate);
              currentDate.setDate(currentDate.getDate() + dayIndex);
              const dateStr = currentDate.toISOString().split('T')[0];
              const dayName = ['일', '월', '화', '수', '목', '금', '토'][currentDate.getDay()];
              const month = String(currentDate.getMonth() + 1).padStart(2, '0');
              const day = String(currentDate.getDate()).padStart(2, '0');
              const isDayOff = weekViewAvailableDates.size > 0 && !weekViewAvailableDates.has(dateStr);
              return (
                <div
                  key={dayIndex}
                  className={`relative px-2 py-2 backdrop-blur-sm border-r border-[#e2e8f0] last:border-r-0 ${
                    isDayOff ? 'bg-gray-200' : 'bg-white/50'
                  }`}
                >
                  <div className="text-center">
                    <p className={`text-xs font-bold ${isDayOff ? 'text-gray-400' : 'text-[#0d121b]'}`}>{dayName}</p>
                    <p className={`text-[10px] ${isDayOff ? 'text-gray-400' : 'text-[#64748b]'}`}>{month}-{day}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
