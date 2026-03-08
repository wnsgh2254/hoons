'use client';

import AlertModal from '@/components/ui/AlertModal';

interface ErrorAlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export default function ErrorAlertModal({
  isOpen,
  title,
  message,
  onClose,
}: ErrorAlertModalProps) {
  return (
    <AlertModal
      isOpen={isOpen}
      title={title}
      message={message}
      variant="error"
      onClose={onClose}
    />
  );
}
