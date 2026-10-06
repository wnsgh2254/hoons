'use client';

const btnBase =
  'px-4 py-3 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors font-medium h-12 flex items-center justify-center';

interface NumericKeypadProps {
  onNumberClick: (num: string) => void;
  onBackspace: () => void;
  allowDecimal?: boolean;
  className?: string;
  // Comment: when provided, replaces the 00/000/0000 digit-padding shortcuts with fixed
  // preset-amount buttons (e.g. quick $10/$20/$30 discount buttons) — exactly 3 values,
  // filling the same 3 slots (top two + bottom-left).
  quickAmounts?: [number, number, number];
  onQuickAmount?: (amount: number) => void;
}

export default function NumericKeypad({
  onNumberClick,
  onBackspace,
  allowDecimal = false,
  className,
  quickAmounts,
  onQuickAmount,
}: NumericKeypadProps) {
  return (
    <div className={className}>
      <div className="grid grid-cols-4 gap-2">
        <div className="col-span-3 grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => onNumberClick(num.toString())}
              className={btnBase}
            >
              {num}
            </button>
          ))}
        </div>
        <div className="col-span-1 flex flex-col gap-2">
          {quickAmounts ? (
            <>
              <button
                type="button"
                onClick={() => onQuickAmount?.(quickAmounts[0])}
                className={btnBase}
              >
                {quickAmounts[0]}
              </button>
              <button
                type="button"
                onClick={() => onQuickAmount?.(quickAmounts[1])}
                className={btnBase}
              >
                {quickAmounts[1]}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onNumberClick('000')}
                className={btnBase}
              >
                000
              </button>
              <button
                type="button"
                onClick={() => onNumberClick('0000')}
                className={btnBase}
              >
                0000
              </button>
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-2">
        <div className="col-span-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onNumberClick('0')}
            className={btnBase}
          >
            0
          </button>
          {quickAmounts ? (
            <button
              type="button"
              onClick={() => onQuickAmount?.(quickAmounts[2])}
              className={btnBase}
            >
              {quickAmounts[2]}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNumberClick('00')}
              className={btnBase}
            >
              00
            </button>
          )}
          <button
            type="button"
            onClick={onBackspace}
            className="px-4 py-3 text-sm border border-gray-200 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors font-medium h-12 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-xl">backspace</span>
          </button>
        </div>
        <div className="col-span-1">
          {allowDecimal && (
            <button
              type="button"
              onClick={() => onNumberClick('.')}
              className={btnBase}
            >
              .
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
