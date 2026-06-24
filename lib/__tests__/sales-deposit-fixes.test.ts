import { describe, expect, it } from 'vitest';
import { capPaidDepositToService } from '@/lib/sale-paid-deposit';
import { applySaleToPaymentDetails, emptyPaymentDetails } from '@/lib/sales-payment-details';
import { matchesReservationStatusFilter } from '@/lib/reservation-history-status';

describe('capPaidDepositToService', () => {
  it('returns full deposit when service gross is zero', () => {
    expect(capPaidDepositToService(50, 0)).toBe(50);
  });

  it('caps deposit to service gross when both are positive', () => {
    expect(capPaidDepositToService(50, 40)).toBe(40);
  });
});

describe('applySaleToPaymentDetails deposit credit', () => {
  it('records deposit-only service payment when gross service is positive', () => {
    const paymentDetails = emptyPaymentDetails();
    applySaleToPaymentDetails(paymentDetails, {
      paid_deposit: 55,
      cash_amount: 0,
      card_amount: 0,
      bank_transfer_amount: 0,
      sales_items: [{ item_type: 'service', amount: 55 }],
    });

    expect(paymentDetails.deposit.service).toBe(55);
    expect(paymentDetails.deposit.total).toBe(55);
  });
});

describe('matchesReservationStatusFilter', () => {
  it('maps confirmed status to BOOKED filter', () => {
    expect(matchesReservationStatusFilter('confirmed', 'BOOKED')).toBe(true);
    expect(matchesReservationStatusFilter('confirmed', 'NOSHOW')).toBe(false);
  });

  it('maps cancelled status to CANCELLED filter', () => {
    expect(matchesReservationStatusFilter('cancelled', 'CANCELLED')).toBe(true);
  });

  it('maps no_show status to NOSHOW filter', () => {
    expect(matchesReservationStatusFilter('no_show', 'NOSHOW')).toBe(true);
  });
});
