'use client';

import React from 'react';

interface SettlementToggleProps {
  isSettled: boolean;
  onToggle: (newValue: boolean) => void;
}

export default function SettlementToggle({ isSettled, onToggle }: SettlementToggleProps) {
  return (
    <label className="flex items-center justify-center cursor-pointer">
      <input
        type="checkbox"
        checked={isSettled}
        onChange={(e) => onToggle(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
      />
    </label>
  );
}
