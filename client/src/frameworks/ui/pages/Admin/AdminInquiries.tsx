// ========================================
// Admin Inquiries - 문의 관리 페이지
// Clean Architecture: Framework Layer
// src/frameworks/ui/pages/Admin/AdminInquiries.tsx
// ========================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminApiAdapter } from '../../../../adapters/api/AdminApiAdapter';
import toast from 'react-hot-toast';

interface QnAData {
  qnas: Array<{
    id: string;
    productId: string;
    productName?: string;
    userName: string;
    question: string;
    answer?: string;
    isAnswered: boolean;
    answeredBy?: string;
    answeredAt?: Date;
    isPublic: boolean;
    responseTimeHours?: number;
    isUrgent: boolean;
    hasQualityAnswer: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  statistics: {
    totalQuestions: number;
    answeredQuestions: number;
    unansweredQuestions: number;
    averageResponseTimeHours: number;
  };
}

const AdminInquiries: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [qnaData, setQnaData] = useState<QnAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [answerModal, setAnswerModal] = useState<{
    qnaId: string;
    question: string;
  } | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  const adminApiAdapter = useMemo(() => new AdminApiAdapter(), []);

  const loadQnAs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const options = {
        page: currentPage,
        limit: 20,
        status: (statusFilter === 'urgent' ? 'all' : statusFilter) as
          | 'all'
          | 'answered'
          | 'unanswered',
        search: searchQuery || undefined,
      };

      const data = await adminApiAdapter.getProductQnAList(options);
      setQnaData(data);
    } catch (error: any) {
      console.error('Q&A loading error:', error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, searchQuery, adminApiAdapter]);

  // Q&A 목록 로드
  useEffect(() => {
    loadQnAs();
  }, [loadQnAs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // 검색 시 첫 페이지로 이동
    loadQnAs();
  };

  const handleAnswerSubmit = async () => {
    if (!answerModal || !answerText.trim()) {
      toast.error('답변 내용을 입력해주세요.');
      return;
    }

    try {
      setSubmittingAnswer(true);
      await adminApiAdapter.answerProductQnA(
        answerModal.qnaId,
        answerText.trim()
      );
      toast.success('답변이 성공적으로 등록되었습니다.');
      setAnswerModal(null);
      setAnswerText('');
      loadQnAs(); // 목록 새로고침
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const getStatusCounts = () => {
    if (!qnaData) return { all: 0, answered: 0, unanswered: 0, urgent: 0 };

    return {
      all: qnaData.statistics.totalQuestions,
      answered: qnaData.statistics.answeredQuestions,
      unanswered: qnaData.statistics.unansweredQuestions,
      urgent: qnaData.qnas.filter(qna => qna.isUrgent).length,
    };
  };

  const statusCounts = getStatusCounts();

  const inquiryTypes = [
    {
      value: 'all',
      label: '전체 문의',
      count: loading ? '...' : statusCounts.all,
      icon: '💬',
    },
    {
      value: 'answered',
      label: '답변 완료',
      count: loading ? '...' : statusCounts.answered,
      icon: '✅',
    },
    {
      value: 'unanswered',
      label: '미답변',
      count: loading ? '...' : statusCounts.unanswered,
      icon: '❓',
    },
    {
      value: 'urgent',
      label: '긴급 문의',
      count: loading ? '...' : statusCounts.urgent,
      icon: '🚨',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">문의 관리</h1>
          <p className="text-gray-600 mt-1">고객 문의 및 지원 요청 관리</p>
        </div>

        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            내보내기
          </button>
          <button
            onClick={() => loadQnAs()}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <svg
              className="w-4 h-4 inline mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            새로고침
          </button>
        </div>
      </div>

      {/* 문의 상태별 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {inquiryTypes.map(type => (
          <button
            key={type.value}
            onClick={() => setStatusFilter(type.value)}
            className={`bg-white p-4 rounded-lg border border-gray-200 text-center hover:shadow-md transition-shadow ${
              statusFilter === type.value ? 'ring-2 ring-purple-500' : ''
            }`}
          >
            <div className="text-2xl mb-2">{type.icon}</div>
            <p className="text-xl font-bold text-gray-900">{type.count}</p>
            <p className="text-xs text-gray-600 mt-1">{type.label}</p>
          </button>
        ))}
      </div>

      {/* 우선순위별 문의 현황 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">긴급 문의</p>
              <p className="text-2xl font-bold text-red-600">
                {loading ? '...' : statusCounts.urgent}
              </p>
              <p className="text-xs text-gray-500 mt-1">즉시 처리 필요</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">미답변 문의</p>
              <p className="text-2xl font-bold text-orange-600">
                {loading ? '...' : statusCounts.unanswered}
              </p>
              <p className="text-xs text-gray-500 mt-1">24시간 이내 답변</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">완료된 문의</p>
              <p className="text-2xl font-bold text-green-600">
                {loading ? '...' : statusCounts.answered}
              </p>
              <p className="text-xs text-gray-500 mt-1">이번 달 처리</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between space-x-4">
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by customer name, subject..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <svg
                className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </form>

          <div className="flex items-center space-x-3">
            <select className="border border-gray-300 rounded-lg px-3 py-2">
              <option>All Status</option>
              <option>New</option>
              <option>In Progress</option>
              <option>Resolved</option>
              <option>Closed</option>
            </select>

            <select className="border border-gray-300 rounded-lg px-3 py-2">
              <option>All Priority</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>

            <select className="border border-gray-300 rounded-lg px-3 py-2">
              <option>Latest</option>
              <option>Oldest</option>
              <option>Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* 문의 목록 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">문의 목록</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                평균 응답 시간:{' '}
                {loading
                  ? '--'
                  : `${qnaData?.statistics.averageResponseTimeHours.toFixed(1) || 0}시간`}
              </span>
            </div>
          </div>
        </div>

        {/* 에러 상태 */}
        {error && (
          <div className="px-6 py-4 bg-red-50 border-b border-red-200">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-red-400 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-red-800">
                데이터 로드 중 오류가 발생했습니다: {error}
              </p>
              <button
                onClick={loadQnAs}
                className="ml-auto text-red-600 hover:text-red-800 font-medium"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}

        {/* 테이블 헤더 */}
        <div className="hidden lg:grid lg:grid-cols-7 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
          <div className="flex items-center">고객/제목</div>
          <div>상품</div>
          <div>상태</div>
          <div>긴급도</div>
          <div>답변시간</div>
          <div>등록일</div>
          <div>액션</div>
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div className="px-6 py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-500">문의 목록을 불러오는 중...</p>
            </div>
          </div>
        )}

        {/* Q&A 목록 */}
        {!loading && qnaData && qnaData.qnas.length > 0 && (
          <div className="divide-y divide-gray-200">
            {qnaData.qnas.map(qna => (
              <div
                key={qna.id}
                className="hidden lg:grid lg:grid-cols-7 gap-4 px-6 py-4 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{qna.userName}</p>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {qna.question}
                  </p>
                  {!qna.isPublic && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mt-2">
                      비공개
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-900">
                    {qna.productName || '상품 정보 없음'}
                  </p>
                  <p className="text-xs text-gray-500">
                    ID: {qna.productId.slice(-8)}
                  </p>
                </div>
                <div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      qna.isAnswered
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {qna.isAnswered ? '답변완료' : '미답변'}
                  </span>
                </div>
                <div>
                  {qna.isUrgent && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      🚨 긴급
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-900">
                    {qna.responseTimeHours
                      ? `${qna.responseTimeHours}시간`
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-900">
                    {new Date(qna.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(qna.createdAt).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {!qna.isAnswered && (
                    <button
                      onClick={() =>
                        setAnswerModal({
                          qnaId: qna.id,
                          question: qna.question,
                        })
                      }
                      className="text-sm bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                    >
                      답변하기
                    </button>
                  )}
                  {qna.isAnswered && qna.answer && (
                    <div className="text-xs text-gray-500">
                      답변자: {qna.answeredBy || '관리자'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && (!qnaData || qnaData.qnas.length === 0) && (
          <div className="px-6 py-12">
            <div className="text-center">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                문의가 없습니다
              </h3>
              <p className="text-gray-500">아직 등록된 문의가 없습니다.</p>
            </div>
          </div>
        )}

        {/* 페이징 */}
        {qnaData && qnaData.pagination && qnaData.pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                총 {qnaData.pagination.totalCount}개 중{' '}
                {(currentPage - 1) * 20 + 1}-
                {Math.min(currentPage * 20, qnaData.pagination.totalCount)}개
                표시
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                >
                  이전
                </button>
                <span className="px-3 py-1 text-sm">
                  {currentPage} / {qnaData.pagination.totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage(prev =>
                      Math.min(qnaData.pagination.totalPages, prev + 1)
                    )
                  }
                  disabled={currentPage === qnaData.pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                >
                  다음
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 답변 작성 모달 */}
      {answerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                문의 답변 작성
              </h3>
            </div>

            <div className="px-6 py-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  문의 내용
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-900">
                    {answerModal.question}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  답변 내용
                </label>
                <textarea
                  value={answerText}
                  onChange={e => setAnswerText(e.target.value)}
                  placeholder="고객 문의에 대한 답변을 작성해주세요..."
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setAnswerModal(null);
                  setAnswerText('');
                }}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleAnswerSubmit}
                disabled={submittingAnswer || !answerText.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {submittingAnswer ? '등록 중...' : '답변 등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInquiries;
