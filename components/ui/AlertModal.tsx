'use client';

import { useEffect, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Z } from '@/lib/constants';

interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  /** Text to highlight in red within the message */
  highlightText?: string;
  /** "confirm" shows 예/아니오 buttons, "error" shows 닫기 only */
  variant?: 'confirm' | 'error';
  /** May be async; the buttons stay locked until it settles. */
  onConfirm?: () => void | Promise<void>;
  onClose: () => void;
  /** Override default z-index (Z.MODAL_ALERT) */
  zIndex?: string;
}

export default function AlertModal({
  isOpen,
  title,
  message,
  highlightText,
  variant = 'error',
  onConfirm,
  onClose,
  zIndex,
}: AlertModalProps) {
  const renderMessage = () => {
    if (!highlightText) {
      return <p className="text-sm text-gray-900">{message}</p>;
    }
    const parts = message.split(highlightText);
    return (
      <p className="text-sm text-gray-900">
        {parts[0]}
        <span className="text-red-600 font-semibold">{highlightText}</span>
        {parts[1]}
      </p>
    );
  };

  const [pending, setPending] = useState(false);
  const lockRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleConfirm = async () => {
    if (lockRef.current) return;
    lockRef.current = true;
    setPending(true);
    try {
      await onConfirm?.();
    } finally {
      lockRef.current = false;
      if (mountedRef.current) setPending(false);
    }
  };

  const handleClose = () => {
    if (lockRef.current) return;
    onClose();
  };

  const footer =
    variant === 'confirm' ? (
      <>
        <Button variant="primary" size="lg" className="flex-1" loading={pending} onClick={handleConfirm}>
          예
        </Button>
        <Button variant="secondary" size="lg" className="flex-1" disabled={pending} onClick={handleClose}>
          아니오
        </Button>
      </>
    ) : (
      <Button variant="primary" size="lg" className="ml-auto" onClick={onClose}>
        닫기
      </Button>
    );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      zIndex={zIndex || Z.MODAL_ALERT}
      footer={footer}
    >
      <div className="bg-gray-50 rounded-lg p-4">
        {renderMessage()}
      </div>
    </Modal>
  );
}
