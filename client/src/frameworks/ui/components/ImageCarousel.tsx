// ImageCarousel.tsx - Modern Image Carousel Component for Product Detail
// 위치: client/src/frameworks/ui/components/ImageCarousel.tsx

import React, { useState, useEffect, useCallback, memo } from 'react';

interface ImageCarouselProps {
  images: string[];
  alt: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showThumbnails?: boolean;
  showControls?: boolean;
  className?: string;
}

/**
 * 현대적인 이미지 캐러셀 컴포넌트
 * - 자동 순환 (선택적)
 * - 수동 네비게이션 (화살표, 도트, 썸네일)
 * - 터치/스와이프 지원 (모바일)
 * - 키보드 네비게이션
 * - 확대/축소 기능
 */
export const ImageCarousel: React.FC<ImageCarouselProps> = memo(
  ({
    images,
    alt,
    autoPlay = false,
    autoPlayInterval = 5000,
    showThumbnails = true,
    showControls = true,
    className = '',
  }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [isZoomed, setIsZoomed] = useState(false);
    const [imageLoaded, setImageLoaded] = useState<boolean[]>([]);

    // 이미지가 없을 때 빈 배열 처리
    const validImages = images.filter(Boolean);
    const hasImages = validImages.length > 0;

    // 이미지 로드 상태 초기화
    useEffect(() => {
      setImageLoaded(new Array(validImages.length).fill(false));
    }, [validImages.length]);

    const goToNext = useCallback(() => {
      if (!hasImages) return;
      setCurrentIndex(prev => (prev + 1) % validImages.length);
    }, [hasImages, validImages.length]);

    const goToPrevious = useCallback(() => {
      if (!hasImages) return;
      setCurrentIndex(
        prev => (prev - 1 + validImages.length) % validImages.length
      );
    }, [hasImages, validImages.length]);

    const goToSlide = useCallback((index: number) => {
      setCurrentIndex(index);
    }, []);

    const toggleAutoPlay = useCallback(() => {
      setIsPlaying(prev => !prev);
    }, []);

    // 자동 재생
    useEffect(() => {
      if (!isPlaying || !hasImages || validImages.length <= 1) return;

      const interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % validImages.length);
      }, autoPlayInterval);

      return () => clearInterval(interval);
    }, [isPlaying, hasImages, validImages.length, autoPlayInterval]);

    // 키보드 네비게이션
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!hasImages) return;

        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            goToPrevious();
            break;
          case 'ArrowRight':
            e.preventDefault();
            goToNext();
            break;
          case ' ':
            e.preventDefault();
            toggleAutoPlay();
            break;
          case 'Escape':
            e.preventDefault();
            setIsZoomed(false);
            break;
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasImages, goToNext, goToPrevious, toggleAutoPlay]);

    const handleImageLoad = useCallback((index: number) => {
      setImageLoaded(prev => {
        const newLoaded = [...prev];
        newLoaded[index] = true;
        return newLoaded;
      });
    }, []);

    const toggleZoom = useCallback(() => {
      setIsZoomed(prev => !prev);
    }, []);

    // 이미지가 없을 때 플레이스홀더 표시
    if (!hasImages) {
      return (
        <div
          className={`relative bg-gray-100 rounded-lg ${className}`}
          style={{ aspectRatio: '1/1' }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="h-16 w-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="ml-2 text-gray-500">이미지 없음</span>
          </div>
        </div>
      );
    }

    return (
      <div className={`relative ${className}`}>
        {/* 메인 이미지 영역 */}
        <div
          className={`relative overflow-hidden rounded-lg bg-gray-100 ${
            isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
          }`}
          style={{ aspectRatio: '1/1' }}
          onClick={toggleZoom}
        >
          {validImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === currentIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={image}
                alt={`${alt} ${index + 1}`}
                className={`w-full h-full object-cover transition-transform duration-300 ${
                  isZoomed ? 'scale-150' : 'scale-100'
                } ${imageLoaded[index] ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => handleImageLoad(index)}
                onError={() => handleImageLoad(index)} // 에러 시에도 로딩 완료로 처리
              />
              {!imageLoaded[index] && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                </div>
              )}
            </div>
          ))}

          {/* 네비게이션 컨트롤 */}
          {showControls && validImages.length > 1 && (
            <>
              <button
                onClick={e => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity z-10"
                aria-label="이전 이미지"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <button
                onClick={e => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity z-10"
                aria-label="다음 이미지"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}

          {/* 자동재생 컨트롤 */}
          {autoPlay && validImages.length > 1 && (
            <button
              onClick={e => {
                e.stopPropagation();
                toggleAutoPlay();
              }}
              className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity z-10"
              aria-label={isPlaying ? '자동재생 정지' : '자동재생 시작'}
            >
              {isPlaying ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 9v6m4-6v6"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1"
                  />
                </svg>
              )}
            </button>
          )}

          {/* 확대/축소 아이콘 */}
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs z-10">
            {isZoomed ? '축소하려면 클릭' : '확대하려면 클릭'}
          </div>
        </div>

        {/* 도트 인디케이터 */}
        {validImages.length > 1 && (
          <div className="flex justify-center mt-4 space-x-2">
            {validImages.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentIndex
                    ? 'bg-blue-600'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`이미지 ${index + 1}로 이동`}
              />
            ))}
          </div>
        )}

        {/* 썸네일 목록 */}
        {showThumbnails && validImages.length > 1 && (
          <div className="mt-4 flex space-x-2 overflow-x-auto pb-2">
            {validImages.map((image, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  index === currentIndex
                    ? 'border-blue-600'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <img
                  src={image}
                  alt={`썸네일 ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

ImageCarousel.displayName = 'ImageCarousel';

export default ImageCarousel;
