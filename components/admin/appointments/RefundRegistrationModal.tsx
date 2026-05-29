'use client';

import { useState, useEffect } from 'react';
import PaymentInputModal from './PaymentInputModal';
import { AlertModal, Button, Input, Modal, Select } from '@/components/ui';
import { Z } from '@/lib/constants';
import type { SalesItemType } from '@/lib/types';

type RefundItem = {
  id: string;
  type: SalesItemType;
  name: string;
  unitPrice: number;
  quantity: number;
  amount: number;
  manager: string;
  prepaidCreditPoints?: number;
};

interface RefundRegistrationModalProps {
  isOpen: boolean;
  customer: {
    id: number;
    name: string;
    phone?: string | null;
    points?: number;
    prepaid_balance?: number;
  } | null;
  shopId?: number | null;
  onClose: () => void;
  onOpenItemPicker: (tab: SalesItemType) => void;
  onComplete?: () => void;
}

export default function RefundRegistrationModal({
  isOpen,
  customer,
  shopId,
  onClose,
  onOpenItemPicker,
  onComplete,
}: RefundRegistrationModalProps) {
  const [activeTab, setActiveTab] = useState<SalesItemType>('service');
  const [refundItems, setRefundItems] = useState<RefundItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [amountToReceive, setAmountToReceive] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | null>(null);
  const [paymentAmounts, setPaymentAmounts] = useState<{
    cash: number;
    card: number;
    bank_transfer: number;
  }>({ cash: 0, card: 0, bank_transfer: 0 });
  const [isPaymentInputModalOpen, setIsPaymentInputModalOpen] = useState(false);
  const [isConfirmationAlertOpen, setIsConfirmationAlertOpen] = useState(false);
  const [confirmationAlertData, setConfirmationAlertData] = useState<{
    title: string;
    message: string;
    highlightText?: string;
    onConfirm: () => void;
  } | null>(null);
  const [refundDate, setRefundDate] = useState(new Date().toISOString().split('T')[0]);
  const [refundTime, setRefundTime] = useState(new Date().toTimeString().slice(0, 5));
  const [memo, setMemo] = useState('');
  const [editingQuantityItemId, setEditingQuantityItemId] = useState<string | null>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(shopId || null);

  // Fetch shops only when the modal is first opened (avoid calling on mount when closed)
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/shops').then(r => r.json()).then(d => setShops(d.shops || [])).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    setSelectedShopId(shopId || null);
  }, [shopId]);

  // 금액 재계산
  const recalculateAmounts = (items: RefundItem[], paymentAmountsToUse?: typeof paymentAmounts) => {
    const amounts = paymentAmountsToUse || paymentAmounts;
    const newTotal = items.reduce((sum, item) => sum + item.amount, 0);
    const positivePayment = Math.max(0, amounts.cash) + Math.max(0, amounts.card) + Math.max(0, amounts.bank_transfer);
    const negativePayment = Math.abs(Math.min(0, amounts.cash)) + Math.abs(Math.min(0, amounts.card)) + Math.abs(Math.min(0, amounts.bank_transfer));
    setTotalAmount(newTotal);
    setAmountToReceive(newTotal - positivePayment - negativePayment);
  };

  // 환불 항목 추가 (functional updater로 연속 호출 시 stale closure 방지)
  const addRefundItem = (item: {
    id: number;
    name: string;
    price: number;
    type: SalesItemType;
    manager?: string;
    prepaid_credit_points?: number;
  }) => {
    const newItem: RefundItem = {
      id: `${item.type}-${item.id}-${Date.now()}`,
      type: item.type,
      name: item.name,
      unitPrice: item.price,
      quantity: 1,
      amount: item.price,
      manager: item.manager || '',
      prepaidCreditPoints:
        item.type === 'prepaid'
          ? Math.round(Number(item.prepaid_credit_points ?? 0))
          : undefined,
    };
    setRefundItems(prev => {
      const updatedItems = [...prev, newItem];
      recalculateAmounts(updatedItems);
      return updatedItems;
    });
  };

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setRefundItems([]);
      setTotalAmount(0);
      setAmountToReceive(0);
      setPaymentAmounts({ cash: 0, card: 0, bank_transfer: 0 });
      setPaymentMethod(null);
      setIsPaymentInputModalOpen(false);
      setIsConfirmationAlertOpen(false);
      setConfirmationAlertData(null);
      setRefundDate(new Date().toISOString().split('T')[0]);
      setRefundTime(new Date().toTimeString().slice(0, 5));
      setMemo('');
      setActiveTab('service');
      setEditingQuantityItemId(null);
    }
  }, [isOpen]);

  // 외부에서 항목 추가할 수 있도록 window에 등록
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      (window as any).addRefundItemToModal = addRefundItem;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).addRefundItemToModal;
      }
    };
  }, [isOpen, refundItems]);

  if (!isOpen || !customer) return null;

  const handleRemoveItem = (itemId: string) => {
    const updatedItems = refundItems.filter((item) => item.id !== itemId);
    setRefundItems(updatedItems);
    recalculateAmounts(updatedItems);
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    const updatedItems = refundItems.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          quantity: newQuantity,
          amount: item.unitPrice * newQuantity,
        };
      }
      return item;
    });
    setRefundItems(updatedItems);
    recalculateAmounts(updatedItems);
  };

  const performRefundRegistration = async () => {
    if (!customer || refundItems.length === 0) return;

    try {
      const response = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.id,
          shop_id: selectedShopId || null,
          items: refundItems.map((item) => ({
            type: item.type,
            name: item.name,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            amount: item.amount,
            manager: item.manager,
            ...(item.type === 'prepaid'
              ? {
                  prepaid_credit_points: item.prepaidCreditPoints ?? 0,
                }
              : {}),
          })),
          total_amount: totalAmount,
          point_deduction: 0,
          payment_amounts: paymentAmounts,
          memo,
          refund_date: refundDate,
          refund_time: refundTime,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '환불 등록에 실패했습니다.');
      }

      onComplete?.();
      onClose();
    } catch (error: any) {
      console.error('환불 등록 오류:', error);
      alert(error.message || '환불 등록 중 오류가 발생했습니다.');
    }
  };

  const handleComplete = async () => {
    if (!customer || refundItems.length === 0) {
      alert('고객 정보와 환불 항목이 필요합니다.');
      return;
    }

    const positivePayment = Math.max(0, paymentAmounts.cash) + Math.max(0, paymentAmounts.card) + Math.max(0, paymentAmounts.bank_transfer);
    const negativePayment = Math.abs(Math.min(0, paymentAmounts.cash)) + Math.abs(Math.min(0, paymentAmounts.card)) + Math.abs(Math.min(0, paymentAmounts.bank_transfer));
    const currentAmountToReceive = totalAmount - positivePayment - negativePayment;

    if (currentAmountToReceive > 0) {
      setConfirmationAlertData({
        title: '알림',
        message: `미수금이 ${currentAmountToReceive.toLocaleString()}원 발생됩니다. 계산완료 하시겠습니까?`,
        highlightText: `${currentAmountToReceive.toLocaleString()}원`,
        onConfirm: async () => {
          await performRefundRegistration();
        },
      });
      setIsConfirmationAlertOpen(true);
      return;
    }

    await performRefundRegistration();
  };

  const handlePaymentConfirm = (amount: number) => {
    if (!paymentMethod) return;
    const newAmounts = {
      ...paymentAmounts,
      [paymentMethod]: amount,
    };
    setPaymentAmounts(newAmounts);
    recalculateAmounts(refundItems, newAmounts);
    setIsPaymentInputModalOpen(false);
  };

  const paymentInputInitialAmount =
    paymentMethod && paymentAmounts[paymentMethod] > 0
      ? paymentAmounts[paymentMethod]
      : amountToReceive;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isPaymentInputModalOpen) {
          onClose();
        }
      }}
      title="환불 등록"
      zIndex={Z.MODAL_SALES}
      maxWidth="max-w-6xl"
      className="max-h-[90vh] flex flex-col overflow-hidden"
      bodyClassName="flex-1 overflow-y-auto min-h-0"
    >
      {/* Customer Info Header */}
      <div className="bg-gray-100 -mx-5.5 -mt-5.5 px-5.5 py-3 mb-5.5 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-gray-900">{customer.name}</p>
          <span className="text-xs text-gray-400">({customer.id})</span>
          {customer.phone && (
            <p className="text-xs text-gray-500">{customer.phone}</p>
          )}
        </div>
      </div>

      {/* 환불 항목 추가 버튼 + 탭 */}
      <div className="mb-5.5">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">환불 항목 선택</span>
          <div className="flex gap-2">
            {(['service', 'product', 'prepaid'] as SalesItemType[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  onOpenItemPicker(tab);
                }}
                className={`px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${
                  activeTab === tab
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab === 'service' && '서비스'}
                {tab === 'product' && '제품'}
                {tab === 'prepaid' && '정액권'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 환불 항목 테이블 */}
      <div className="mb-5.5" onClick={() => setEditingQuantityItemId(null)}>
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">환불 항목</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">단가</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">수량</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">금액</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">담당자</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">삭제</th>
              </tr>
            </thead>
            <tbody>
              {refundItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-7.5 text-center text-sm text-gray-500">
                    내역이 없습니다
                  </td>
                </tr>
              ) : (
                refundItems.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="py-3 px-4 text-sm text-gray-900">{item.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{item.unitPrice.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {editingQuantityItemId === item.id ? (
                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuantityChange(item.id, Math.max(1, item.quantity - 1));
                            }}
                            className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium"
                          >
                            -
                          </button>
                          <div className="w-8 h-6 flex items-center justify-center border border-gray-300 rounded bg-green-50 text-gray-900 text-sm font-medium">
                            {item.quantity}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuantityChange(item.id, item.quantity + 1);
                            }}
                            className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer hover:bg-gray-50 py-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingQuantityItemId(item.id);
                          }}
                        >
                          {item.quantity}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">{item.amount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {item.manager || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 하단 영역: 환불금액 / 결제 / 메모+버튼 */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: 환불금액 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">환불 금액</span>
            <span className="text-sm font-medium text-gray-900">{totalAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-900">합계</span>
            <span className="text-sm font-medium text-gray-900">{totalAmount.toLocaleString()}</span>
          </div>

          {/* 결제 방법별 금액 표시 */}
          {(paymentAmounts.cash !== 0 || paymentAmounts.card !== 0 || paymentAmounts.bank_transfer !== 0) && (
            <div className="space-y-2 pt-1">
              {paymentAmounts.cash !== 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">현금</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${paymentAmounts.cash < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {paymentAmounts.cash < 0 ? '-' : ''}{Math.abs(paymentAmounts.cash).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newAmounts = { ...paymentAmounts, cash: 0 };
                        setPaymentAmounts(newAmounts);
                        recalculateAmounts(refundItems, newAmounts);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
              {paymentAmounts.card !== 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">카드</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${paymentAmounts.card < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {paymentAmounts.card < 0 ? '-' : ''}{Math.abs(paymentAmounts.card).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newAmounts = { ...paymentAmounts, card: 0 };
                        setPaymentAmounts(newAmounts);
                        recalculateAmounts(refundItems, newAmounts);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
              {paymentAmounts.bank_transfer !== 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">계좌이체</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${paymentAmounts.bank_transfer < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {paymentAmounts.bank_transfer < 0 ? '-' : ''}{Math.abs(paymentAmounts.bank_transfer).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newAmounts = { ...paymentAmounts, bank_transfer: 0 };
                        setPaymentAmounts(newAmounts);
                        recalculateAmounts(refundItems, newAmounts);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">받을 금액</span>
            <span className="text-sm font-semibold text-red-600">{amountToReceive.toLocaleString()}</span>
          </div>
        </div>

        {/* Middle: 결제 + 날짜 */}
        <div className="space-y-4">
          {/* 결제 방법 */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">결제</label>
            <div className="flex gap-2">
              {(['cash', 'card', 'bank_transfer'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(method);
                    setIsPaymentInputModalOpen(true);
                  }}
                  className={`flex-1 px-3 py-2 text-sm border rounded-lg transition-colors ${
                    paymentMethod === method && paymentAmounts[method] !== 0
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {method === 'cash' && '현금'}
                  {method === 'card' && '카드'}
                  {method === 'bank_transfer' && '계좌이체'}
                </button>
              ))}
            </div>
          </div>

          {/* 환불 날짜 */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">환불일</label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={refundDate}
                onChange={(e) => setRefundDate(e.target.value)}
                wrapperClassName="flex-1 min-w-0"
              />
              <Input
                type="time"
                value={refundTime}
                onChange={(e) => setRefundTime(e.target.value)}
                wrapperClassName="flex-1 min-w-0"
              />
            </div>
          </div>

          {/* 지점 */}
          {shops.length > 0 && (
            <Select
              label="지점"
              options={shops.map((s: any) => ({ value: s.id, label: s.name }))}
              value={selectedShopId ?? ''}
              onChange={(e) => setSelectedShopId(Number(e.target.value))}
            />
          )}
        </div>

        {/* Right: 메모 + 버튼 */}
        <div className="flex flex-col justify-between">
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 mb-2">메모</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent resize-none"
              placeholder="메모를 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <Button className="w-full" onClick={handleComplete}>
              계산 완료
            </Button>
            <Button variant="ghost" className="w-full" onClick={onClose}>
              취소
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Input Modal */}
      <PaymentInputModal
        isOpen={isPaymentInputModalOpen}
        paymentMethod={paymentMethod}
        initialAmount={paymentInputInitialAmount}
        onClose={() => setIsPaymentInputModalOpen(false)}
        onConfirm={handlePaymentConfirm}
      />

      {/* Confirmation Alert Modal */}
      <AlertModal
        isOpen={isConfirmationAlertOpen}
        title={confirmationAlertData?.title || ''}
        message={confirmationAlertData?.message || ''}
        highlightText={confirmationAlertData?.highlightText}
        variant="confirm"
        onConfirm={() => {
          if (confirmationAlertData?.onConfirm) {
            confirmationAlertData.onConfirm();
          }
        }}
        onClose={() => {
          setIsConfirmationAlertOpen(false);
          setConfirmationAlertData(null);
        }}
      />
    </Modal>
  );
}
