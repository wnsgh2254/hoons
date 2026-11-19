'use client';

import { createContext, useContext } from 'react';

export const defaultAppointmentRequest: typeof fetch = (...args) => fetch(...args);
export const AppointmentRequestContext = createContext(defaultAppointmentRequest);

export function useAppointmentRequest() {
  return useContext(AppointmentRequestContext);
}
