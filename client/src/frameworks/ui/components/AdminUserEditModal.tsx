// AdminUserEditModal - 관리자용 사용자 수정 모달
// src/frameworks/ui/components/AdminUserEditModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { UserApiAdapter } from '../../../adapters/api/UserApiAdapter';
import AddressModal from './AddressModal';
import { AddressData } from './AddressSearch';

interface AdminUserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: any) => void;
  user: {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string;
    postalCode?: string;
    address?: string;
    detailAddress?: string;
    role: 'customer' | 'admin';
    isActive: boolean;
  } | null;
}

interface AdminEditFormData {
  name: string;
  phoneNumber: string;
  postalCode: string;
  address: string;
  detailAddress?: string;
}

const adminEditSchema = yup.object({
  name: yup
    .string()
    .required('이름을 입력해주세요')
    .min(2, '이름은 최소 2자 이상이어야 합니다')
    .max(100, '이름은 최대 100자까지 입력 가능합니다')
    .matches(/^[가-힣a-zA-Z\s]+$/, '이름은 한글, 영문, 공백만 사용 가능합니다'),
  phoneNumber: yup
    .string()
    .required('휴대폰 번호를 입력해주세요')
    .matches(
      /^010\d{8}$/,
      '휴대폰 번호 형식이 올바르지 않습니다 (010으로 시작하는 11자리 숫자)'
    ),
  postalCode: yup
    .string()
    .required('우편번호를 입력해주세요')
    .matches(/^\d{5}$/, '우편번호는 5자리 숫자여야 합니다'),
  address: yup
    .string()
    .required('주소를 입력해주세요')
    .max(255, '주소는 최대 255자까지 입력 가능합니다'),
  detailAddress: yup
    .string()
    .optional()
    .max(255, '상세주소는 최대 255자까지 입력 가능합니다'),
});

const AdminUserEditModal: React.FC<AdminUserEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  user,
}) => {
  const userApiAdapter = useMemo(() => new UserApiAdapter(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    reset,
  } = useForm<AdminEditFormData>({
    resolver: yupResolver(adminEditSchema) as any,
    defaultValues: {
      name: '',
      phoneNumber: '',
      postalCode: '',
      address: '',
      detailAddress: '',
    },
  });

  // 사용자 정보 로드 (서버에서 최신 데이터 가져오기)
  useEffect(() => {
    const loadUserData = async () => {
      if (user && isOpen) {
        try {
          const response = await userApiAdapter.getUserById(user.id);
          if (response.success) {
            const userData = (response.data as any).user || response.data;
            reset({
              name: userData.name || '',
              phoneNumber: userData.phoneNumber || '',
              postalCode: userData.postalCode || '',
              address: userData.address || '',
              detailAddress: userData.detailAddress || '',
            });
          } else {
            toast.error('사용자 정보를 불러오는데 실패했습니다.');
          }
        } catch (error) {
          console.error('사용자 정보 로딩 실패:', error);
          toast.error('사용자 정보를 불러오는데 실패했습니다.');
        }
      }
    };

    loadUserData();
  }, [user, isOpen, userApiAdapter, reset]);

  // 모달 닫기 핸들러
  const handleClose = () => {
    reset();
    onClose();
  };

  // 사용자 정보 수정 제출
  const onSubmit = async (data: AdminEditFormData) => {
    if (!user) return;

    try {
      setIsLoading(true);

      const updateData: any = {
        name: data.name,
        phoneNumber: data.phoneNumber,
        postalCode: data.postalCode,
        address: data.address,
      };

      if (data.detailAddress?.trim()) {
        updateData.detailAddress = data.detailAddress.trim();
      }

      const response = await userApiAdapter.updateUserByAdmin(
        user.id,
        updateData
      );

      if (response.success) {
        toast.success('사용자 정보가 성공적으로 수정되었습니다!', {
          duration: 4000,
          icon: '✅',
        });

        // 부모 컴포넌트에 업데이트된 사용자 정보 전달
        onSave(response.data);
        handleClose();
      } else {
        toast.error(response.message || '사용자 정보 수정에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('사용자 정보 수정 오류:', error);
      toast.error(error.message || '사용자 정보 수정 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 주소 선택 핸들러
  const handleAddressSelect = (addressData: AddressData) => {
    setValue('postalCode', addressData.zonecode);
    setValue('address', addressData.address);
    setIsAddressModalOpen(false);
  };

  if (!isOpen || !user) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              사용자 정보 수정
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isSubmitting || isLoading}
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

          {/* 사용자 기본 정보 표시 */}
          <div className="px-6 py-4 bg-gray-50 border-b">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {user.name}
                </h3>
                <p className="text-sm text-gray-600">{user.email}</p>
                <div className="flex items-center space-x-3 mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {user.role === 'admin' ? '관리자' : '일반회원'}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.isActive ? '활성' : '비활성'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 폼 내용 */}
          <form onSubmit={handleSubmit(onSubmit as any)} className="p-6">
            <div className="space-y-6">
              {/* 경고 메시지 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-5 h-5 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <p className="text-sm text-yellow-800">
                    관리자는 사용자의 비밀번호를 수정할 수 없습니다. 개인정보만
                    수정 가능합니다.
                  </p>
                </div>
              </div>

              {/* 이름 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  이름
                </label>
                <div className="mt-1">
                  <input
                    {...register('name')}
                    type="text"
                    className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${
                      errors.name
                        ? 'border-red-300 text-red-900 placeholder-red-300'
                        : 'border-gray-300'
                    }`}
                    placeholder="이름을 입력하세요"
                  />
                  {errors.name && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.name.message}
                    </p>
                  )}
                </div>
              </div>

              {/* 휴대폰 번호 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  휴대폰 번호
                </label>
                <div className="mt-1">
                  <input
                    {...register('phoneNumber')}
                    type="tel"
                    className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${
                      errors.phoneNumber
                        ? 'border-red-300 text-red-900 placeholder-red-300'
                        : 'border-gray-300'
                    }`}
                    placeholder="01012345678"
                    onChange={e => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      if (value.length <= 11) {
                        e.target.value = value;
                        setValue('phoneNumber', value);
                      }
                    }}
                  />
                  {errors.phoneNumber && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.phoneNumber.message}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    010으로 시작하는 11자리 숫자를 입력해주세요
                  </p>
                </div>
              </div>

              {/* 주소 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  주소
                </label>

                {/* 우편번호 */}
                <div className="mb-3">
                  <div className="flex gap-2">
                    <input
                      {...register('postalCode')}
                      type="text"
                      placeholder="우편번호"
                      readOnly
                      className={`flex-1 px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-gray-50 ${
                        errors.postalCode
                          ? 'border-red-300 text-red-900'
                          : 'border-gray-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setIsAddressModalOpen(true)}
                      className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                    >
                      우편번호 검색
                    </button>
                  </div>
                  {errors.postalCode && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.postalCode.message}
                    </p>
                  )}
                </div>

                {/* 기본주소 */}
                <div className="mb-3">
                  <input
                    {...register('address')}
                    type="text"
                    placeholder="기본주소"
                    readOnly
                    className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-gray-50 ${
                      errors.address
                        ? 'border-red-300 text-red-900'
                        : 'border-gray-300'
                    }`}
                  />
                  {errors.address && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.address.message}
                    </p>
                  )}
                </div>

                {/* 상세주소 */}
                <div className="mb-3">
                  <input
                    {...register('detailAddress')}
                    type="text"
                    placeholder="상세주소 (동/호수 등)"
                    className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${
                      errors.detailAddress
                        ? 'border-red-300 text-red-900 placeholder-red-300'
                        : 'border-gray-300'
                    }`}
                  />
                  {errors.detailAddress && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.detailAddress.message}
                    </p>
                  )}
                </div>

                <p className="text-xs text-gray-500">
                  우편번호 검색 버튼을 클릭하여 주소를 선택해주세요
                </p>
              </div>
            </div>

            {/* 버튼 영역 */}
            <div className="flex items-center justify-end space-x-3 pt-6 mt-6 border-t">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isSubmitting || isLoading}
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                disabled={isSubmitting || isLoading}
              >
                {(isSubmitting || isLoading) && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>
                  {isSubmitting || isLoading ? '수정 중...' : '수정 완료'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 주소 검색 모달 */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onAddressSelect={handleAddressSelect}
      />
    </>
  );
};

export default AdminUserEditModal;
