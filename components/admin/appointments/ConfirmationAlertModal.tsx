'use client';

import AlertModal from '@/components/ui/AlertModal';

interface ConfirmationAlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  highlightText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmationAlertModal({
  isOpen,
  title,
  message,
  highlightText,
  onConfirm,
  onCancel,
}: ConfirmationAlertModalProps) {
  return (
    <AlertModal
      isOpen={isOpen}
      title={title}
      message={message}
      highlightText={highlightText}
      variant="confirm"
      onConfirm={onConfirm}
      onClose={onCancel}
    />
  );
}
