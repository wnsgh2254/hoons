'use client';

import { useState, useEffect } from 'react';
import DiscountModal from './DiscountModal';
import PaymentInputModal from './PaymentInputModal';
import SalesClassificationModal from './SalesClassificationModal';
import ManagerPickerModal from './ManagerPickerModal';
import PrepaidDeductionModal from './PrepaidDeductionModal';
import { AlertModal, Button, Input, Modal, Select } from '@/components/ui';
import { Z } from '@/lib/constants';
import type { SalesDetailData, TempSalesData } from '@/lib/types';
import { getSydneyToday, getSydneyNowTime } from '@/lib/utils/appointment-utils';

function formatAudAmount(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatPaymentTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

/** Gross sale total minus deposit credit (capped), never negative */
function netDueAfterDeposit(grossTotal: number, depositPaid: number): number {
  const g = Math.max(0, grossTotal);
  const d = Math.max(0, depositPaid);
  return Math.max(0, g - Math.min(d, g));
}

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
  /** Comment: Prepaid product — credit issued to prepaid_passes on sale POST */
  prepaidCreditPoints?: number;
  prepaidExpiresAt?: string | null;
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
  onOpenItemPicker?: (tab: 'service' | 'product' | 'prepaid') => void;
  onComplete?: () => void; // 판매 등록 완료 시 호출
  initialData?: SalesDetailData | null;
  editSaleId?: number | null;
  shopId?: number | null;
  // 임시저장 관련
  bookingId?: number | null;
  /** Already-paid deposit for linked booking (AUD); reduces net due / 합계 */
  bookingDepositPaid?: number | null;
  tempSaveData?: TempSalesData | null;
  /** Comment: Called after temp save/delete so parent can update temp-sale flags without bulk fetch */
  onTemporarySave?: (bookingId: number) => void;
  onDeleteTempSave?: (bookingId: number) => void;
}

export default function SalesRegistrationModal({
  isOpen,
  customer,
  onClose,
  onOpenItemPicker,
  onComplete,
  initialData,
  editSaleId,
  shopId,
  bookingId,
  bookingDepositPaid,
  tempSaveData,
  onTemporarySave,
  onDeleteTempSave,
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
  const [salesDate, setSalesDate] = useState(getSydneyToday());
  const [salesTime, setSalesTime] = useState(getSydneyNowTime());
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [selectedItemForDiscount, setSelectedItemForDiscount] = useState<SalesItem | null>(null);
  const [editingQuantityItemId, setEditingQuantityItemId] = useState<string | null>(null);
  const [isPaymentInputModalOpen, setIsPaymentInputModalOpen] = useState(false);
  const [isSalesClassificationModalOpen, setIsSalesClassificationModalOpen] = useState(false);
  const [selectedItemForClassification, setSelectedItemForClassification] = useState<SalesItem | null>(null);
  const [isManagerPickerModalOpen, setIsManagerPickerModalOpen] = useState(false);
  const [selectedItemForManager, setSelectedItemForManager] = useState<SalesItem | null>(null);
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
  const [availablePrepaidBalance, setAvailablePrepaidBalance] = useState(0);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(shopId || null);
  const [depositCredit, setDepositCredit] = useState(0);

  // 정액권 잔액 확인 헬퍼 함수
  const validatePrepaidBalance = (newDeductionAmount: number): boolean => {
    if (!customer) return false;
    const fallbackBalance = Number(customer?.prepaid_balance ?? customer?.points ?? 0);
    const customerPrepaidBalance = Math.max(availablePrepaidBalance, fallbackBalance);
    return newDeductionAmount <= customerPrepaidBalance;
  };

  // 받을 금액 계산 헬퍼 함수 (gross total before deposit)
  const calculateAmountToReceive = (grossTotal: number, prepaidDeduction: number): number => {
    const netDue = netDueAfterDeposit(grossTotal, depositCredit);
    const positivePaymentAmount = Math.max(0, paymentAmounts.cash) + Math.max(0, paymentAmounts.card) + Math.max(0, paymentAmounts.bank_transfer);
    const negativePaymentAmount = Math.abs(Math.min(0, paymentAmounts.cash)) + Math.abs(Math.min(0, paymentAmounts.card)) + Math.abs(Math.min(0, paymentAmounts.bank_transfer));
    return netDue - positivePaymentAmount - negativePaymentAmount - prepaidDeduction;
  };

  // Recalculate per-item amount from unit/qty/discount/prepaid
  const normalizeItemAmount = (item: SalesItem): SalesItem => {
    const raw = (item.unitPrice * item.quantity) - item.discount - item.prepaidDeduction;
    return { ...item, amount: Math.max(0, raw) };
  };

  // Apply prepaid deduction once against the total (not multiplied by item count).
  // If targetItemId is provided, apply only to that row. Otherwise distribute across all rows.
  const applyTotalPrepaidDeduction = (
    items: SalesItem[],
    requestedTotalDeduction: number,
    targetItemId?: string | null,
  ): SalesItem[] => {
    const normalizedRequested = Math.max(0, Number(requestedTotalDeduction) || 0);
    const base = items.map((item) => ({ ...item, prepaidDeduction: 0 }));

    if (base.length === 0 || normalizedRequested <= 0) {
      return base.map(normalizeItemAmount);
    }

    if (targetItemId) {
      return base.map((item) => {
        if (item.id !== targetItemId) return normalizeItemAmount(item);
        const maxForItem = Math.max(0, (item.unitPrice * item.quantity) - item.discount);
        const applied = Math.min(normalizedRequested, maxForItem);
        return normalizeItemAmount({ ...item, prepaidDeduction: applied });
      });
    }

    // Global: distribute deduction from top to bottom, capped by each item's payable amount
    let remaining = normalizedRequested;
    const distributed = base.map((item) => {
      const maxForItem = Math.max(0, (item.unitPrice * item.quantity) - item.discount);
      const applied = Math.min(remaining, maxForItem);
      remaining -= applied;
      return normalizeItemAmount({ ...item, prepaidDeduction: applied });
    });
    return distributed;
  };

  // 정액권 차감 적용 후 상태 업데이트 헬퍼 함수
  const updatePrepaidDeductionState = (items: SalesItem[]) => {
    const newPrepaidDeductionAmount = items.reduce((sum, item) => sum + item.prepaidDeduction, 0);
    const newSalesAmount = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const newDiscountAmount = items.reduce((sum, item) => sum + item.discount, 0);
    const newTotal = newSalesAmount - newDiscountAmount;
    
    setPrepaidDeductionAmount(newPrepaidDeductionAmount);
    setSalesItems(items);
    recalculateAmounts(items, undefined, newPrepaidDeductionAmount);
    return { newPrepaidDeductionAmount, newTotal };
  };

  // 에러 알림 표시 헬퍼 함수
  const showPrepaidBalanceError = () => {
    setErrorAlertData({
      title: '알림',
      message: '정액권 잔액이 부족하거나 사용 가능한 정액권이 없습니다.',
    });
    setIsErrorAlertOpen(true);
  };

  // 확인 알림 표시 헬퍼 함수
  const showOutstandingAmountConfirmation = (outstanding: number, onConfirm: () => void) => {
    const aud = formatAudAmount(outstanding);
    setConfirmationAlertData({
      title: '알림',
      message: `미수금이 ${aud} 발생됩니다. 계산완료 하시겠습니까?`,
      highlightText: aud,
      onConfirm: async () => {
        await onConfirm();
        setIsConfirmationAlertOpen(false);
        setConfirmationAlertData(null);
      },
    });
    setIsConfirmationAlertOpen(true);
  };

  // 금액 재계산 함수
  const recalculateAmounts = (
    items: SalesItem[],
    paymentAmountsToUse?: typeof paymentAmounts,
    prepaidDeductionOverride?: number,
  ) => {
    const prepaidToUse =
      prepaidDeductionOverride !== undefined ? prepaidDeductionOverride : prepaidDeductionAmount;
    const amounts = paymentAmountsToUse || paymentAmounts;
    // 양수 결제 금액만 합산 (음수는 받을 금액에서 빼기용이므로 별도 처리)
    const positivePaymentAmount = Math.max(0, amounts.cash) + Math.max(0, amounts.card) + Math.max(0, amounts.bank_transfer);
    // 음수 결제 금액의 절댓값 합산 (받을 금액에서 빼기)
    const negativePaymentAmount = Math.abs(Math.min(0, amounts.cash)) + Math.abs(Math.min(0, amounts.card)) + Math.abs(Math.min(0, amounts.bank_transfer));
    
    const newSalesAmount = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const newDiscountAmount = items.reduce((sum, item) => sum + item.discount, 0);
    const grossTotal = newSalesAmount - newDiscountAmount;
    const netDue = netDueAfterDeposit(grossTotal, depositCredit);

    setSalesAmount(newSalesAmount);
    setDiscountAmount(newDiscountAmount);
    setTotal(grossTotal);
    // 받을 금액 = (합계 − 예수금) − 결제 − 정액권
    setAmountToReceive(netDue - positivePaymentAmount - negativePaymentAmount - prepaidToUse);
  };

  // 판매 항목 추가 함수
  const addSalesItem = (item: {
    id: number;
    name: string;
    price: number;
    type: 'service' | 'product' | 'prepaid';
    manager?: string;
    prepaid_credit_points?: number;
    prepaid_expires_at?: string | null;
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
      prepaidCreditPoints:
        item.type === 'prepaid' ? Math.round(Number(item.prepaid_credit_points ?? 0)) : undefined,
      prepaidExpiresAt:
        item.type === 'prepaid' && item.prepaid_expires_at != null
          ? String(item.prepaid_expires_at)
          : item.type === 'prepaid'
            ? null
            : undefined,
    };
    setSalesItems(prev => {
      const updatedItems = [...prev, newSalesItem];
      recalculateAmounts(updatedItems);
      return updatedItems;
    });
  };

  // Fetch shops only when the modal is first opened (avoid calling on mount when closed)
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/shops').then(r => r.json()).then(d => setShops(d.shops || [])).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    setSelectedShopId(shopId || null);
  }, [shopId]);

  useEffect(() => {
    if (isOpen) {
      const initialDeposit =
        initialData && editSaleId ? 0 : Math.max(0, Number(bookingDepositPaid) || 0);
      setDepositCredit(initialDeposit);

      // 서브 모달 상태 초기화 (공통)
      setIsDiscountModalOpen(false);
      setSelectedItemForDiscount(null);
      setEditingQuantityItemId(null);
      setIsPaymentInputModalOpen(false);
      setIsSalesClassificationModalOpen(false);
      setSelectedItemForClassification(null);
      setIsManagerPickerModalOpen(false);
      setSelectedItemForManager(null);

      if (initialData && editSaleId) {
        // 수정 모드: 기존 데이터로 폼 채우기
        const mappedItems: SalesItem[] = initialData.items.map((item, idx) => ({
          id: `${item.item_type}-edit-${idx}-${Date.now()}`,
          type: item.item_type,
          name: item.item_name,
          unitPrice: item.unit_price,
          quantity: item.quantity,
          discount: item.discount,
          discountType: (item.discount_type as DiscountType) || undefined,
          discountValue: item.discount_value ?? undefined,
          amount: item.amount,
          manager: item.manager || '',
          salesClassification: item.sales_classification || '',
          prepaidDeduction: item.prepaid_deduction || 0,
        }));
        setSalesItems(mappedItems);
        setMemo(initialData.memo || '');
        setSalesDate(initialData.sales_date);
        setSalesTime(initialData.sales_time);
        setPointAccumulation(initialData.point_accumulation || 0);
        const newSalesAmount = mappedItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        const newDiscountAmount = mappedItems.reduce((sum, item) => sum + item.discount, 0);
        const newPrepaidDeduction = mappedItems.reduce((sum, item) => sum + item.prepaidDeduction, 0);
        const gross = newSalesAmount - newDiscountAmount;
        const netDue = netDueAfterDeposit(gross, 0);

        // Fallback: legacy sales saved with payment_method but no per-method amount.
        // Treat them as fully paid via that method so edit view mirrors the original payment.
        const rawCash = initialData.cash_amount || 0;
        const rawCard = initialData.card_amount || 0;
        const rawBank = initialData.bank_transfer_amount || 0;
        const rawMethod = (initialData.payment_method || '').toLowerCase();
        const netPayable = Math.max(0, netDue - newPrepaidDeduction);
        const hasExplicitAmount = rawCash !== 0 || rawCard !== 0 || rawBank !== 0;
        const restoredAmounts = {
          cash: rawCash,
          card: rawCard,
          bank_transfer: rawBank,
        };
        if (!hasExplicitAmount && netPayable > 0 && (rawMethod === 'cash' || rawMethod === 'card' || rawMethod === 'bank_transfer')) {
          restoredAmounts[rawMethod] = netPayable;
        }

        setPaymentAmounts(restoredAmounts);
        setPrepaidDeductionAmount(newPrepaidDeduction);
        setSelectedDeduction(newPrepaidDeduction > 0 ? 'prepaid' : null);
        setPaymentMethod(null);
        setActiveTab('service');
        setSalesAmount(newSalesAmount);
        setDiscountAmount(newDiscountAmount);
        setTotal(gross);
        const totalPaid = restoredAmounts.cash + restoredAmounts.card + restoredAmounts.bank_transfer;
        setAmountToReceive(netDue - totalPaid - newPrepaidDeduction);
      } else if (tempSaveData) {
        // 임시저장 복원 모드
        const mappedItems: SalesItem[] = tempSaveData.salesItems.map((item) => ({
          id: item.id,
          type: item.type,
          name: item.name,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          discount: item.discount,
          discountType: item.discountType,
          discountValue: item.discountValue,
          amount: item.amount,
          manager: item.manager,
          salesClassification: item.salesClassification,
          prepaidDeduction: item.prepaidDeduction,
          prepaidCreditPoints: item.prepaidCreditPoints,
          prepaidExpiresAt: item.prepaidExpiresAt,
        }));
        setSalesItems(mappedItems);
        setMemo(tempSaveData.memo);
        setSalesDate(tempSaveData.salesDate);
        setSalesTime(tempSaveData.salesTime);
        setPointAccumulation(tempSaveData.pointAccumulation);
        setPaymentAmounts(tempSaveData.paymentAmounts);
        if (tempSaveData.selectedShopId != null) setSelectedShopId(tempSaveData.selectedShopId);
        const newPrepaidDeduction = mappedItems.reduce((sum, item) => sum + item.prepaidDeduction, 0);
        setPrepaidDeductionAmount(newPrepaidDeduction);
        setSelectedDeduction(null);
        setPaymentMethod(null);
        setActiveTab('service');
        // 금액 계산
        const newSalesAmount = mappedItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        const newDiscountAmount = mappedItems.reduce((sum, item) => sum + item.discount, 0);
        setSalesAmount(newSalesAmount);
        setDiscountAmount(newDiscountAmount);
        const grossT = newSalesAmount - newDiscountAmount;
        setTotal(grossT);
        const totalPaid = (tempSaveData.paymentAmounts.cash || 0) + (tempSaveData.paymentAmounts.card || 0) + (tempSaveData.paymentAmounts.bank_transfer || 0);
        const netDueT = netDueAfterDeposit(grossT, initialDeposit);
        setAmountToReceive(netDueT - totalPaid - newPrepaidDeduction);
      } else {
        // 등록 모드: 모든 상태 초기화
        setSalesItems([]);
        setSalesAmount(0);
        setDiscountAmount(0);
        setTotal(0);
        setAmountToReceive(0);
        setPointAccumulation(0);
        setSelectedDeduction(null);
        setPaymentMethod(null);
        setMemo('');
        setSalesDate(getSydneyToday());
        setSalesTime(getSydneyNowTime());
        setPaymentAmounts({
          cash: 0,
          card: 0,
          bank_transfer: 0,
        });
        setPrepaidDeductionAmount(0);
        setActiveTab('service');
      }
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

  const netTotalDisplay = netDueAfterDeposit(total, depositCredit);

  const handleAddItem = () => {
    onOpenItemPicker?.(activeTab);
  };

  const handleComplete = async () => {
    if (!customer || salesItems.length === 0) {
      alert('고객 정보와 판매 항목이 필요합니다.');
      return;
    }

    // 받을 금액 확인
    const positivePaymentAmount = Math.max(0, paymentAmounts.cash) + Math.max(0, paymentAmounts.card) + Math.max(0, paymentAmounts.bank_transfer);
    const negativePaymentAmount = Math.abs(Math.min(0, paymentAmounts.cash)) + Math.abs(Math.min(0, paymentAmounts.card)) + Math.abs(Math.min(0, paymentAmounts.bank_transfer));
    const grossTotal = salesAmount - discountAmount;
    const netDue = netDueAfterDeposit(grossTotal, depositCredit);
    const currentAmountToReceive = netDue - positivePaymentAmount - negativePaymentAmount - prepaidDeductionAmount;

    // 받을 금액이 남아있으면 확인 알림 표시
    if (currentAmountToReceive > 0) {
      const aud = formatAudAmount(currentAmountToReceive);
      setConfirmationAlertData({
        title: '알림',
        message: `미수금이 ${aud} 발생됩니다. 계산완료 하시겠습니까?`,
        highlightText: aud,
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

    const isEditMode = !!editSaleId;

    try {
      const url = isEditMode ? `/api/sales/${editSaleId}` : '/api/sales';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: customer.id,
          shop_id: selectedShopId || null,
          booking_id: bookingId ?? undefined,
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
            ...(item.type === 'prepaid'
              ? {
                  prepaid_credit_points: item.prepaidCreditPoints ?? 0,
                  prepaid_expires_at: item.prepaidExpiresAt ?? null,
                }
              : {}),
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
        throw new Error(errorData.error || (isEditMode ? '판매 수정에 실패했습니다.' : '판매 등록에 실패했습니다.'));
      }

      // 임시저장이 있으면 삭제
      if (bookingId) {
        try {
          await fetch(`/api/temp-sales?booking_id=${bookingId}`, { method: 'DELETE' });
          onDeleteTempSave?.(bookingId);
        } catch {
          // 임시저장 삭제 실패해도 판매는 완료된 것으로 처리
        }
      }

      if (onComplete) {
        onComplete();
      }
      onClose();
    } catch (error: any) {
      console.error(isEditMode ? '판매 수정 오류:' : '판매 등록 오류:', error);
      alert(error.message || '판매 처리 중 오류가 발생했습니다.');
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
      const gross = salesAmount - discountAmount;
      const netDue = netDueAfterDeposit(gross, depositCredit);
      const newAmountToReceive = netDue - positivePaymentAmount - negativePaymentAmount - prepaidDeductionAmount;
      
      // 받을 금액이 0이면 판매 등록 완료
      // NOTE: handleComplete()는 paymentAmounts state를 다시 읽기 때문에,
      // setPaymentAmounts가 아직 반영되지 않은 상태에서 호출하면 stale state를 읽게 됨.
      // 따라서 이미 계산된 newAmountToReceive로 판단 후 performSaleRegistration()을 직접 호출.
      if (newAmountToReceive <= 0) {
        // 판매 등록 완료
        await performSaleRegistration();
        setIsPaymentInputModalOpen(false);
      } else {
        // 받을 금액이 남아있으면 확인 알림 표시
        const aud = formatAudAmount(newAmountToReceive);
        setConfirmationAlertData({
          title: '알림',
          message: `미수금이 ${aud} 발생됩니다. 계산완료 하시겠습니까?`,
          highlightText: aud,
          onConfirm: async () => {
            await performSaleRegistration();
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

  const handleTemporarySave = async () => {
    if (!customer || !bookingId) {
      setErrorAlertData({
        title: '알림',
        message: '예약 정보가 없어 임시 저장할 수 없습니다.',
      });
      setIsErrorAlertOpen(true);
      return;
    }

    try {
      const tempData = {
        bookingId,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone ?? undefined,
        salesItems: salesItems.map((item) => ({
          id: item.id,
          type: item.type,
          name: item.name,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          discount: item.discount,
          discountType: item.discountType,
          discountValue: item.discountValue,
          amount: item.amount,
          manager: item.manager,
          salesClassification: item.salesClassification,
          prepaidDeduction: item.prepaidDeduction,
          ...(item.type === 'prepaid'
            ? {
                prepaidCreditPoints: item.prepaidCreditPoints,
                prepaidExpiresAt: item.prepaidExpiresAt ?? null,
              }
            : {}),
        })),
        paymentAmounts,
        pointAccumulation,
        memo,
        salesDate,
        salesTime,
        selectedShopId,
      };

      const response = await fetch('/api/temp-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          customer_id: customer.id,
          data: tempData,
        }),
      });

      if (!response.ok) {
        throw new Error('임시 저장에 실패했습니다.');
      }

      onTemporarySave?.(bookingId);
      onClose();
    } catch (error: any) {
      console.error('임시 저장 오류:', error);
      setErrorAlertData({
        title: '오류',
        message: error.message || '임시 저장 중 오류가 발생했습니다.',
      });
      setIsErrorAlertOpen(true);
    }
  };

  const handleDeleteTempSave = async () => {
    if (!bookingId) return;

    try {
      const response = await fetch(`/api/temp-sales?booking_id=${bookingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('임시저장 삭제에 실패했습니다.');
      }

      onDeleteTempSave?.(bookingId);
      onClose();
    } catch (error: any) {
      console.error('임시저장 삭제 오류:', error);
      setErrorAlertData({
        title: '오류',
        message: error.message || '임시저장 삭제 중 오류가 발생했습니다.',
      });
      setIsErrorAlertOpen(true);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isPaymentInputModalOpen && !isManagerPickerModalOpen && !isSalesClassificationModalOpen && !isDiscountModalOpen) {
          onClose();
        }
      }}
      title={editSaleId ? "판매 수정" : "판매 등록"}
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
          {/* Sales Item Selection Buttons */}
          <div className="mb-5.5">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">판매 항목 선택</span>
              <div className="flex gap-2">
                {(['service', 'product', 'prepaid'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab);
                      onOpenItemPicker?.(tab);
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
          <div className="mb-5.5" onClick={() => setEditingQuantityItemId(null)}>
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
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {salesItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-7.5 text-center text-sm text-gray-500">
                        내역이 없습니다
                      </td>
                    </tr>
                  ) : (
                    salesItems.map((item) => (
                      <tr key={item.id} className="border-t border-gray-100">
                        <td className="py-3 px-4 text-sm text-gray-900">{item.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{formatAudAmount(item.unitPrice)}</td>
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
                              ? formatAudAmount(item.discountValue)
                              : formatAudAmount(Number(item.discountValue))
                            : item.discount > 0
                            ? formatAudAmount(item.discount)
                            : ''}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">{formatAudAmount(item.amount)}</td>
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
                <span className="text-sm font-medium text-gray-900">{formatAudAmount(salesAmount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">할인 금액</span>
                <span className="text-sm font-medium text-gray-900">{formatAudAmount(discountAmount)}</span>
              </div>
              {depositCredit > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">예수금 (납부됨)</span>
                  <span className="text-sm font-medium text-emerald-700">{formatAudAmount(depositCredit)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">합계 (결제대상)</span>
                <span className="text-sm font-medium text-gray-900">{formatAudAmount(netTotalDisplay)}</span>
              </div>
              
              {/* Payment Amounts Display */}
              {(paymentAmounts.cash !== 0 || paymentAmounts.card !== 0 || paymentAmounts.bank_transfer !== 0) && (
                <div className="space-y-2 pt-1">
                  {paymentAmounts.cash !== 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">현금</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${paymentAmounts.cash < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {paymentAmounts.cash < 0 ? '-' : ''}
                          {formatAudAmount(Math.abs(paymentAmounts.cash))}
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
                          {paymentAmounts.card < 0 ? '-' : ''}
                          {formatAudAmount(Math.abs(paymentAmounts.card))}
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
                          {paymentAmounts.bank_transfer < 0 ? '-' : ''}
                          {formatAudAmount(Math.abs(paymentAmounts.bank_transfer))}
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
                  {editSaleId && initialData?.created_at && (
                    <div className="text-xs text-gray-500 mt-2">
                      [결제 일시 {formatPaymentTimestamp(initialData.created_at)}]
                    </div>
                  )}
                </div>
              )}
              
              {/* Prepaid Deduction Display */}
              {prepaidDeductionAmount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">정액권</span>
                  <span className="font-medium text-red-600">
                    -{formatAudAmount(prepaidDeductionAmount)}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">받을 금액</span>
                <span className="text-sm font-semibold text-red-600">{formatAudAmount(amountToReceive)}</span>
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
                  <Input
                    type="date"
                    value={salesDate}
                    onChange={(e) => setSalesDate(e.target.value)}
                    wrapperClassName="flex-1 min-w-0"
                  />
                  <Input
                    type="time"
                    value={salesTime}
                    onChange={(e) => setSalesTime(e.target.value)}
                    wrapperClassName="flex-1 min-w-0"
                  />
                </div>
              </div>

              {/* Shop */}
              {shops.length > 0 && (
                <Select
                  label="지점"
                  options={shops.map((s: any) => ({ value: s.id, label: s.name }))}
                  value={selectedShopId ?? ''}
                  onChange={(e) => setSelectedShopId(Number(e.target.value))}
                />
              )}
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
                <Button className="w-full" onClick={handleComplete}>
                  {editSaleId ? '수정 완료' : '계산 완료'}
                </Button>
                <Button variant="ghost" className="w-full" onClick={handleCancel}>
                  취소
                </Button>
                {bookingId && (
                  <Button variant="secondary" className="w-full" onClick={handleTemporarySave}>
                    임시 저장
                  </Button>
                )}
                {tempSaveData && bookingId && (
                  <Button variant="danger" className="w-full" onClick={handleDeleteTempSave}>
                    임시저장 삭제
                  </Button>
                )}
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

      {/* Global Prepaid Deduction Modal (for deduction section) */}
      <PrepaidDeductionModal
        isOpen={isGlobalPrepaidDeductionModalOpen}
        customerId={customer?.id || null}
        initialAmount={amountToReceive}
        selectedItemId={null}
        onBalanceLoaded={(balance) => setAvailablePrepaidBalance(balance)}
        onClose={() => {
          setIsGlobalPrepaidDeductionModalOpen(false);
        }}
        onComplete={async (amount) => {
          if (!customer) return;
          
          // 정액권 잔액 확인 (총액 기준 1회 차감)
          const totalPrepaidDeduction = amount;
          
          if (!validatePrepaidBalance(totalPrepaidDeduction)) {
            showPrepaidBalanceError();
            return;
          }
          
          // 모든 항목에 총 정액권 차감액을 분배 적용
          const updatedItems = applyTotalPrepaidDeduction(salesItems, amount);
          updatePrepaidDeductionState(updatedItems);
          
          // 모달 닫기
          setIsGlobalPrepaidDeductionModalOpen(false);
        }}
        onAdditionalInput={(amount) => {
          if (!customer) return;
          
          // 정액권 잔액 확인
          const currentTotalPrepaidDeduction = salesItems.reduce((sum, item) => sum + item.prepaidDeduction, 0);
          const newTotalPrepaidDeduction = currentTotalPrepaidDeduction + amount;
          
          if (!validatePrepaidBalance(newTotalPrepaidDeduction)) {
            showPrepaidBalanceError();
            return;
          }
          
          // 기존 총액 + 추가 입력 금액을 다시 분배 적용
          const updatedItems = applyTotalPrepaidDeduction(salesItems, newTotalPrepaidDeduction);
          updatePrepaidDeductionState(updatedItems);
          
          // 모달 닫기
          setIsGlobalPrepaidDeductionModalOpen(false);
        }}
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

      {/* Error Alert Modal */}
      <AlertModal
        isOpen={isErrorAlertOpen}
        title={errorAlertData?.title || ''}
        message={errorAlertData?.message || ''}
        variant="error"
        onClose={() => {
          setIsErrorAlertOpen(false);
          setErrorAlertData(null);
        }}
      />
    </Modal>
  );
}
