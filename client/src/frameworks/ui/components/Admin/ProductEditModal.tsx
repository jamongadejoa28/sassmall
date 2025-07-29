// ========================================
// Product Edit Modal - 상품 수정 모달
// Clean Architecture: Framework Layer
// src/frameworks/ui/components/Admin/ProductEditModal.tsx
// ========================================

import React, { useState, useCallback, useEffect } from 'react';
import { UpdateProductRequest } from '../../../../adapters/api/ProductApiAdapter';
import { Category, Product } from '../../../../shared/types/product';

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    productId: string,
    productData: UpdateProductRequest
  ) => Promise<void>;
  categories: Category[];
  product: Product | null;
  loading?: boolean;
}

export const ProductEditModal: React.FC<ProductEditModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categories,
  product,
  loading = false,
}) => {
  // 폼 상태 관리
  const [formData, setFormData] = useState<UpdateProductRequest>({
    name: '',
    description: '',
    price: 0,
    categoryId: '',
    brand: '',
    sku: '',
    weight: undefined,
    dimensions: undefined,
    tags: [],
    discountPercent: undefined,
    images: [],
    thumbnailIndex: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  // 상품 데이터로 폼 초기화
  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        name: product.name,
        description: product.description,
        price: product.original_price || product.price, // 원가 표시 (original_price가 없으면 price 사용)
        categoryId: product.category.id,
        brand: product.brand,
        sku: product.sku,
        weight: product.weight,
        dimensions: product.dimensions,
        tags: product.tags || [],
        discountPercent: product.discount_percent,
        images: [],
        thumbnailIndex: 0,
      });

      // 기존 이미지 URL 설정
      if (product.images && product.images.length > 0) {
        setExistingImages(product.images);
      }

      setErrors({});
      setTagInput('');
      setImagePreviewUrls([]);
    }
  }, [product, isOpen]);

  // 폼 데이터 업데이트
  const updateFormData = useCallback(
    (field: string, value: any) => {
      setFormData((prev: UpdateProductRequest) => ({
        ...prev,
        [field]: value,
      }));

      // 해당 필드의 에러 제거
      if (errors[field]) {
        setErrors((prev: Record<string, string>) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors]
  );

  // 중첩된 객체 업데이트 (dimensions)
  const updateNestedData = useCallback(
    (parent: string, field: string, value: any) => {
      setFormData((prev: UpdateProductRequest) => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof UpdateProductRequest] as any),
          [field]: value,
        },
      }));
    },
    []
  );

  // 태그 추가
  const addTag = useCallback(() => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData((prev: UpdateProductRequest) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput('');
    }
  }, [tagInput, formData.tags]);

  // 태그 제거
  const removeTag = useCallback((tagToRemove: string) => {
    setFormData((prev: UpdateProductRequest) => ({
      ...prev,
      tags: prev.tags?.filter((tag: string) => tag !== tagToRemove) || [],
    }));
  }, []);

  // 이미지 파일 추가
  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;

      const validFiles: File[] = [];
      const newPreviewUrls: string[] = [];

      Array.from(files).forEach(file => {
        // 이미지 파일 타입 검증
        if (!file.type.startsWith('image/')) {
          alert(`${file.name}은(는) 이미지 파일이 아닙니다.`);
          return;
        }

        // 파일 크기 검증 (5MB 제한)
        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name}의 크기가 5MB를 초과합니다.`);
          return;
        }

        validFiles.push(file);

        // 미리보기 URL 생성
        const previewUrl = URL.createObjectURL(file);
        newPreviewUrls.push(previewUrl);
      });

      if (validFiles.length > 0) {
        setFormData((prev: UpdateProductRequest) => ({
          ...prev,
          images: [...(prev.images || []), ...validFiles],
        }));

        setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
      }

      // 파일 입력 초기화
      event.target.value = '';
    },
    []
  );

  // 새 이미지 제거
  const removeNewImage = useCallback((index: number) => {
    setFormData((prev: UpdateProductRequest) => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index) || [],
      thumbnailIndex:
        prev.thumbnailIndex === index
          ? 0
          : prev.thumbnailIndex && prev.thumbnailIndex > index
            ? prev.thumbnailIndex - 1
            : prev.thumbnailIndex,
    }));

    setImagePreviewUrls(prev => {
      // 기존 URL 해제
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // 기존 이미지 제거
  const removeExistingImage = useCallback((index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 썸네일 이미지 선택 (새 이미지만)
  const setThumbnail = useCallback((index: number) => {
    setFormData((prev: UpdateProductRequest) => ({
      ...prev,
      thumbnailIndex: index,
    }));
  }, []);

  // 할인가격 계산
  const calculateDiscountedPrice = useCallback(
    (price: number, discountPercent?: number) => {
      if (!discountPercent || discountPercent <= 0) return price;
      return price * (1 - discountPercent / 100);
    },
    []
  );

  // 컴포넌트 언마운트 시 이미지 URL 해제
  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviewUrls]);

  // 폼 유효성 검사
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // 필수 필드 검사
    if (!formData.name?.trim()) {
      newErrors.name = '상품명을 입력해주세요.';
    } else if (formData.name.length > 200) {
      newErrors.name = '상품명은 200자 이내로 입력해주세요.';
    }

    if (!formData.description?.trim()) {
      newErrors.description = '상품 설명을 입력해주세요.';
    } else if (formData.description.length > 2000) {
      newErrors.description = '상품 설명은 2000자 이내로 입력해주세요.';
    }

    if (!formData.price || formData.price <= 0) {
      newErrors.price = '가격은 0보다 커야 합니다.';
    } else if (formData.price % 10 !== 0) {
      newErrors.price = '가격은 10원 단위로 입력해주세요.';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = '카테고리를 선택해주세요.';
    }

    if (!formData.brand?.trim()) {
      newErrors.brand = '브랜드를 입력해주세요.';
    } else if (formData.brand.length > 100) {
      newErrors.brand = '브랜드명은 100자 이내로 입력해주세요.';
    }

    if (!formData.sku?.trim()) {
      newErrors.sku = 'SKU를 입력해주세요.';
    } else if (!/^[A-Z0-9\-_]+$/.test(formData.sku)) {
      newErrors.sku =
        'SKU는 대문자, 숫자, 하이픈, 언더스코어만 사용 가능합니다.';
    } else if (formData.sku.length > 50) {
      newErrors.sku = 'SKU는 50자 이내로 입력해주세요.';
    }

    // 할인율 검사
    if (
      formData.discountPercent !== undefined &&
      (formData.discountPercent < 0 || formData.discountPercent > 100)
    ) {
      newErrors.discountPercent = '할인율은 0~100% 범위 내에서 입력해주세요.';
    }

    // 이미지 검사
    if (formData.images && formData.images.length > 10) {
      newErrors.images = '이미지는 최대 10개까지 업로드 가능합니다.';
    }

    // 중량 검사
    if (formData.weight !== undefined && formData.weight < 0) {
      newErrors.weight = '중량은 0 이상이어야 합니다.';
    }

    // 치수 검사
    if (formData.dimensions) {
      if (
        formData.dimensions.width < 0 ||
        formData.dimensions.height < 0 ||
        formData.dimensions.depth < 0
      ) {
        newErrors.dimensions = '치수는 0 이상이어야 합니다.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // 폼 제출
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm() || !product) {
        return;
      }

      try {
        await onSubmit(product.id, formData);
        onClose();
      } catch (error) {
        // 에러는 상위 컴포넌트에서 처리
        console.error('상품 수정 실패:', error);
      }
    },
    [formData, validateForm, product, onSubmit, onClose]
  );

  // 모달이 닫히지 않은 경우만 렌더링
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">상품 수정</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
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

        {/* 모달 본문 */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">기본 정보</h3>

              {/* 상품명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상품명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => updateFormData('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="상품명을 입력하세요"
                  maxLength={200}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              {/* 상품 설명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상품 설명 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => updateFormData('description', e.target.value)}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="상품에 대한 자세한 설명을 입력하세요"
                  maxLength={2000}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.description}
                  </p>
                )}
              </div>

              {/* 가격 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    판매가격 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.price || ''}
                    onChange={e => {
                      const value = e.target.value;
                      if (value === '') {
                        updateFormData('price', 0);
                      } else {
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue)) {
                          updateFormData('price', numValue);
                        }
                      }
                    }}
                    onBlur={e => {
                      // 포커스 잃을 때만 10원 단위로 반올림
                      const value = e.target.value;
                      if (value !== '') {
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue)) {
                          const roundedValue = Math.round(numValue / 10) * 10;
                          updateFormData('price', roundedValue);
                        }
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.price ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="가격을 입력하세요 (10원 단위)"
                    min="0"
                    step="10"
                  />
                  {errors.price && (
                    <p className="text-red-500 text-sm mt-1">{errors.price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    할인율 (%)
                  </label>
                  <input
                    type="number"
                    value={formData.discountPercent || ''}
                    onChange={e =>
                      updateFormData(
                        'discountPercent',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.discountPercent
                        ? 'border-red-500'
                        : 'border-gray-300'
                    }`}
                    placeholder="할인율 (0-100)"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  {formData.discountPercent &&
                    formData.discountPercent > 0 &&
                    formData.price && (
                      <p className="text-green-600 text-sm mt-1">
                        할인가격:{' '}
                        {new Intl.NumberFormat('ko-KR', {
                          style: 'currency',
                          currency: 'KRW',
                        }).format(
                          calculateDiscountedPrice(
                            formData.price,
                            formData.discountPercent
                          )
                        )}
                      </p>
                    )}
                  {errors.discountPercent && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.discountPercent}
                    </p>
                  )}
                </div>
              </div>

              {/* 카테고리 및 브랜드 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    카테고리 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={e => updateFormData('categoryId', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.categoryId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">카테고리 선택</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.categoryId}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    브랜드 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={e => updateFormData('brand', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.brand ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="브랜드명"
                    maxLength={100}
                  />
                  {errors.brand && (
                    <p className="text-red-500 text-sm mt-1">{errors.brand}</p>
                  )}
                </div>
              </div>

              {/* SKU */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={e =>
                    updateFormData('sku', e.target.value.toUpperCase())
                  }
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.sku ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="예: PRODUCT-001"
                  maxLength={50}
                />
                {errors.sku && (
                  <p className="text-red-500 text-sm mt-1">{errors.sku}</p>
                )}
                <p className="text-gray-500 text-xs mt-1">
                  대문자, 숫자, 하이픈, 언더스코어만 사용 가능
                </p>
              </div>
            </div>

            {/* 추가 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">추가 정보</h3>

              {/* 상품 이미지 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상품 이미지
                </label>

                {/* 기존 이미지 */}
                {existingImages.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      기존 이미지 ({existingImages.length}개)
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {existingImages.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`기존 이미지 ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-gray-200"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => removeExistingImage(index)}
                              className="bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 새 이미지 업로드 */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    id="image-upload-edit"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="image-upload-edit"
                    className="cursor-pointer flex flex-col items-center justify-center text-gray-500 hover:text-gray-700"
                  >
                    <svg
                      className="w-12 h-12 mb-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-sm">클릭하여 새 이미지를 추가하세요</p>
                    <p className="text-xs text-gray-400 mt-1">
                      PNG, JPG, GIF 파일 (최대 5MB, 최대 10개)
                    </p>
                  </label>
                </div>

                {/* 새 이미지 미리보기 */}
                {formData.images && formData.images.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      새로 추가된 이미지 ({formData.images.length}개)
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {imagePreviewUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`새 이미지 ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-gray-200"
                          />
                          {/* 썸네일 표시 */}
                          {formData.thumbnailIndex === index && (
                            <div className="absolute inset-0 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                                대표
                              </span>
                            </div>
                          )}
                          {/* 액션 버튼들 */}
                          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                            {formData.thumbnailIndex !== index && (
                              <button
                                type="button"
                                onClick={() => setThumbnail(index)}
                                className="bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600"
                              >
                                대표설정
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeNewImage(index)}
                              className="bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {errors.images && (
                  <p className="text-red-500 text-sm mt-1">{errors.images}</p>
                )}
              </div>

              {/* 중량 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  중량 (kg)
                </label>
                <input
                  type="number"
                  value={formData.weight || ''}
                  onChange={e =>
                    updateFormData(
                      'weight',
                      e.target.value ? parseFloat(e.target.value) : undefined
                    )
                  }
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.weight ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="중량 (선택사항)"
                  min="0"
                  step="0.01"
                />
                {errors.weight && (
                  <p className="text-red-500 text-sm mt-1">{errors.weight}</p>
                )}
              </div>

              {/* 치수 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  치수 (cm)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    value={formData.dimensions?.width || ''}
                    onChange={e =>
                      updateNestedData(
                        'dimensions',
                        'width',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="폭"
                    min="0"
                    step="0.1"
                  />
                  <input
                    type="number"
                    value={formData.dimensions?.height || ''}
                    onChange={e =>
                      updateNestedData(
                        'dimensions',
                        'height',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="높이"
                    min="0"
                    step="0.1"
                  />
                  <input
                    type="number"
                    value={formData.dimensions?.depth || ''}
                    onChange={e =>
                      updateNestedData(
                        'dimensions',
                        'depth',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="깊이"
                    min="0"
                    step="0.1"
                  />
                </div>
                {errors.dimensions && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.dimensions}
                  </p>
                )}
              </div>

              {/* 태그 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  태그
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyPress={e =>
                      e.key === 'Enter' && (e.preventDefault(), addTag())
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="태그 입력 후 엔터"
                    maxLength={50}
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    추가
                  </button>
                </div>
                {/* 태그 목록 */}
                <div className="flex flex-wrap gap-2">
                  {formData.tags?.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 모달 푸터 */}
          <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{loading ? '저장 중...' : '상품 수정'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
