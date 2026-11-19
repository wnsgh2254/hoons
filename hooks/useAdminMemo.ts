'use client';

import { useAppointmentRequest } from '@/lib/appointment-request';
import { useState, useEffect, useRef, useCallback } from 'react';

interface UseAdminMemoOptions {
  initialMemo?: string;
  skipInitialFetchOnce?: boolean;
}

export function useAdminMemo(options: UseAdminMemoOptions = {}) {
  const request = useAppointmentRequest();
  const { initialMemo = '', skipInitialFetchOnce = false } = options;
  const [memo, setMemo] = useState(initialMemo);
  const [memoLoading, setMemoLoading] = useState(false);
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoSuccessMessage, setMemoSuccessMessage] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, [skipInitialFetchOnce]);

  // Load memo on mount
  useEffect(() => {
    if (skipInitialFetchOnce) return;
    const fetchMemo = async () => {
      setMemoLoading(true);
      try {
        const res = await request('/api/admin-memo');
        const data = await res.json();
        if (mountedRef.current) {
          if (res.ok) {
            setMemo(data.content || '');
          } else {
            setMemo('');
          }
        }
      } catch (err) {
        if (mountedRef.current) {
          setMemo('');
        }
      } finally {
        if (mountedRef.current) {
          setMemoLoading(false);
        }
      }
    };

    fetchMemo();
  }, []);

  const saveMemo = useCallback(async () => {
    setMemoSaving(true);
    try {
      const res = await request('/api/admin-memo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: memo }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save memo');
      }
      setMemoSuccessMessage('전달사항이 저장되었습니다.');
      setTimeout(() => {
        if (mountedRef.current) {
          setMemoSuccessMessage(null);
        }
      }, 3000);
    } catch (err) {
      console.error('Error saving memo:', err);
      alert('전달사항 저장에 실패했습니다.');
    } finally {
      if (mountedRef.current) {
        setMemoSaving(false);
      }
    }
  }, [memo, request]);

  return {
    memo,
    setMemo,
    memoLoading,
    memoSaving,
    setMemoSaving,
    memoSuccessMessage,
    setMemoSuccessMessage,
    saveMemo,
  };
}
