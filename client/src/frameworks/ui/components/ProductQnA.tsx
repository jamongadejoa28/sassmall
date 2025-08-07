// ProductQnA.tsx - 상품 문의 컴포넌트
// Clean Architecture: UI Components Layer
// 위치: client/src/frameworks/ui/components/ProductQnA.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '../../state/authStore';
import { TokenExpirationHandler } from '../../../shared/utils/tokenExpiration';
import { ProductQnAApiAdapter } from '../../../adapters/api/ProductQnAApiAdapter';
import { AdminApiAdapter } from '../../../adapters/api/AdminApiAdapter';
import toast from 'react-hot-toast';

// ========================================
// Types & Interfaces
// ========================================

interface QnAItem {
  id: string;
  userName: string;
  question: string;
  answer?: string;
  isAnswered: boolean;
  answeredBy?: string;
  answeredAt?: string;
  isPublic: boolean;
  createdAt: string;
}

interface ProductQnAProps {
  productId: string;
}

// ========================================
// ProductQnA Component
// ========================================

const ProductQnA: React.FC<ProductQnAProps> = ({ productId }) => {
  const [qnaList, setQnaList] = useState<QnAItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [showQuestionForm, setShowQuestionForm] = useState<boolean>(false);

  // Auth store
  const { isAuthenticated, accessToken, user } = useAuthStore();

  // 관리자 권한 확인
  const isAdmin = user?.role === 'admin';

  // Create a single API adapter instance to avoid multiple initializations
  const apiAdapter = useMemo(() => new ProductQnAApiAdapter(), []);
  const adminApiAdapter = useMemo(() => new AdminApiAdapter(), []);

  // 답변 모달 관련 상태
  const [answerModal, setAnswerModal] = useState<{
    qnaId: string;
    question: string;
    userName: string;
  } | null>(null);
  const [answerText, setAnswerText] = useState<string>('');
  const [submittingAnswer, setSubmittingAnswer] = useState<boolean>(false);

  // 질문 작성 폼 상태
  const [questionForm, setQuestionForm] = useState({
    userName: user?.name || '',
    question: '',
    isPublic: true,
  });

  // ========================================
  // API Functions
  // ========================================

  // 답변 제출 함수
  const handleAnswerSubmit = async () => {
    if (!answerModal || !answerText.trim()) {
      toast.error('답변 내용을 입력해주세요.');
      return;
    }

    try {
      setSubmittingAnswer(true);
      await adminApiAdapter.answerProductQnA(
        answerModal.qnaId,
        answerText.trim(),
        user?.name || '관리자' // 현재 로그인한 사용자 이름 또는 기본값
      );
      toast.success('답변이 성공적으로 등록되었습니다.');
      setAnswerModal(null);
      setAnswerText('');
      fetchQnA(currentPage, sortBy); // 목록 새로고침
    } catch (error: any) {
      toast.error(error.message || '답변 등록에 실패했습니다.');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const fetchQnA = useCallback(
    async (page: number = 1, sort: string = 'newest') => {
      setLoading(true);
      setError(null);

      try {
        const data = await apiAdapter.getProductQnA(productId, {
          page,
          limit: 10,
          sortBy: sort as 'newest' | 'oldest',
        });

        setQnaList(data.qnas || []);
        setCurrentPage(data.pagination?.currentPage || 1);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalItems(data.pagination?.totalCount || 0);
      } catch (err: any) {
        const errorMessage =
          err.message || '문의를 불러오는 중 오류가 발생했습니다.';
        setError(errorMessage);
        if (err.response?.status) {
          console.error(`Q&A fetch failed: ${err.response.status}`);
        }
      } finally {
        setLoading(false);
      }
    },
    [productId, apiAdapter]
  );

  useEffect(() => {
    fetchQnA(currentPage, sortBy);
  }, [fetchQnA, currentPage, sortBy]);

  // Update form username when user data is available
  useEffect(() => {
    if (user?.name && !questionForm.userName) {
      setQuestionForm(prev => ({
        ...prev,
        userName: user.name,
      }));
    }
  }, [user?.name, questionForm.userName]);

  // ========================================
  // Event Handlers
  // ========================================

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const checkLoginStatus = (): boolean => {
    const basicAuth = isAuthenticated && !!accessToken && !!user;
    const tokenValid = accessToken
      ? !TokenExpirationHandler.isTokenExpired(accessToken)
      : false;

    return basicAuth && tokenValid;
  };

  const handleQuestionButtonClick = () => {
    if (!checkLoginStatus()) {
      const hasBasicAuth = isAuthenticated && !!accessToken && !!user;
      const isTokenExpired = accessToken
        ? TokenExpirationHandler.isTokenExpired(accessToken)
        : false;

      if (hasBasicAuth && isTokenExpired) {
        alert('로그인이 만료되었습니다.\n다시 로그인해주세요.');
      } else {
        alert('로그인이 필요한 서비스입니다.\n로그인 후 이용해주세요.');
      }
      return;
    }
    setShowQuestionForm(!showQuestionForm);
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionForm.userName.trim() || !questionForm.question.trim()) {
      alert('이름과 질문 내용을 모두 입력해주세요.');
      return;
    }

    // Check authentication before submitting
    if (!checkLoginStatus()) {
      alert('로그인이 필요한 서비스입니다.\n다시 로그인해주세요.');
      return;
    }

    try {
      await apiAdapter.createProductQnA({
        productId: productId,
        question: questionForm.question,
        isPublic: questionForm.isPublic,
        userName: questionForm.userName,
      });

      alert('문의가 성공적으로 등록되었습니다.');
      setQuestionForm({
        userName: user?.name || '',
        question: '',
        isPublic: true,
      });
      setShowQuestionForm(false);
      fetchQnA(1, sortBy); // 첫 페이지로 새로고침
    } catch (err: any) {
      if (err.response?.status) {
        console.error(`Q&A creation failed: ${err.response.status}`);
      }
      const errorMessage = err.message || '문의 등록 중 오류가 발생했습니다.';

      // Handle specific error cases
      if (errorMessage.includes('401') || errorMessage.includes('인증')) {
        alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
        // Optionally redirect to login or refresh token
      } else {
        alert(errorMessage);
      }
    }
  };

  // ========================================
  // Render Helpers
  // ========================================

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // ========================================
  // Render
  // ========================================

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => fetchQnA(currentPage, sortBy)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Q&A 헤더 */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            상품 문의 ({totalItems}개)
          </h3>
          <button
            onClick={handleQuestionButtonClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            질문하기
          </button>
        </div>

        <p className="text-sm text-gray-600">
          상품에 대해 궁금한 점이 있으시면 언제든지 문의해주세요.
        </p>
      </div>

      {/* 질문 작성 폼 */}
      {showQuestionForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">질문 작성</h4>
          <form onSubmit={handleQuestionSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이름
              </label>
              <input
                type="text"
                value={questionForm.userName}
                onChange={e =>
                  setQuestionForm({ ...questionForm, userName: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="이름을 입력해주세요"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                질문 내용
              </label>
              <textarea
                value={questionForm.question}
                onChange={e =>
                  setQuestionForm({ ...questionForm, question: e.target.value })
                }
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="궁금한 점을 자세히 적어주세요"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                id="isPublic"
                type="checkbox"
                checked={questionForm.isPublic}
                onChange={e =>
                  setQuestionForm({
                    ...questionForm,
                    isPublic: e.target.checked,
                  })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
                공개 질문으로 등록 (다른 고객들도 볼 수 있습니다)
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                질문 등록
              </button>
              <button
                type="button"
                onClick={() => setShowQuestionForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 정렬 옵션 */}
      <div className="flex justify-between items-center">
        <h4 className="text-md font-medium text-gray-900">문의 목록</h4>
        <select
          value={sortBy}
          onChange={e => handleSortChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="newest">최신순</option>
          <option value="oldest">오래된순</option>
          <option value="answered">답변완료순</option>
          <option value="unanswered">미답변순</option>
        </select>
      </div>

      {/* Q&A 목록 */}
      {(qnaList || []).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">아직 등록된 문의가 없습니다.</p>
          <p className="text-sm text-gray-400 mt-2">
            궁금한 점이 있으시면 언제든지 문의해주세요!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {(qnaList || []).map(qna => (
            <div key={qna.id} className="border border-gray-200 rounded-lg p-6">
              {/* 질문 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-3">
                      Q
                    </span>
                    <span className="font-medium text-gray-900">
                      {qna.userName}
                    </span>
                    {!qna.isPublic && (
                      <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        비공개
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(qna.createdAt)}
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed pl-8">
                  {qna.question}
                </p>
              </div>

              {/* 답변 */}
              {qna.answer ? (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-3">
                        A
                      </span>
                      <span className="font-medium text-gray-900">
                        {qna.answeredBy || '관리자'}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {qna.answeredAt ? formatDate(qna.answeredAt) : ''}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed pl-8">
                    {qna.answer}
                  </p>
                </div>
              ) : (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between pl-8">
                    <span className="text-sm text-gray-500">
                      답변 대기 중입니다.
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() =>
                          setAnswerModal({
                            qnaId: qna.id,
                            question: qna.question,
                            userName: qna.userName,
                          })
                        }
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        답변하기
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            이전
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const startPage = Math.max(1, currentPage - 2);
            const pageNumber = startPage + i;

            if (pageNumber > totalPages) return null;

            return (
              <button
                key={pageNumber}
                onClick={() => handlePageChange(pageNumber)}
                className={`px-3 py-2 border rounded-lg ${
                  currentPage === pageNumber
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {pageNumber}
              </button>
            );
          })}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            다음
          </button>
        </div>
      )}

      {/* 답변 모달 */}
      {answerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">답변 작성</h3>
              <button
                onClick={() => {
                  setAnswerModal(null);
                  setAnswerText('');
                }}
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

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">
                {answerModal.userName}님의 질문
              </h4>
              <p className="text-gray-700">{answerModal.question}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                답변 내용
              </label>
              <textarea
                value={answerText}
                onChange={e => setAnswerText(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="고객의 궁금증을 해결할 수 있는 친절하고 정확한 답변을 작성해주세요."
                disabled={submittingAnswer}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setAnswerModal(null);
                  setAnswerText('');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={submittingAnswer}
              >
                취소
              </button>
              <button
                onClick={handleAnswerSubmit}
                disabled={submittingAnswer || !answerText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingAnswer ? '답변 등록 중...' : '답변 등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductQnA;
