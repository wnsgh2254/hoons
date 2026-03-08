import { NextResponse } from 'next/server';

/**
 * Standardized API error response handler.
 * Usage: return handleApiError(error, 'customers POST', '고객을 등록하지 못했습니다.');
 */
export function handleApiError(
  error: any,
  context: string,
  userMessage: string,
  status = 500
) {
  console.error(`Error in ${context}:`, error);
  return NextResponse.json(
    { error: error?.message || userMessage },
    { status }
  );
}
