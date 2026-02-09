'use client';

interface AdminMemoProps {
  memo: string;
  memoLoading: boolean;
  memoSaving: boolean;
  onMemoChange: (value: string) => void;
  onSave: () => void;
}

export default function AdminMemo({
  memo,
  memoLoading,
  memoSaving,
  onMemoChange,
  onSave,
}: AdminMemoProps) {
  return (
    <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden min-h-0">
      <div className="p-5 border-b border-gray-100 shrink-0 flex items-center justify-between">
        <h3 className="font-bold text-black">전달사항 (Memo)</h3>
        <button
          type="button"
          onClick={onSave}
          disabled={memoSaving || memoLoading}
          className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {memoSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>저장 중...</span>
            </>
          ) : (
            '저장하기'
          )}
        </button>
      </div>
      <div className="flex-1 p-5 min-h-0 flex flex-col">
        {memoLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <textarea
            value={memo}
            onChange={(e) => onMemoChange(e.target.value)}
            placeholder="전달사항을 입력하세요..."
            className="w-full h-full p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-300 text-sm"
          />
        )}
      </div>
    </div>
  );
}
