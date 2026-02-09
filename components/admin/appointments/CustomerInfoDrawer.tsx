'use client';

interface CustomerInfoDrawerProps {
  customerId: number | null;
  customer: any | null;
  loading: boolean;
  tab: 'appointments' | 'prepaid' | 'tickets';
  onClose: () => void;
  onTabChange: (tab: 'appointments' | 'prepaid' | 'tickets') => void;
}

export default function CustomerInfoDrawer({
  customerId,
  customer,
  loading,
  tab,
  onClose,
  onTabChange,
}: CustomerInfoDrawerProps) {
  if (!customerId) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <div
        className="absolute inset-0 bg-black/40 pointer-events-auto"
        onClick={onClose}
      />
      <div className="absolute right-0 top-0 bottom-0 w-[480px] bg-white shadow-2xl pointer-events-auto flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
              <p className="text-sm text-gray-600">고객 정보를 불러오는 중...</p>
            </div>
          </div>
        ) : customer ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-black">고객 정보</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-lg pointer-events-none">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="고객명 또는 휴대폰"
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
                >
                  고객등록
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 whitespace-nowrap"
                >
                  예약 등록
                </button>
              </div>
            </div>

            {/* Customer Info Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Customer Image and Basic Info */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-4xl text-gray-400">person</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-black">{customer.name || '-'}</h3>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                      {customer.customer_type === 'prepaid' ? '정액권' : '일반'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {customer.phone
                      ? customer.phone.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3')
                      : '-'}
                  </p>
                  <button
                    type="button"
                    className="px-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    상세정보
                  </button>
                </div>
              </div>

              {/* Customer Details */}
              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-xs text-gray-500 mb-1">고객 번호</p>
                  <p className="text-sm font-medium text-black">
                    {customer.customer_number || customer.id || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">담당자</p>
                  <p className="text-sm font-medium text-black">{customer.manager_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">정액권 잔액</p>
                  <p className="text-sm font-medium text-black">
                    {customer.prepaid_balance
                      ? `${Number(customer.prepaid_balance).toLocaleString()}`
                      : '0'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">최근 방문일</p>
                  <p className="text-sm font-medium text-black">
                    {customer.last_visit_date
                      ? (() => {
                          const date = new Date(customer.last_visit_date);
                          const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                          return `${formattedDate} (${customer.days_since_last_visit || 0}일전)`;
                        })()
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">최근 1년 예약 수</p>
                  <p className="text-sm font-medium text-black">
                    {customer.appointments_count || 0}{' '}
                    {customer.cancelled_count ? `(취소 ${customer.cancelled_count})` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">예정된 예약</p>
                  {customer.next_appointment ? (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-black">
                        {(() => {
                          const date = new Date(customer.next_appointment.date);
                          const formattedDate = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                          const time = customer.next_appointment.time || '';
                          const [hour, minute] = time.split(':');
                          const hourNum = Number(hour);
                          const ampm = hourNum >= 12 ? 'PM' : 'AM';
                          const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
                          const formattedTime = minute ? `${displayHour}:${minute} ${ampm}` : '';
                          return `${formattedDate} ${formattedTime}`;
                        })()}
                      </p>
                      <span className="material-symbols-outlined text-sm text-gray-400">chevron_right</span>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-black">-</p>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 mb-4">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => onTabChange('appointments')}
                    className={`pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                      tab === 'appointments'
                        ? 'border-purple-600 text-black'
                        : 'border-transparent hover:border-gray-300 text-gray-600 hover:text-black'
                    }`}
                  >
                    예약내역
                  </button>
                  <button
                    type="button"
                    onClick={() => onTabChange('prepaid')}
                    className={`pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                      tab === 'prepaid'
                        ? 'border-purple-600 text-black'
                        : 'border-transparent hover:border-gray-300 text-gray-600 hover:text-black'
                    }`}
                  >
                    정액권
                  </button>
                  <button
                    type="button"
                    onClick={() => onTabChange('tickets')}
                    className={`pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                      tab === 'tickets'
                        ? 'border-purple-600 text-black'
                        : 'border-transparent hover:border-gray-300 text-gray-600 hover:text-black'
                    }`}
                  >
                    티켓
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              {tab === 'prepaid' && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-black mb-3">정액권</div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">정액권명</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">잔액</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">만료일</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customer.prepaid_tickets && customer.prepaid_tickets.length > 0 ? (
                          customer.prepaid_tickets.map((ticket: any, idx: number) => (
                            <tr key={idx} className="border-t border-gray-200">
                              <td className="px-4 py-2 text-gray-900">{ticket.name || '-'}</td>
                              <td className="px-4 py-2 text-gray-900">
                                {Number(ticket.balance || 0).toLocaleString()}
                              </td>
                              <td className="px-4 py-2 text-gray-900">{ticket.expiry_date || '무제한'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-4 py-4 text-center text-sm text-gray-500">
                              정액권 내역이 없습니다.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'appointments' && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-black mb-3">예약내역</div>
                  <div className="text-sm text-gray-500 text-center py-4">
                    예약내역 기능은 추후 구현 예정입니다.
                  </div>
                </div>
              )}

              {tab === 'tickets' && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-black mb-3">티켓</div>
                  <div className="text-sm text-gray-500 text-center py-4">
                    티켓 기능은 추후 구현 예정입니다.
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-600">고객 정보를 불러올 수 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
