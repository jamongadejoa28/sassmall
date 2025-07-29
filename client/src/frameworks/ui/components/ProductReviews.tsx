// ProductReviews.tsx - 상품 리뷰 컴포넌트
// Clean Architecture: UI Components Layer
// 위치: client/src/frameworks/ui/components/ProductReviews.tsx

import React, { useState, useEffect, useCallback } from 'react';

// ========================================
// Types & Interfaces
// ========================================

interface Review {
  id: string;
  userName: string;
  rating: number;
  content: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
}

interface ReviewsResponse {
  success: boolean;
  message: string;
  data: {
    reviews: Review[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
    statistics: {
      totalReviews: number;
      averageRating: number;
      ratingDistribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
      };
      verifiedPurchaseCount: number;
    };
  };
}

interface ProductReviewsProps {
  productId: string;
}

// ========================================
// ProductReviews Component
// ========================================

const ProductReviews: React.FC<ProductReviewsProps> = ({ productId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [sortBy, setSortBy] = useState<string>('newest');

  // ========================================
  // API Functions
  // ========================================

  const fetchReviews = useCallback(
    async (page: number = 1, sort: string = 'newest') => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `http://localhost:3001/api/v1/products/${productId}/reviews?page=${page}&limit=10&sortBy=${sort}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ReviewsResponse = await response.json();

        if (data.success) {
          setReviews(data.data.reviews || []);
          setCurrentPage(data.data.pagination?.currentPage || 1);
          setTotalPages(data.data.pagination?.totalPages || 1);
          setTotalReviews(data.data.pagination?.totalItems || 0);
          setAverageRating(data.data.statistics?.averageRating || 0);
        } else {
          throw new Error(data.message || '리뷰를 불러오는데 실패했습니다.');
        }
      } catch (err: any) {
        const errorMessage =
          err.message || '리뷰를 불러오는 중 오류가 발생했습니다.';
        setError(errorMessage);
        console.error('Reviews API Error:', err);
      } finally {
        setLoading(false);
      }
    },
    [productId]
  );

  useEffect(() => {
    fetchReviews(currentPage, sortBy);
  }, [fetchReviews, currentPage, sortBy]);

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

  // ========================================
  // Render Helpers
  // ========================================

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <svg
        key={index}
        className={`h-4 w-4 ${
          index < rating ? 'text-yellow-400' : 'text-gray-300'
        }`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

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
          onClick={() => fetchReviews(currentPage, sortBy)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 리뷰 요약 */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            고객 리뷰 ({totalReviews}개)
          </h3>
          <div className="flex items-center">
            <div className="flex items-center mr-2">
              {renderStars(Math.round(averageRating))}
            </div>
            <span className="text-sm text-gray-600">
              {(averageRating || 0).toFixed(1)} / 5.0
            </span>
          </div>
        </div>
      </div>

      {/* 정렬 옵션 */}
      <div className="flex justify-between items-center">
        <h4 className="text-md font-medium text-gray-900">리뷰 목록</h4>
        <select
          value={sortBy}
          onChange={e => handleSortChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="newest">최신순</option>
          <option value="oldest">오래된순</option>
          <option value="rating_high">별점 높은순</option>
          <option value="rating_low">별점 낮은순</option>
          <option value="helpful">도움순</option>
        </select>
      </div>

      {/* 리뷰 목록 */}
      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">아직 작성된 리뷰가 없습니다.</p>
          <p className="text-sm text-gray-400 mt-2">
            첫 번째 리뷰를 작성해보세요!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map(review => (
            <div key={review.id} className="border-b border-gray-200 pb-6">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center">
                  <span className="font-medium text-gray-900">
                    {review.userName}
                  </span>
                  {review.isVerifiedPurchase && (
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      구매확인
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {formatDate(review.createdAt)}
                </span>
              </div>

              <div className="flex items-center mb-3">
                {renderStars(review.rating)}
                <span className="ml-2 text-sm text-gray-600">
                  {review.rating}.0
                </span>
              </div>

              <p className="text-gray-700 leading-relaxed mb-3">
                {review.content}
              </p>

              <div className="flex items-center">
                <button className="text-sm text-gray-500 hover:text-gray-700">
                  도움돼요 ({review.helpfulCount})
                </button>
              </div>
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
    </div>
  );
};

export default ProductReviews;
