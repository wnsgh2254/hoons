'use client';

import { useState, useEffect } from 'react';
import DiscountModal from './DiscountModal';
import PaymentInputModal from './PaymentInputModal';
import SalesClassificationModal from './SalesClassificationModal';
import ManagerPickerModal from './ManagerPickerModal';
import ConfirmationAlertModal from './ConfirmationAlertModal';
import ErrorAlertModal from './ErrorAlertModal';
import PrepaidDeductionModal from './PrepaidDeductionModal';

type DiscountType = 'percentage' | 'amount' | 'category';

type SalesItem = {
  id: string;
  type: 'service' | 'product' | 'prepaid';
  name: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  discountType?: DiscountType;
  discountValue?: number | string; // % 값 또는 금액 값
  amount: number;
  manager: string;
  salesClassification: string;
  prepaidDeduction: number;
};

interface SalesRegistrationModalProps {
  isOpen: boolean;
  customer: {
    id: number;
    name: string;
    phone?: string | null;
    points?: number;
    prepaid_balance?: number;
  } | null;
  onClose: () => void;
  onOpenItemPicker: (tab: 'service' | 'product' | 'prepaid') => void;
  onComplete?: () => void; // 판매 등록 완료 시 호출
}

export default function SalesRegistrationModal({
  isOpen,
  customer,
  onClose,
  onOpenItemPicker,
  onComplete,
}: SalesRegistrationModalProps) {
  const [activeTab, setActiveTab] = useState<'service' | 'product' | 'prepaid'>('service');
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);
  const [salesAmount, setSalesAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [total, setTotal] = useState(0);
  const [amountToReceive, setAmountToReceive] = useState(0);
  const [pointAccumulation, setPointAccumulation] = useState(0);
  const [selectedDeduction, setSelectedDeduction] = useState<'discount' | 'prepaid' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | null>(null);
  const [memo, setMemo] = useState('');
  const [salesDate, setSalesDate] = useState(new Date().toISOString().split('T')[0]);
  const [salesTime, setSalesTime] = useState(new Date().toTimeString().slice(0, 5));
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [selectedItemForDiscount, setSelectedItemForDiscount] = useState<SalesItem | null>(null);
  const [editingQuantityItemId, setEditingQuantityItemId] = useState<string | null>(null);
  const [isPaymentInputModalOpen, setIsPaymentInputModalOpen] = useState(false);
  const [isSalesClassificationModalOpen, setIsSalesClassificationModalOpen] = useState(false);
  const [selectedItemForClassification, setSelectedItemForClassification] = useState<SalesItem | null>(null);
  const [isManagerPickerModalOpen, setIsManagerPickerModalOpen] = useState(false);
  const [selectedItemForManager, setSelectedItemForManager] = useState<SalesItem | null>(null);
  const [isPrepaidDeductionModalOpen, setIsPrepaidDeductionModalOpen] = useState(false);
  const [selectedItemForPrepaidDeduction, setSelectedItemForPrepaidDeduction] = useState<SalesItem | null>(null);
  const [isGlobalPrepaidDeductionModalOpen, setIsGlobalPrepaidDeductionModalOpen] = useState(false);
  const [isConfirmationAlertOpen, setIsConfirmationAlertOpen] = useState(false);
  const [confirmationAlertData, setConfirmationAlertData] = useState<{
    title: string;
    message: string;
    highlightText?: string;
    onConfirm: () => void;
  } | null>(null);
  const [isErrorAlertOpen, setIsErrorAlertOpen] = useState(false);
  const [errorAlertData, setErrorAlertData] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [paymentAmounts, setPaymentAmounts] = useState<{
    cash: number;
    card: number;
    bank_transfer: number;
  }>({
    cash: 0,
    card: 0,
    bank_transfer: 0,
  });
  const [prepaidDeductionAmount, setPrepaidDeductionAmount] = useState(0);

  // 정액권 잔액 확인 헬퍼 함수
  const validatePrepaidBalance = (newDeductionAmount: number): boolean => {
    if (!customer) return false;
    const customerPrepaidBalance = customer?.prepaid_balance ?? customer?.points ?? 0;
    return newDeductionAmount <= customerPrepaidBalance;
  };

  // 받을 금액 계산 헬퍼 함수
  const calculateAmountToReceive = (itemsTotal: number, prepaidDeduction: number): number => {
    const positivePaymentAmount = Math.max(0, paymentAmounts.cash) + Math.max(0, paymentAmounts.card) + Math.max(0, paymentAmounts.bank_transfer);
    const negativePaymentAmount = Math.abs(Math.min(0, paymentAmounts.cash)) + Math.abs(Math.min(0, paymentAmounts.card)) + Math.abs(Math.min(0, paymentAmounts.bank_transfer));
    return itemsTotal - positivePaymentAmount - negativePaymentAmount - prepaidDeduction;
  };

  // 정액권 차감 적용 및 금액 업데이트 헬퍼 함수
  const applyPrepaidDeduction = (
    items: SalesItem[],
    deductionAmount: number,
    targetItemId?: string | null
  ): SalesItem[] => {
    return items.map((item) => {
      if (targetItemId && item.id !== targetItemId) {
        return item;
      }
      const newAmount = (item.unitPrice * item.quantity) - item.discount - deductionAmount;
      return {
        ...item,
        prepaidDeduction: deductionAmount,
        amount: Math.max(0, newAmount),
      };
    });
  };

  // 정액권 차감 적용 후 상태 업데이트 헬퍼 함수
  const updatePrepaidDeductionState = (items: SalesItem[]) => {
    const newPrepaidDeductionAmount = items.reduce((sum, item) => sum + item.prepaidDeduction, 0);
    const newSalesAmount = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const newDiscountAmount = items.reduce((sum, item) => sum + item.discount, 0);
    const newTotal = newSalesAmount - newDiscountAmount;
    
    setPrepaidDeductionAmount(newPrepaidDeductionAmount);
    setSalesItems(items);
    recalculateAmounts(items);
    return { newPrepaidDeductionAmount, newTotal };
  };

  // 에러 알림 표시 헬퍼 함수
  const showPrepaidBalanceError = () => {
    setErrorAlertData({
      title: '알림',
      message: '정액권이 만료되어 수정할 수 없습니다.',
    });
    setIsErrorAlertOpen(true);
  };

  // 확인 알림 표시 헬퍼 함수
  const showOutstandingAmountConfirmation = (amountToReceive: number, onConfirm: () => void) => {
    setConfirmationAlertData({
      title: '알림',
      message: `미수금이 ${amountToReceive.toLocaleString()}원 발생됩니다. 계산완료 하시겠습니까?`,
      highlightText: `${amountToReceive.toLocaleString()}원`,
      onConfirm: async () => {
        await onConfirm();
        setIsConfirmationAlertOpen(false);
        setConfirmationAlertData(null);
      },
    });
    setIsConfirmationAlertOpen(true);
  };

  // 개별 항목의 정액권 차감 총액 계산 헬퍼 함수
  const calculateItemPrepaidDeductionTotal = (itemId: string, newAmount: number): number => {
    return salesItems.reduce((sum, item) => {
      if (item.id === itemId) {
        return sum + newAmount;
      }
      return sum + item.prepaidDeduction;
    }, 0);
  };

  // 금액 재계산 함수
  const recalculateAmounts = (items: SalesItem[], paymentAmountsToUse?: typeof paymentAmounts) => {
    const amounts = paymentAmountsToUse || paymentAmounts;
    // 양수 결제 금액만 합산 (음수는 받을 금액에서 빼기용이므로 별도 처리)
    const positivePaymentAmount = Math.max(0, amounts.cash) + Math.max(0, amounts.card) + Math.max(0, amounts.bank_transfer);
    // 음수 결제 금액의 절댓값 합산 (받을 금액에서 빼기)
    const negativePaymentAmount = Math.abs(Math.min(0, amounts.cash)) + Math.abs(Math.min(0, amounts.card)) + Math.abs(Math.min(0, amounts.bank_transfer));
    
    const newSalesAmount = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const newDiscountAmount = items.reduce((sum, item) => sum + item.discount, 0);
    const newTotal = newSalesAmount - newDiscountAmount;
    
    setSalesAmount(newSalesAmount);
    setDiscountAmount(newDiscountAmount);
    setTotal(newTotal);
    // 받을 금액 = 합계 - 양수 결제 금액 - 음수 결제 금액의 절댓값 - 정액권 차감 금액
    setAmountToReceive(newTotal - positivePaymentAmount - negativePaymentAmount - prepaidDeductionAmount);
  };

  // 판매 항목 추가 함수
  const addSalesItem = (item: {
    id: number;
    name: string;
    price: number;
    type: 'service' | 'product' | 'prepaid';
    manager?: string;
  }) => {
    const newSalesItem: SalesItem = {
      id: `${item.type}-${item.id}-${Date.now()}`,
      type: item.type,
      name: item.name,
      unitPrice: item.price,
      quantity: 1,
      discount: 0,
      discountType: undefined,
      discountValue: undefined,
      amount: item.price,
      manager: item.manager || '',
      salesClassification: '',
      prepaidDeduction: 0,
    };
    const updatedItems = [...salesItems, newSalesItem];
    setSalesItems(updatedItems);
    recalculateAmounts(updatedItems);
  };

  // 모달이 열릴 때마다 모든 상태 초기화
  useEffect(() => {
    if (isOpen) {
      // 모든 상태 초기화
      setSalesItems([]);
      setSalesAmount(0);
      setDiscountAmount(0);
      setTotal(0);
      setAmountToReceive(0);
      setPointAccumulation(0);
      setSelectedDeduction(null);
      setPaymentMethod(null);
      setMemo('');
      setSalesDate(new Date().toISOString().split('T')[0]);
      setSalesTime(new Date().toTimeString().slice(0, 5));
      setIsDiscountModalOpen(false);
      setSelectedItemForDiscount(null);
      setEditingQuantityItemId(null);
      setIsPaymentInputModalOpen(false);
      setIsSalesClassificationModalOpen(false);
      setSelectedItemForClassification(null);
      setIsManagerPickerModalOpen(false);
      setSelectedItemForManager(null);
      setPaymentAmounts({
        cash: 0,
        card: 0,
        bank_transfer: 0,
      });
      setActiveTab('service');
    }
  }, [isOpen]);

  // 외부에서 호출할 수 있도록 window에 등록 (useEffect 사용)
  // 주의: 모든 hooks는 early return 이전에 호출되어야 함
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      (window as any).addSalesItemToModal = addSalesItem;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).addSalesItemToModal;
      }
    };
  }, [isOpen, salesItems]);


  if (!isOpen || !customer) return null;

  const handleAddItem = () => {
    onOpenItemPicker(activeTab);
  };

  const handleComplete = async () => {
    if (!customer || salesItems.length === 0) {
      alert('고객 정보와 판매 항목이 필요합니다.');
      return;
    }

    // 받을 금액 확인
    const positivePaymentAmount = Math.max(0, paymentAmounts.cash) + Math.max(0, paymentAmounts.card) + Math.max(0, paymentAmounts.bank_transfer);
    const negativePaymentAmount = Math.abs(Math.min(0, paymentAmounts.cash)) + Math.abs(Math.min(0, paymentAmounts.card)) + Math.abs(Math.min(0, paymentAmounts.bank_transfer));
    const currentAmountToReceive = total - positivePaymentAmount - negativePaymentAmount - prepaidDeductionAmount;

    // 받을 금액이 남아있으면 확인 알림 표시
    if (currentAmountToReceive > 0) {
      setConfirmationAlertData({
        title: '알림',
        message: `미수금이 ${currentAmountToReceive.toLocaleString()}원 발생됩니다. 계산완료 하시겠습니까?`,
        highlightText: `${currentAmountToReceive.toLocaleString()}원`,
        onConfirm: async () => {
          await performSaleRegistration();
        },
      });
      setIsConfirmationAlertOpen(true);
      return;
    }

    // 받을 금액이 0이면 바로 판매 등록
    await performSaleRegistration();
  };

  const performSaleRegistration = async () => {
    if (!customer || salesItems.length === 0) {
      return;
    }

    try {
      // 판매 등록 API 호출
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: customer.id,
          items: salesItems.map(item => ({
            type: item.type,
            name: item.name,
            unit_price: item.unitPrice,
            quantity: item.quantity,
            discount: item.discount,
            discount_type: item.discountType,
            discount_value: item.discountValue,
            amount: item.amount,
            manager: item.manager,
            sales_classification: item.salesClassification,
            prepaid_deduction: item.prepaidDeduction,
          })),
          sales_amount: salesAmount,
          discount_amount: discountAmount,
          total: total,
          payment_method: paymentMethod,
          payment_amounts: paymentAmounts,
          point_accumulation: pointAccumulation,
          memo: memo,
          sales_date: salesDate,
          sales_time: salesTime,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '판매 등록에 실패했습니다.');
      }

      // 판매 등록 완료 - 고객 정보 새로고침
      if (onComplete) {
        onComplete();
      }
      onClose();
    } catch (error: any) {
      console.error('판매 등록 오류:', error);
      alert(error.message || '판매 등록 중 오류가 발생했습니다.');
    }
  };

  const handlePaymentComplete = async (amount: number) => {
    if (paymentMethod) {
      const newAmounts = {
        ...paymentAmounts,
        [paymentMethod]: paymentAmounts[paymentMethod] + amount,
      };
      setPaymentAmounts(newAmounts);
      
      // 금액 재계산 (새로운 paymentAmounts 사용)
      recalculateAmounts(salesItems, newAmounts);
      
      // 받을 금액 계산
      const positivePaymentAmount = Math.max(0, newAmounts.cash) + Math.max(0, newAmounts.card) + Math.max(0, newAmounts.bank_transfer);
      const negativePaymentAmount = Math.abs(Math.min(0, newAmounts.cash)) + Math.abs(Math.min(0, newAmounts.card)) + Math.abs(Math.min(0, newAmounts.bank_transfer));
      const newTotal = salesAmount - discountAmount;
      const newAmountToReceive = newTotal - positivePaymentAmount - negativePaymentAmount;
      
      // 받을 금액이 0이면 판매 등록 완료
      if (newAmountToReceive <= 0) {
        // 판매 등록 완료
        await handleComplete();
        setIsPaymentInputModalOpen(false);
      } else {
        // 받을 금액이 남아있으면 확인 알림 표시
        setConfirmationAlertData({
          title: '알림',
          message: `미수금이 ${newAmountToReceive.toLocaleString()}원 발생됩니다. 계산완료 하시겠습니까?`,
          highlightText: `${newAmountToReceive.toLocaleString()}원`,
          onConfirm: async () => {
            await handleComplete();
            setIsPaymentInputModalOpen(false);
            setIsConfirmationAlertOpen(false);
            setConfirmationAlertData(null);
          },
        });
        setIsConfirmationAlertOpen(true);
      }
    }
  };

  const handleAdditionalPaymentInput = (amount: number) => {
    // 추가 입력 시 음수로 처리 (예: 현금 -2,000)
    if (paymentMethod && amount > 0) {
      setPaymentAmounts((prev) => {
        const newAmounts = {
          ...prev,
          [paymentMethod]: prev[paymentMethod] - amount, // 음수로 빼기
        };
        // 새로운 paymentAmounts로 재계산
        recalculateAmounts(salesItems, newAmounts);
        return newAmounts;
      });
      // 모달 닫기
      setIsPaymentInputModalOpen(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const handleTemporarySave = () => {
    // TODO: 임시 저장 API 호출
    console.log('임시 저장:', {
      customer,
      salesItems,
      salesAmount,
      discountAmount,
      total,
      amountToReceive,
      pointAccumulation,
      paymentMethod,
      memo,
      salesDate,
      salesTime,
    });
    alert('임시 저장 기능은 추후 구현 예정입니다.');
  };

  return (
    <div
      className="fixed inset-0 z-[100004] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        // PaymentInputModal이나 ManagerPickerModal이 열려있을 때는 판매 등록 모달을 닫지 않음
        if (!isPaymentInputModalOpen && !isManagerPickerModalOpen && !isSalesClassificationModalOpen && !isDiscountModalOpen && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">판매 등록</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Customer Info */}
        <div className="p-6 border-b border-gray-200">
          <p className="text-sm font-medium text-gray-900">{customer.name}</p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Sales Item Selection Buttons */}
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">판매 항목 선택</span>
              <div className="flex gap-2">
                {(['service', 'product', 'prepaid'] as const).map((tab) => (
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

          {/* Sales Item Table */}
          <div className="mb-6" onClick={() => setEditingQuantityItemId(null)}>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">판매 항목</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">단가</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">수량</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">할인</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">금액</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">담당자</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">영업 구분</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">정액권 차감</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {salesItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-sm text-gray-500">
                        내역이 없습니다
                      </td>
                    </tr>
                  ) : (
                    salesItems.map((item) => (
                      <tr key={item.id} className="border-t border-gray-100">
                        <td className="py-3 px-4 text-sm text-gray-900">{item.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{item.unitPrice.toLocaleString()}</td>
                        <td 
                          className="py-3 px-4 text-sm text-gray-900"
                        >
                          {editingQuantityItemId === item.id ? (
                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updatedItems = salesItems.map((i) => {
                                    if (i.id === item.id) {
                                      const newQuantity = Math.max(1, i.quantity - 1);
                                      const newAmount = (i.unitPrice * newQuantity) - i.discount;
                                      return {
                                        ...i,
                                        quantity: newQuantity,
                                        amount: newAmount > 0 ? newAmount : 0,
                                      };
                                    }
                                    return i;
                                  });
                                  setSalesItems(updatedItems);
                                  recalculateAmounts(updatedItems);
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
                                  const updatedItems = salesItems.map((i) => {
                                    if (i.id === item.id) {
                                      const newQuantity = i.quantity + 1;
                                      const newAmount = (i.unitPrice * newQuantity) - i.discount;
                                      return {
                                        ...i,
                                        quantity: newQuantity,
                                        amount: newAmount > 0 ? newAmount : 0,
                                      };
                                    }
                                    return i;
                                  });
                                  setSalesItems(updatedItems);
                                  recalculateAmounts(updatedItems);
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
                        <td 
                          className="py-3 px-4 text-sm text-gray-900 cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            // 개별 항목 클릭 시 해당 항목만 선택된 상태로 할인 모달 열기
                            setSelectedItemForDiscount(item);
                            setIsDiscountModalOpen(true);
                          }}
                        >
                          {item.discountType === 'percentage' && item.discountValue !== undefined
                            ? `${item.discountValue}%`
                            : item.discountType === 'amount' && item.discountValue !== undefined
                            ? typeof item.discountValue === 'number'
                              ? item.discountValue.toLocaleString()
                              : Number(item.discountValue).toLocaleString()
                            : item.discount > 0
                            ? item.discount.toLocaleString()
                            : ''}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">{item.amount.toLocaleString()}</td>
                        <td 
                          className="py-3 px-4 text-sm text-gray-900 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItemForManager(item);
                            setIsManagerPickerModalOpen(true);
                          }}
                        >
                          {item.manager || '-'}
                        </td>
                        <td 
                          className="py-3 px-4 text-sm text-gray-900 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItemForClassification(item);
                            setIsSalesClassificationModalOpen(true);
                          }}
                        >
                          {item.salesClassification || '-'}
                        </td>
                        <td 
                          className="py-3 px-4 text-sm text-gray-900 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItemForPrepaidDeduction(item);
                            setIsPrepaidDeductionModalOpen(true);
                          }}
                        >
                          {item.prepaidDeduction.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => {
                              const updatedItems = salesItems.filter((i) => i.id !== item.id);
                              setSalesItems(updatedItems);
                              recalculateAmounts(updatedItems);
                            }}
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
            <p className="mt-2 text-xs text-gray-500">
              ※ 위의 각 항목 셀을 클릭하여 수정할 수 있습니다.
            </p>
          </div>

          {/* Payment Section */}
          <div className="grid grid-cols-3 gap-6">
            {/* Left: Payment Summary */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">판매 금액</span>
                <span className="text-sm font-medium text-gray-900">{salesAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">할인 금액</span>
                <span className="text-sm font-medium text-gray-900">{discountAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">합계</span>
                <span className="text-sm font-medium text-gray-900">{total.toLocaleString()}</span>
              </div>
              
              {/* Payment Amounts Display */}
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
                            setPaymentAmounts((prev) => {
                              const newAmounts = {
                                ...prev,
                                cash: 0,
                              };
                              recalculateAmounts(salesItems, newAmounts);
                              return newAmounts;
                            });
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
                            setPaymentAmounts((prev) => {
                              const newAmounts = {
                                ...prev,
                                card: 0,
                              };
                              recalculateAmounts(salesItems, newAmounts);
                              return newAmounts;
                            });
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
                            setPaymentAmounts((prev) => {
                              const newAmounts = {
                                ...prev,
                                bank_transfer: 0,
                              };
                              recalculateAmounts(salesItems, newAmounts);
                              return newAmounts;
                            });
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
              
              {/* Prepaid Deduction Display */}
              {prepaidDeductionAmount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">정액권</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-red-600">
                      -{prepaidDeductionAmount.toLocaleString()}x
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        // 모든 항목의 정액권 차감 초기화
                        const updatedItems = salesItems.map((item) => {
                          const newAmount = (item.unitPrice * item.quantity) - item.discount;
                          return {
                            ...item,
                            prepaidDeduction: 0,
                            amount: Math.max(0, newAmount),
                          };
                        });
                        setSalesItems(updatedItems);
                        setPrepaidDeductionAmount(0);
                        recalculateAmounts(updatedItems);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">받을 금액</span>
                <span className="text-sm font-semibold text-red-600">{amountToReceive.toLocaleString()}</span>
              </div>
            </div>

            {/* Middle: Deduction and Payment */}
            <div className="space-y-4">
              {/* Deduction Options */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">차감</label>
                <div className="flex gap-2">
                  {(['discount', 'prepaid'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        if (option === 'discount') {
                          // 차감 섹션의 할인 버튼 클릭 시 모든 항목 표시
                          setSelectedItemForDiscount(null);
                          setIsDiscountModalOpen(true);
                        } else if (option === 'prepaid') {
                          // 정액권 버튼 클릭 시 정액권 차감 모달 열기
                          setIsGlobalPrepaidDeductionModalOpen(true);
                        } else {
                          setSelectedDeduction(selectedDeduction === option ? null : option);
                        }
                      }}
                      className={`flex-1 px-3 py-2 text-sm border rounded-lg transition-colors ${
                        selectedDeduction === option || (option === 'discount' && isDiscountModalOpen) || (option === 'prepaid' && isGlobalPrepaidDeductionModalOpen)
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {option === 'discount' && '할인'}
                      {option === 'prepaid' && '정액권'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
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

              {/* Sales Date & Time */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">판매일</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={salesDate}
                    onChange={(e) => setSalesDate(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <input
                    type="time"
                    value={salesTime}
                    onChange={(e) => setSalesTime(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Right: Memo and Action Buttons */}
            <div className="flex flex-col justify-between">
              {/* Memo */}
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
                <button
                  type="button"
                  onClick={handleComplete}
                  className="w-full px-5 py-2 rounded-lg text-sm font-semibold text-white bg-black hover:bg-gray-800"
                >
                  계산 완료
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full px-5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleTemporarySave}
                  className="w-full px-5 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
                >
                  임시 저장
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discount Modal */}
      <DiscountModal
        isOpen={isDiscountModalOpen}
        items={selectedItemForDiscount ? [selectedItemForDiscount] : salesItems}
        onClose={() => {
          setIsDiscountModalOpen(false);
          setSelectedItemForDiscount(null);
        }}
        onConfirm={(updates) => {
          const updatedItems = salesItems.map((item) => {
            const update = updates.find((u) => u.itemId === item.id);
            if (update) {
              const newAmount = (item.unitPrice * item.quantity) - update.discount;
              // discountValue가 null이면 discountType과 discountValue를 undefined로 설정하여 셀을 비움
              const shouldClearDiscount = update.discountValue === null || update.discountValue === undefined || (update.discount === 0 && !update.discountValue);
              return {
                ...item,
                discount: update.discount,
                discountType: shouldClearDiscount ? undefined : update.discountType,
                discountValue: shouldClearDiscount ? undefined : (update.discountValue ?? undefined),
                amount: newAmount > 0 ? newAmount : 0,
              };
            }
            return item;
          });
          setSalesItems(updatedItems);
          recalculateAmounts(updatedItems);
          setIsDiscountModalOpen(false);
          setSelectedItemForDiscount(null);
        }}
      />

      {/* Payment Input Modal */}
      <PaymentInputModal
        isOpen={isPaymentInputModalOpen}
        paymentMethod={paymentMethod}
        initialAmount={amountToReceive}
        onClose={() => setIsPaymentInputModalOpen(false)}
        onComplete={handlePaymentComplete}
        onAdditionalInput={handleAdditionalPaymentInput}
      />

      {/* Sales Classification Modal */}
      <SalesClassificationModal
        isOpen={isSalesClassificationModalOpen}
        currentClassification={selectedItemForClassification?.salesClassification || ''}
        onClose={() => {
          setIsSalesClassificationModalOpen(false);
          setSelectedItemForClassification(null);
        }}
        onConfirm={(classification) => {
          if (selectedItemForClassification) {
            const updatedItems = salesItems.map((item) => {
              if (item.id === selectedItemForClassification.id) {
                return {
                  ...item,
                  salesClassification: classification || '',
                };
              }
              return item;
            });
            setSalesItems(updatedItems);
            recalculateAmounts(updatedItems);
          }
          setIsSalesClassificationModalOpen(false);
          setSelectedItemForClassification(null);
        }}
      />

      {/* Manager Picker Modal */}
      <ManagerPickerModal
        isOpen={isManagerPickerModalOpen}
        currentManager={selectedItemForManager?.manager || ''}
        onClose={() => {
          setIsManagerPickerModalOpen(false);
          setSelectedItemForManager(null);
        }}
        onConfirm={(manager) => {
          if (selectedItemForManager) {
            const updatedItems = salesItems.map((item) => {
              if (item.id === selectedItemForManager.id) {
                return {
                  ...item,
                  manager: manager,
                };
              }
              return item;
            });
            setSalesItems(updatedItems);
            recalculateAmounts(updatedItems);
          }
          setIsManagerPickerModalOpen(false);
          setSelectedItemForManager(null);
        }}
      />

      {/* Prepaid Deduction Modal (for individual item) */}
      <PrepaidDeductionModal
        isOpen={isPrepaidDeductionModalOpen}
        customerId={customer?.id || null}
        initialAmount={selectedItemForPrepaidDeduction?.prepaidDeduction || 0}
        selectedItemId={selectedItemForPrepaidDeduction?.id || null}
        onClose={() => {
          setIsPrepaidDeductionModalOpen(false);
          setSelectedItemForPrepaidDeduction(null);
        }}
        onComplete={async (amount) => {
          if (!selectedItemForPrepaidDeduction || !customer) return;
          
          // 정액권 잔액 확인
          const currentTotalPrepaidDeduction = calculateItemPrepaidDeductionTotal(selectedItemForPrepaidDeduction.id, amount);
          
          if (!validatePrepaidBalance(currentTotalPrepaidDeduction)) {
            showPrepaidBalanceError();
            return;
          }
          
          // 정액권 차감 적용 및 상태 업데이트
          const updatedItems = applyPrepaidDeduction(salesItems, amount, selectedItemForPrepaidDeduction.id);
          const { newPrepaidDeductionAmount, newTotal } = updatePrepaidDeductionState(updatedItems);
          
          // 받을 금액 확인
          const newAmountToReceive = calculateAmountToReceive(newTotal, newPrepaidDeductionAmount);
          
          // 모달 닫기
          setIsPrepaidDeductionModalOpen(false);
          setSelectedItemForPrepaidDeduction(null);
          
          if (newAmountToReceive <= 0) {
            await handleComplete();
          } else {
            showOutstandingAmountConfirmation(newAmountToReceive, handleComplete);
          }
        }}
        onAdditionalInput={(amount) => {
          if (!selectedItemForPrepaidDeduction || !customer) return;
          
          // 정액권 잔액 확인
          const currentTotalPrepaidDeduction = calculateItemPrepaidDeductionTotal(selectedItemForPrepaidDeduction.id, amount);
          
          if (!validatePrepaidBalance(currentTotalPrepaidDeduction)) {
            showPrepaidBalanceError();
            return;
          }
          
          // 정액권 차감 적용 및 상태 업데이트
          const updatedItems = applyPrepaidDeduction(salesItems, amount, selectedItemForPrepaidDeduction.id);
          updatePrepaidDeductionState(updatedItems);
          
          // 모달 닫기
          setIsPrepaidDeductionModalOpen(false);
          setSelectedItemForPrepaidDeduction(null);
        }}
      />

      {/* Global Prepaid Deduction Modal (for deduction section) */}
      <PrepaidDeductionModal
        isOpen={isGlobalPrepaidDeductionModalOpen}
        customerId={customer?.id || null}
        initialAmount={0}
        selectedItemId={null}
        onClose={() => {
          setIsGlobalPrepaidDeductionModalOpen(false);
        }}
        onComplete={async (amount) => {
          if (!customer) return;
          
          // 정액권 잔액 확인
          const totalPrepaidDeduction = amount * salesItems.length;
          
          if (!validatePrepaidBalance(totalPrepaidDeduction)) {
            showPrepaidBalanceError();
            return;
          }
          
          // 모든 항목에 정액권 차감 적용 및 상태 업데이트
          const updatedItems = applyPrepaidDeduction(salesItems, amount);
          const { newPrepaidDeductionAmount, newTotal } = updatePrepaidDeductionState(updatedItems);
          
          // 받을 금액 확인
          const newAmountToReceive = calculateAmountToReceive(newTotal, newPrepaidDeductionAmount);
          
          // 모달 닫기
          setIsGlobalPrepaidDeductionModalOpen(false);
          
          if (newAmountToReceive <= 0) {
            await handleComplete();
          } else {
            showOutstandingAmountConfirmation(newAmountToReceive, handleComplete);
          }
        }}
        onAdditionalInput={(amount) => {
          if (!customer) return;
          
          // 정액권 잔액 확인
          const currentTotalPrepaidDeduction = salesItems.reduce((sum, item) => sum + item.prepaidDeduction, 0);
          const newTotalPrepaidDeduction = currentTotalPrepaidDeduction + (amount * salesItems.length);
          
          if (!validatePrepaidBalance(newTotalPrepaidDeduction)) {
            showPrepaidBalanceError();
            return;
          }
          
          // 모든 항목에 정액권 차감 추가 적용 및 상태 업데이트
          const updatedItems = applyPrepaidDeduction(salesItems, amount);
          updatePrepaidDeductionState(updatedItems);
          
          // 모달 닫기
          setIsGlobalPrepaidDeductionModalOpen(false);
        }}
      />


      {/* Confirmation Alert Modal */}
      <ConfirmationAlertModal
        isOpen={isConfirmationAlertOpen}
        title={confirmationAlertData?.title || ''}
        message={confirmationAlertData?.message || ''}
        highlightText={confirmationAlertData?.highlightText}
        onConfirm={() => {
          if (confirmationAlertData?.onConfirm) {
            confirmationAlertData.onConfirm();
          }
        }}
        onCancel={() => {
          setIsConfirmationAlertOpen(false);
          setConfirmationAlertData(null);
        }}
      />

      {/* Error Alert Modal */}
      <ErrorAlertModal
        isOpen={isErrorAlertOpen}
        title={errorAlertData?.title || ''}
        message={errorAlertData?.message || ''}
        onClose={() => {
          setIsErrorAlertOpen(false);
          setErrorAlertData(null);
        }}
      />
    </div>
  );
}
