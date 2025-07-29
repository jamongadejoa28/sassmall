// ConfirmDialog.tsx - 재사용 가능한 확인 다이얼로그 컴포넌트
// Clean Architecture: UI Components Layer
// 위치: client/src/frameworks/ui/components/ConfirmDialog.tsx

import React from 'react';

// ========================================
// Types & Interfaces
// ========================================

interface ConfirmDialogProps {
  title?: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// ========================================
// ConfirmDialog Component
// ========================================

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title = '확인',
  message,
  confirmText = '확인',
  cancelText = '취소',
  confirmButtonClass = 'bg-red-600 hover:bg-red-700 text-white',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        onClick={onCancel}
      >
        {/* 다이얼로그 */}
        <div
          className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
          onClick={e => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 메시지 */}
          <div className="mb-6">
            {typeof message === 'string' ? (
              <p className="text-gray-700 leading-relaxed">{message}</p>
            ) : (
              <div className="text-gray-700 leading-relaxed">{message}</div>
            )}
          </div>

          {/* 버튼들 */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmButtonClass}`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  처리 중...
                </div>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export { ConfirmDialog };
export default ConfirmDialog;
