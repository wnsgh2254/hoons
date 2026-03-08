// z-index layers for modal stacking
// Modals are layered in the order they are opened on top of each other.
// Base modals (calendar, history) use the lowest value;
// nested sub-modals (pickers, payment input) use higher values;
// alerts and confirmations always sit on top.
export const Z = {
  MODAL_BASE: 'z-[100000]',       // HolidayCalendarModal, ReservationHistoryModal
  MODAL_PRIMARY: 'z-[100001]',    // CancelBookingModal, EditBookingModal, AttendanceModal
  MODAL_PICKER: 'z-[100002]',     // ServicePickerModal
  MODAL_DRAWER: 'z-[100003]',     // CustomerInfoDrawer
  MODAL_SALES: 'z-[100004]',      // SalesRegistrationModal
  MODAL_SALES_SUB: 'z-[100005]',  // SalesItemPickerModal, PaymentInputModal
  MODAL_DISCOUNT: 'z-[100006]',   // DiscountModal
  MODAL_CLASSIFY: 'z-[100007]',   // SalesClassificationModal
  MODAL_NESTED: 'z-[100008]',     // ManagerPickerModal, PrepaidDeductionModal
  MODAL_ALERT: 'z-[100009]',      // ConfirmationAlertModal, ErrorAlertModal
  MODAL_EDIT_PP: 'z-[100010]',    // EditPrepaidMemberModal
  MODAL_ADD_CUST: 'z-[100011]',   // AddCustomerModal
  MODAL_DETAIL: 'z-[100012]',     // SalesDetailModal
  MODAL_ALERT_TOP: 'z-[100013]',  // AlertModal on top of SalesDetailModal
} as const;
