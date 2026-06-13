'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import DiscountModal from './DiscountModal';
import PaymentInputModal from './PaymentInputModal';
import SalesClassificationModal from './SalesClassificationModal';
import ManagerPickerModal from './ManagerPickerModal';
import PrepaidDeductionModal from './PrepaidDeductionModal';
import { AlertModal, Button, Input, Modal, Select } from '@/components/ui';
import { Z } from '@/lib/constants';
import type { SalesDetailData } from '@/lib/types';
import { getSydneyToday } from '@/lib/utils/appointment-utils';
import {
  normalizePaymentAmounts,
  resolvePaymentMethodFromAmounts,
} from '@/lib/sales-payment-utils';
import {
  netDueAfterDeposit,
  normalizeBookingDepositPaid,
} from '@/lib/booking-deposit-paid';
import {
  capPaymentToRemaining,
  remainingDueBeforeCash,
  splitCashTender,
} from '@/lib/sales-cash-payment';
import { formatAudAmount, roundToCents } from '@/lib/utils';
import {
  clearSalesDraft,
  getSalesDraftKey,
  getSalesDraftFallbackKey,
  loadSalesDraftForCustomer,
  saveSalesDraft,
  type SalesRegistrationDraft,
} from '@/lib/sales-registration-draft';

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
  designerId?: number | null;
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
  /** Clear draft and reopen item picker from scratch (booking unchanged) */
  onRestartRegistration?: () => void;
  onComplete?: () => void | Promise<void>; // 판매 등록 완료 시 호출
  /** Called after successful sale edit — parent can refresh detail modal without closing it conceptually */
  onEditComplete?: (saleId: number) => void | Promise<void>;
  initialData?: SalesDetailData | null;
  editSaleId?: number | null;
  shopId?: number | null;
  bookingId?: number | null;
  defaultSalesDate?: string | null;
  defaultSalesTime?: string | null;
  /** Already-paid deposit for linked booking (AUD); reduces net due / 합계 */
  bookingDepositPaid?: number | null;
}

export default function SalesRegistrationModal({
  isOpen,
  customer,
  onClose,
  onOpenItemPicker,
  onRestartRegistration,
  onComplete,
  onEditComplete,
  initialData,
  editSaleId,
  shopId,
  bookingId,
  defaultSalesDate,
  defaultSalesTime,
  bookingDepositPaid,
}: SalesRegistrationModalProps) {
  const getCurrentLocalTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };
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
  const [salesTime, setSalesTime] = useState(getCurrentLocalTime());
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
  const [prepaidCustomerId, setPrepaidCustomerId] = useState<number | null>(null);
  const [prepaidCustomerName, setPrepaidCustomerName] = useState('');
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(shopId || null);
  const [depositCredit, setDepositCredit] = useState(0);
  /** Physical cash received from customer (may exceed applied cash_amount). */
  const [cashTendered, setCashTendered] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draftSavedMessage, setDraftSavedMessage] = useState<string | null>(null);
  const [draftRestoredMessage, setDraftRestoredMessage] = useState<string | null>(null);
  const wasOpenRef = useRef(false);
  const initializedForOpenRef = useRef(false);
  const skipBookingDepositApplyRef = useRef(false);
  const prepaidBalanceRequestRef = useRef(0);

  const normalizeShopId = (value: number | string | null | undefined): number | null => {
    if (value == null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  useEffect(() => {
    if (customer?.id) {
      setPrepaidCustomerId(customer.id);
      setPrepaidCustomerName(customer.name || '');
    }
  }, [customer?.id, customer?.name]);

  const getEffectivePrepaidBalance = useCallback(
    (liveBalance?: number): number => {
      const fetched = liveBalance ?? availablePrepaidBalance;
      const fallbackBalance =
        prepaidCustomerId != null && prepaidCustomerId === customer?.id
          ? Number(customer?.prepaid_balance ?? customer?.points ?? 0)
          : 0;
      return Math.max(0, Math.max(fetched, fallbackBalance));
    },
    [availablePrepaidBalance, prepaidCustomerId, customer?.id, customer?.prepaid_balance, customer?.points],
  );

  const resolvePrepaidBalanceFromApi = (data: {
    totalPoints?: number;
    usableMembers?: Array<{ points?: number | string | null }>;
    member?: { points?: number | string | null } | null;
  }): number => {
    if (typeof data.totalPoints === 'number' && Number.isFinite(data.totalPoints)) {
      return Math.max(0, data.totalPoints);
    }
    const source = Array.isArray(data.usableMembers)
      ? data.usableMembers
      : data.member
        ? [data.member]
        : [];
    return source.reduce((sum, row) => sum + Number(row.points || 0), 0);
  };

  const refreshAvailablePrepaidBalance = useCallback(
    async (customerId: number | null): Promise<number> => {
      if (!customerId) {
        setAvailablePrepaidBalance(0);
        return 0;
      }

      const requestId = ++prepaidBalanceRequestRef.current;
      try {
        const res = await fetch(`/api/prepaid?customer_id=${customerId}`);
        const data = await res.json();
        const total = res.ok ? resolvePrepaidBalanceFromApi(data) : 0;
        if (requestId !== prepaidBalanceRequestRef.current) {
          return getEffectivePrepaidBalance(total);
        }
        setAvailablePrepaidBalance(total);
        return getEffectivePrepaidBalance(total);
      } catch {
        if (requestId !== prepaidBalanceRequestRef.current) {
          return getEffectivePrepaidBalance();
        }
        setAvailablePrepaidBalance(0);
        return getEffectivePrepaidBalance(0);
      }
    },
    [getEffectivePrepaidBalance],
  );

  // Comment: Load prepaid balance when the sales modal opens — row clicks validate before the deduction modal opens.
  useEffect(() => {
    if (!isOpen) {
      prepaidBalanceRequestRef.current += 1;
      setAvailablePrepaidBalance(0);
      return;
    }
    if (prepaidCustomerId) {
      void refreshAvailablePrepaidBalance(prepaidCustomerId);
    }
  }, [isOpen, prepaidCustomerId, refreshAvailablePrepaidBalance]);

  const ensurePrepaidBalanceCovers = useCallback(
    async (deductionAmount: number): Promise<boolean> => {
      if (deductionAmount <= 0) return true;
      if (!prepaidCustomerId) return false;

      let balance = getEffectivePrepaidBalance();
      if (balance < deductionAmount) {
        balance = await refreshAvailablePrepaidBalance(prepaidCustomerId);
      }
      return deductionAmount <= balance;
    },
    [prepaidCustomerId, getEffectivePrepaidBalance, refreshAvailablePrepaidBalance],
  );

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
    return { ...item, amount: Math.max(0, roundToCents(raw)) };
  };

  // Comment: Prepaid purchases (정액권 판매) must never receive prepaid balance deductions.
  const maxPrepaidDeductibleForItem = (item: SalesItem): number => {
    if (item.type === 'prepaid') return 0;
    return Math.max(0, roundToCents(item.unitPrice * item.quantity - item.discount));
  };

  // Apply prepaid deduction once against the total (not multiplied by item count).
  // If targetItemId is provided, apply only to that row. Otherwise distribute across service/product rows.
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
        const applied = Math.min(normalizedRequested, maxPrepaidDeductibleForItem(item));
        return normalizeItemAmount({ ...item, prepaidDeduction: applied });
      });
    }

    // Global: distribute from top to bottom across service/product only
    let remaining = normalizedRequested;
    const distributed = base.map((item) => {
      const maxForItem = maxPrepaidDeductibleForItem(item);
      if (maxForItem <= 0) {
        return normalizeItemAmount({ ...item, prepaidDeduction: 0 });
      }
      const applied = Math.min(remaining, maxForItem);
      remaining -= applied;
      return normalizeItemAmount({ ...item, prepaidDeduction: applied });
    });
    return distributed;
  };

  // Toggle full-line prepaid deduction for one service/product row (prepaid purchase rows excluded).
  const toggleItemPrepaidDeduction = async (item: SalesItem) => {
    if (item.type === 'prepaid') return;

    const maxForItem = maxPrepaidDeductibleForItem(item);
    const nextDeduction = item.prepaidDeduction > 0 ? 0 : maxForItem;

    if (maxForItem <= 0 && nextDeduction <= 0) return;

    if (nextDeduction > 0) {
      const otherTotal = salesItems.reduce(
        (sum, row) => (row.id === item.id ? sum : sum + row.prepaidDeduction),
        0,
      );
      const hasBalance = await ensurePrepaidBalanceCovers(otherTotal + nextDeduction);
      if (!hasBalance) {
        showPrepaidBalanceError();
        return;
      }
    }

    const updatedItems = salesItems.map((row) => {
      if (row.id !== item.id) return normalizeItemAmount(row);
      return normalizeItemAmount({ ...row, prepaidDeduction: nextDeduction });
    });
    updatePrepaidDeductionState(updatedItems);
    const newTotal = updatedItems.reduce((sum, row) => sum + row.prepaidDeduction, 0);
    setSelectedDeduction(newTotal > 0 ? 'prepaid' : null);
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
    depositCreditOverride?: number,
  ) => {
    const prepaidToUse =
      prepaidDeductionOverride !== undefined ? prepaidDeductionOverride : prepaidDeductionAmount;
    const depositToUse =
      depositCreditOverride !== undefined ? depositCreditOverride : depositCredit;
    const amounts = paymentAmountsToUse || paymentAmounts;
    // 양수 결제 금액만 합산 (음수는 받을 금액에서 빼기용이므로 별도 처리)
    const positivePaymentAmount = Math.max(0, amounts.cash) + Math.max(0, amounts.card) + Math.max(0, amounts.bank_transfer);
    // 음수 결제 금액의 절댓값 합산 (받을 금액에서 빼기)
    const negativePaymentAmount = Math.abs(Math.min(0, amounts.cash)) + Math.abs(Math.min(0, amounts.card)) + Math.abs(Math.min(0, amounts.bank_transfer));
    
    const newSalesAmount = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const newDiscountAmount = items.reduce((sum, item) => sum + item.discount, 0);
    const grossTotal = newSalesAmount - newDiscountAmount;
    const netDue = netDueAfterDeposit(grossTotal, depositToUse);

    setSalesAmount(roundToCents(newSalesAmount));
    setDiscountAmount(roundToCents(newDiscountAmount));
    setTotal(roundToCents(grossTotal));
    // 받을 금액 = (합계 − 예수금) − 결제 − 정액권
    setAmountToReceive(roundToCents(netDue - positivePaymentAmount - negativePaymentAmount - prepaidToUse));
  };

  // 판매 항목 추가 함수
  const addSalesItem = (item: {
    id: number;
    name: string;
    price: number;
    type: 'service' | 'product' | 'prepaid';
    manager?: string;
    designerId?: number | null;
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
      designerId: item.designerId ?? null,
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

  // Comment: Sync shop from parent only when the modal opens — avoid overwriting user selection mid-flow.
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setSelectedShopId(normalizeShopId(shopId));
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, shopId]);

  useEffect(() => {
    if (!isOpen) {
      initializedForOpenRef.current = false;
      return;
    }
    if (initializedForOpenRef.current) return;
    initializedForOpenRef.current = true;

      // 서브 모달 상태 초기화 (공통)
      setIsDiscountModalOpen(false);
      setSelectedItemForDiscount(null);
      setEditingQuantityItemId(null);
      setIsPaymentInputModalOpen(false);
      setIsSalesClassificationModalOpen(false);
      setSelectedItemForClassification(null);
      setIsManagerPickerModalOpen(false);
      setSelectedItemForManager(null);
      setCashTendered(null);

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
        setSelectedShopId(initialData.shop_id ?? shopId ?? null);
        setPointAccumulation(initialData.point_accumulation || 0);
        const newSalesAmount = mappedItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        const newDiscountAmount = mappedItems.reduce((sum, item) => sum + item.discount, 0);
        const newPrepaidDeduction = mappedItems.reduce((sum, item) => sum + item.prepaidDeduction, 0);
        const gross = newSalesAmount - newDiscountAmount;

        // Fallback: legacy sales saved with payment_method but no per-method amount.
        // Treat them as fully paid via that method so edit view mirrors the original payment.
        const rawCash = initialData.cash_amount || 0;
        const rawCard = initialData.card_amount || 0;
        const rawBank = initialData.bank_transfer_amount || 0;
        const rawMethod = (initialData.payment_method || '').toLowerCase();
        const hasExplicitAmount = rawCash !== 0 || rawCard !== 0 || rawBank !== 0;
        const restoredAmounts = {
          cash: rawCash,
          card: rawCard,
          bank_transfer: rawBank,
        };
        // Infer deposit only when per-method amounts exist (card 44 + gross 55 → deposit 11).
        // Legacy rows with no amounts: fill one method below with no deposit implied.
        const depositFromBooking = Math.max(
          0,
          normalizeBookingDepositPaid(
            initialData.booking_deposit_paid ?? bookingDepositPaid,
          ),
        );
        setDepositCredit(depositFromBooking);
        const netDue = netDueAfterDeposit(gross, depositFromBooking);
        const netPayable = Math.max(0, netDue - newPrepaidDeduction);
        if (!hasExplicitAmount && netPayable > 0 && (rawMethod === 'cash' || rawMethod === 'card' || rawMethod === 'bank_transfer')) {
          restoredAmounts[rawMethod] = netPayable;
        }

        setPaymentAmounts(restoredAmounts);
        const tendered = Number(initialData.cash_tendered) || 0;
        setCashTendered(
          tendered > restoredAmounts.cash
            ? tendered
            : restoredAmounts.cash > 0
              ? restoredAmounts.cash
              : null,
        );
        setPrepaidDeductionAmount(newPrepaidDeduction);
        setSelectedDeduction(newPrepaidDeduction > 0 ? 'prepaid' : null);
        setPaymentMethod(null);
        setActiveTab('service');
        setSalesAmount(newSalesAmount);
        setDiscountAmount(newDiscountAmount);
        setTotal(gross);
        const totalPaid = restoredAmounts.cash + restoredAmounts.card + restoredAmounts.bank_transfer;
        setAmountToReceive(netDue - totalPaid - newPrepaidDeduction);
      } else if (customer) {
        const savedDraftResult = loadSalesDraftForCustomer(customer.id, bookingId);
        const savedDraft = savedDraftResult?.draft ?? null;

        if (savedDraft && savedDraft.salesItems.length > 0) {
          setDraftRestoredMessage('임시 저장된 판매 내용을 불러왔습니다.');
          setSalesItems(savedDraft.salesItems as SalesItem[]);
          setMemo(savedDraft.memo);
          setSalesDate(savedDraft.salesDate);
          setSalesTime(savedDraft.salesTime);
          setSelectedShopId(savedDraft.selectedShopId ?? shopId ?? null);
          setPaymentAmounts(savedDraft.paymentAmounts);
          setCashTendered(savedDraft.cashTendered);
          setPrepaidDeductionAmount(savedDraft.prepaidDeductionAmount);
          skipBookingDepositApplyRef.current = true;
          setDepositCredit(savedDraft.depositCredit);
          setActiveTab(savedDraft.activeTab);
          setSelectedDeduction(savedDraft.prepaidDeductionAmount > 0 ? 'prepaid' : null);
          setPaymentMethod(null);
          setPointAccumulation(0);
          recalculateAmounts(
            savedDraft.salesItems,
            savedDraft.paymentAmounts,
            savedDraft.prepaidDeductionAmount,
            savedDraft.depositCredit,
          );
        } else {
          setDraftRestoredMessage(null);
          setDepositCredit(normalizeBookingDepositPaid(bookingDepositPaid));
          setSalesItems([]);
          setSalesAmount(0);
          setDiscountAmount(0);
          setTotal(0);
          setAmountToReceive(0);
          setPointAccumulation(0);
          setSelectedDeduction(null);
          setPaymentMethod(null);
          setMemo('');
          setSalesDate(defaultSalesDate || getSydneyToday());
          setSalesTime(defaultSalesTime || getCurrentLocalTime());
          setPaymentAmounts({
            cash: 0,
            card: 0,
            bank_transfer: 0,
          });
          setCashTendered(null);
          setPrepaidDeductionAmount(0);
          setActiveTab('service');
        }
      }
  }, [isOpen, initialData, editSaleId, bookingDepositPaid, defaultSalesDate, defaultSalesTime, customer, bookingId, shopId]);

  // Keep booking deposit visible even if parent props flicker while the modal stays open.
  useEffect(() => {
    if (!isOpen || editSaleId) return;
    if (skipBookingDepositApplyRef.current) {
      skipBookingDepositApplyRef.current = false;
      return;
    }
    const fromBooking = normalizeBookingDepositPaid(bookingDepositPaid);
    if (fromBooking > 0) {
      setDepositCredit((prev) => (prev > 0 ? prev : fromBooking));
    }
  }, [isOpen, editSaleId, bookingDepositPaid]);

  useEffect(() => {
    if (!isOpen) setIsSaving(false);
  }, [isOpen]);

  // Re-apply cash tender when net due or other payments change (deposit line stays unchanged).
  useEffect(() => {
    if (!isOpen || cashTendered == null || cashTendered <= 0) return;
    const gross = salesAmount - discountAmount;
    const net = netDueAfterDeposit(gross, depositCredit);
    const { cashApplied } = splitCashTender(
      cashTendered,
      net,
      paymentAmounts,
      prepaidDeductionAmount,
    );
    if (cashApplied === paymentAmounts.cash) return;
    const newAmounts = normalizePaymentAmounts({
      ...paymentAmounts,
      cash: cashApplied,
    });
    setPaymentAmounts(newAmounts);
    recalculateAmounts(salesItems, newAmounts);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reconcile when inputs change, not when cash field updates
  }, [
    isOpen,
    cashTendered,
    salesAmount,
    discountAmount,
    depositCredit,
    prepaidDeductionAmount,
    paymentAmounts.card,
    paymentAmounts.bank_transfer,
    salesItems,
  ]);

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
  const grossTotal = salesAmount - discountAmount;
  const netDue = netDueAfterDeposit(grossTotal, depositCredit);
  const cashChangeDue =
    cashTendered != null && cashTendered > paymentAmounts.cash
      ? roundToCents(cashTendered - paymentAmounts.cash)
      : 0;
  const cashDueBeforeEntry = remainingDueBeforeCash(
    netDue,
    { card: paymentAmounts.card, bank_transfer: paymentAmounts.bank_transfer },
    prepaidDeductionAmount,
  );

  const handleAddItem = () => {
    onOpenItemPicker?.(activeTab);
  };

  const handleComplete = async () => {
    if (isSaving) return;
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

    // 받을 금액이 남아있으면 확인 알림 표시 (수정 모드는 기존 완료 건 — 미수 확인 생략)
    if (currentAmountToReceive > 0 && !editSaleId) {
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

  const performSaleRegistration = async (options?: {
    paymentAmountsOverride?: typeof paymentAmounts;
  }) => {
    if (!customer || salesItems.length === 0) {
      return;
    }

    const shopIdToSave = normalizeShopId(selectedShopId);
    if (!shopIdToSave) {
      alert('지점을 선택해 주세요.');
      return;
    }

    const totalPrepaidDeduction = salesItems.reduce(
      (sum, item) => sum + item.prepaidDeduction,
      0,
    );
    if (totalPrepaidDeduction > 0 && !(await ensurePrepaidBalanceCovers(totalPrepaidDeduction))) {
      showPrepaidBalanceError();
      return;
    }

    const isEditMode = !!editSaleId;
    const paymentAmountsToSave = normalizePaymentAmounts(
      options?.paymentAmountsOverride || paymentAmounts,
    );
    const paymentMethodToSave =
      resolvePaymentMethodFromAmounts(paymentAmountsToSave) ?? paymentMethod;

    setIsSaving(true);
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
          shop_id: shopIdToSave,
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
            designer_id: item.designerId ?? null,
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
          payment_method: paymentMethodToSave,
          payment_amounts: paymentAmountsToSave,
          point_accumulation: pointAccumulation,
          memo: memo,
          sales_date: salesDate,
          sales_time: salesTime,
          prepaid_customer_id:
            prepaidCustomerId && prepaidCustomerId !== customer.id
              ? prepaidCustomerId
              : undefined,
          paid_deposit: depositCredit,
          cash_tendered: cashTendered,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || (isEditMode ? '판매 수정에 실패했습니다.' : '판매 등록에 실패했습니다.'));
      }

      if (isEditMode && onEditComplete && editSaleId) {
        await onEditComplete(editSaleId);
        onClose();
        return;
      }

      if (!isEditMode && customer) {
        clearSalesDraft(getSalesDraftKey(customer.id, bookingId));
      }

      if (onComplete) {
        await onComplete();
      }
      onClose();
    } catch (error: any) {
      console.error(isEditMode ? '판매 수정 오류:' : '판매 등록 오류:', error);
      alert(error.message || '판매 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePaymentConfirm = (amount: number) => {
    if (!paymentMethod) return;
    const tendered = roundToCents(amount);

    let newAmounts = { ...paymentAmounts };

    if (paymentMethod === 'cash') {
      const { cashApplied } = splitCashTender(
        tendered,
        netDue,
        paymentAmounts,
        prepaidDeductionAmount,
      );
      setCashTendered(tendered);
      newAmounts = normalizePaymentAmounts({
        ...paymentAmounts,
        cash: cashApplied,
      });
    } else {
      const capped = capPaymentToRemaining(
        tendered,
        netDue,
        paymentAmounts,
        prepaidDeductionAmount,
        paymentMethod,
      );
      newAmounts = normalizePaymentAmounts({
        ...paymentAmounts,
        [paymentMethod]: capped,
      });
    }

    setPaymentAmounts(newAmounts);
    recalculateAmounts(salesItems, newAmounts);
    setIsPaymentInputModalOpen(false);
  };

  const paymentInputInitialAmount =
    paymentMethod === 'cash'
      ? cashTendered != null && cashTendered > 0
        ? cashTendered
        : cashDueBeforeEntry > 0
          ? cashDueBeforeEntry
          : amountToReceive
      : paymentMethod && paymentAmounts[paymentMethod] > 0
        ? paymentAmounts[paymentMethod]
        : amountToReceive;

  const paymentInputAmountDue =
    paymentMethod === 'cash' ? cashDueBeforeEntry : amountToReceive;

  const resetToNewRegistration = () => {
    setDraftRestoredMessage(null);
    setDraftSavedMessage(null);
    setDepositCredit(normalizeBookingDepositPaid(bookingDepositPaid));
    setSalesItems([]);
    setSalesAmount(0);
    setDiscountAmount(0);
    setTotal(0);
    setAmountToReceive(0);
    setPointAccumulation(0);
    setSelectedDeduction(null);
    setPaymentMethod(null);
    setMemo('');
    setSalesDate(defaultSalesDate || getSydneyToday());
    setSalesTime(defaultSalesTime || getCurrentLocalTime());
    setPaymentAmounts({ cash: 0, card: 0, bank_transfer: 0 });
    setCashTendered(null);
    setPrepaidDeductionAmount(0);
    setActiveTab('service');
    setSelectedShopId(normalizeShopId(shopId));
  };

  const handleClearDraft = () => {
    if (!customer || editSaleId || isSaving) return;
    setConfirmationAlertData({
      title: '판매 등록 삭제',
      message:
        '임시 저장된 판매 내용을 삭제하고 처음부터 다시 등록합니다. 예약 정보는 변경되지 않습니다. 계속하시겠습니까?',
      onConfirm: () => {
        clearSalesDraft(getSalesDraftKey(customer.id, bookingId));
        resetToNewRegistration();
        setIsConfirmationAlertOpen(false);
        setConfirmationAlertData(null);
        onRestartRegistration?.();
      },
    });
    setIsConfirmationAlertOpen(true);
  };

  const handleSaveDraft = () => {
    if (!customer || editSaleId) return;
    const draftKey = getSalesDraftKey(customer.id, bookingId);
    const draftPayload = {
      salesItems: salesItems as SalesRegistrationDraft['salesItems'],
      memo,
      salesDate,
      salesTime,
      selectedShopId,
      paymentAmounts,
      prepaidDeductionAmount,
      depositCredit,
      cashTendered,
      activeTab,
      savedAt: new Date().toISOString(),
    };
    const saved = saveSalesDraft(draftKey, draftPayload);
    if (!saved) {
      alert('임시 저장에 실패했습니다. 브라우저 저장 공간을 확인해 주세요.');
      return;
    }
    if (bookingId) {
      saveSalesDraft(getSalesDraftFallbackKey(customer.id), draftPayload);
    }
    setDraftSavedMessage('임시 저장되었습니다.');
    setTimeout(() => setDraftSavedMessage(null), 2500);
  };

  const handleCancel = () => {
    if (isSaving) return;
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (isSaving) return;
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
      <div className="bg-gray-100 -mx-5.5 -mt-5.5 px-5.5 py-3 mb-5.5 border-b border-gray-200 space-y-2">
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-gray-900">{customer.name}</p>
          <span className="text-xs text-gray-400">({customer.id})</span>
          {customer.phone && (
            <p className="text-xs text-gray-500">{customer.phone}</p>
          )}
        </div>
        {draftRestoredMessage && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-blue-600">{draftRestoredMessage}</p>
            {!editSaleId && (
              <button
                type="button"
                onClick={handleClearDraft}
                disabled={isSaving}
                className="text-xs text-red-600 hover:text-red-800 underline disabled:opacity-50"
              >
                판매 등록 삭제
              </button>
            )}
          </div>
        )}
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
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">정액권 차감</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">담당자</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">영업 구분</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {salesItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-7.5 text-center text-sm text-gray-500">
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
                                      const newAmount = roundToCents((i.unitPrice * newQuantity) - i.discount);
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
                                      const newAmount = roundToCents((i.unitPrice * newQuantity) - i.discount);
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
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {item.type === 'prepaid' ? (
                            <span className="text-gray-400">-</span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void toggleItemPrepaidDeduction(item);
                              }}
                              className={`min-w-[4.5rem] text-left px-1 py-0.5 rounded transition-colors ${
                                item.prepaidDeduction > 0
                                  ? 'text-emerald-700 font-medium hover:bg-emerald-50'
                                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              {item.prepaidDeduction > 0
                                ? formatAudAmount(item.prepaidDeduction)
                                : '-'}
                            </button>
                          )}
                        </td>
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
              ※ 각 항목 셀을 클릭해 수정할 수 있습니다. 서비스·제품의 「정액권 차감」을 클릭하면 해당 금액만큼 정액권으로 결제 처리됩니다.
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
                        <span className="font-medium text-gray-900">
                          {formatAudAmount(
                            cashTendered != null && cashTendered > 0
                              ? cashTendered
                              : paymentAmounts.cash,
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCashTendered(null);
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
                  {cashChangeDue > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-amber-800">거스름돈</span>
                      <span className="font-medium text-amber-900">
                        {formatAudAmount(cashChangeDue)}
                      </span>
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
                  placeholder="지점 선택"
                  options={shops.map((s: any) => ({
                    value: String(s.id),
                    label: s.name,
                  }))}
                  value={selectedShopId != null ? String(selectedShopId) : ''}
                  onChange={(e) => setSelectedShopId(normalizeShopId(e.target.value))}
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
                {draftSavedMessage && (
                  <p className="text-xs text-emerald-600 text-center">{draftSavedMessage}</p>
                )}
                <Button
                  className="w-full"
                  onClick={handleComplete}
                  disabled={isSaving}
                  loading={isSaving}
                >
                  {editSaleId ? (isSaving ? '저장 중...' : '수정 완료') : isSaving ? '처리 중...' : '계산 완료'}
                </Button>
                {!editSaleId && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleSaveDraft}
                    disabled={isSaving || salesItems.length === 0}
                  >
                    임시 저장
                  </Button>
                )}
                <Button variant="ghost" className="w-full" onClick={handleCancel} disabled={isSaving}>
                  취소
                </Button>
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
              const newAmount = roundToCents((item.unitPrice * item.quantity) - update.discount);
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
        initialAmount={paymentInputInitialAmount}
        amountDue={paymentInputAmountDue}
        onClose={() => setIsPaymentInputModalOpen(false)}
        onConfirm={handlePaymentConfirm}
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
        onConfirm={(selection) => {
          if (selectedItemForManager) {
            const updatedItems = salesItems.map((item) => {
              if (item.id === selectedItemForManager.id) {
                return {
                  ...item,
                  manager: selection.manager,
                  designerId: selection.designerId,
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
        customerId={prepaidCustomerId ?? customer?.id ?? null}
        saleCustomerId={customer?.id ?? null}
        saleCustomerName={customer?.name ?? null}
        onPrepaidCustomerChange={(owner) => {
          setPrepaidCustomerId(owner.id);
          setPrepaidCustomerName(owner.name);
          void refreshAvailablePrepaidBalance(owner.id);
        }}
        initialAmount={amountToReceive}
        selectedItemId={null}
        onBalanceLoaded={(balance) => setAvailablePrepaidBalance(balance)}
        onClose={() => {
          setIsGlobalPrepaidDeductionModalOpen(false);
        }}
        onComplete={async (amount) => {
          if (!customer) return;

          if (!(await ensurePrepaidBalanceCovers(amount))) {
            showPrepaidBalanceError();
            return;
          }

          const updatedItems = applyTotalPrepaidDeduction(salesItems, amount);
          updatePrepaidDeductionState(updatedItems);
          setSelectedDeduction('prepaid');
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
