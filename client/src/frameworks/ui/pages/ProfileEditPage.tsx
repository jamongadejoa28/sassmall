// ProfileEditPage - 사용자 프로필 수정 페이지
// src/frameworks/ui/pages/ProfileEditPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { UserApiAdapter } from '../../../adapters/api/UserApiAdapter';
import { useAuthStore } from '../../state/authStore';
import { ROUTES } from '../../../shared/constants/routes';
import PasswordConfirmModal from '../components/PasswordConfirmModal';
import AddressModal from '../components/AddressModal';
import { AddressData } from '../components/AddressSearch';

interface ProfileFormData {
  name: string;
  phoneNumber: string;
  postalCode: string;
  address: string;
  detailAddress?: string;
  password?: string;
  confirmPassword?: string;
}

const profileSchema = yup.object({
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
  password: yup
    .string()
    .optional()
    .test('password-validation', function (value) {
      if (!value) return true; // 비밀번호가 없으면 기존 비밀번호 유지

      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

      if (value.length < 8) {
        return this.createError({
          message: '비밀번호는 최소 8자 이상이어야 합니다',
        });
      }

      if (value.length > 128) {
        return this.createError({
          message: '비밀번호는 최대 128자까지 입력 가능합니다',
        });
      }

      if (!passwordRegex.test(value)) {
        return this.createError({
          message:
            '비밀번호는 대문자, 소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다',
        });
      }

      return true;
    }),
  confirmPassword: yup.string().when('password', {
    is: (password: string) => password && password.length > 0,
    then: schema =>
      schema
        .required('비밀번호 확인을 입력해주세요')
        .oneOf([yup.ref('password')], '비밀번호가 일치하지 않습니다'),
    otherwise: schema => schema.optional(),
  }),
});

const ProfileEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuthStore();
  const userApiAdapter = useMemo(() => new UserApiAdapter(), []);

  const [isPasswordConfirmOpen, setIsPasswordConfirmOpen] = useState(true);
  const [isPasswordConfirmed, setIsPasswordConfirmed] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<ProfileFormData>({
    resolver: yupResolver(profileSchema) as any,
    defaultValues: {
      name: '',
      phoneNumber: '',
      postalCode: '',
      address: '',
      detailAddress: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  // 사용자 정보 로드 (서버에서 최신 데이터 가져오기)
  useEffect(() => {
    const loadUserProfile = async () => {
      if (isPasswordConfirmed) {
        try {
          const response = await userApiAdapter.getProfile();
          if (response.success) {
            const userData = (response.data as any).user || response.data;
            reset({
              name: userData.name || '',
              phoneNumber: userData.phoneNumber || '',
              postalCode: userData.postalCode || '',
              address: userData.address || '',
              detailAddress: userData.detailAddress || '',
              password: '',
              confirmPassword: '',
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

    loadUserProfile();
  }, [isPasswordConfirmed, userApiAdapter, reset]);

  // 비밀번호 확인 성공 핸들러
  const handlePasswordConfirmed = () => {
    setIsPasswordConfirmed(true);
    setIsPasswordConfirmOpen(false);
  };

  // 비밀번호 확인 취소 핸들러
  const handlePasswordConfirmCancel = () => {
    navigate(ROUTES.PROFILE);
  };

  // 프로필 수정 제출
  const onSubmit = async (data: ProfileFormData) => {
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

      // 비밀번호가 입력된 경우에만 포함
      if (data.password?.trim()) {
        updateData.password = data.password;
        updateData.confirmPassword = data.confirmPassword;
      }

      const response = await userApiAdapter.updateProfile(updateData);

      if (response.success) {
        // 스토어의 사용자 정보 업데이트
        updateUser(response.data);

        toast.success('프로필이 성공적으로 수정되었습니다!', {
          duration: 4000,
          icon: '🎉',
        });

        navigate(ROUTES.PROFILE);
      } else {
        toast.error(response.message || '프로필 수정에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('프로필 수정 오류:', error);
      toast.error(error.message || '프로필 수정 중 오류가 발생했습니다.');
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

  // 비밀번호 표시 토글
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // 비밀번호 확인이 완료되지 않은 경우 모달 표시
  if (!isPasswordConfirmed) {
    return (
      <PasswordConfirmModal
        isOpen={isPasswordConfirmOpen}
        onConfirm={handlePasswordConfirmed}
        onCancel={handlePasswordConfirmCancel}
        title="프로필 수정 확인"
        message="프로필 수정을 위해 현재 비밀번호를 입력해주세요."
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          프로필 수정
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          개인정보를 수정할 수 있습니다
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit as any)}>
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

            {/* 비밀번호 변경 (선택사항) */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                비밀번호 변경 (선택사항)
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                비밀번호를 변경하지 않으려면 아래 필드를 비워두세요.
              </p>

              {/* 새 비밀번호 입력 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  새 비밀번호
                </label>
                <div className="mt-1 relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm pr-10 ${
                      errors.password
                        ? 'border-red-300 text-red-900 placeholder-red-300'
                        : 'border-gray-300'
                    }`}
                    placeholder="새 비밀번호를 입력하세요"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L12 12m-2.122-2.122L7.76 7.76M12 12l2.122 2.122m4.243-4.243L21.24 7.76M12 12l2.122 2.122m0 0l2.121 2.121"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.password.message}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    8자 이상, 대문자·소문자·숫자·특수문자 포함
                  </p>
                </div>
              </div>

              {/* 비밀번호 확인 */}
              {password && password.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    새 비밀번호 확인
                  </label>
                  <div className="mt-1 relative">
                    <input
                      {...register('confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm pr-10 ${
                        errors.confirmPassword
                          ? 'border-red-300 text-red-900 placeholder-red-300'
                          : 'border-gray-300'
                      }`}
                      placeholder="새 비밀번호를 다시 입력하세요"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={toggleConfirmPasswordVisibility}
                    >
                      {showConfirmPassword ? (
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L12 12m-2.122-2.122L7.76 7.76M12 12l2.122 2.122m4.243-4.243L21.24 7.76M12 12l2.122 2.122m0 0l2.121 2.121"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                    {errors.confirmPassword && (
                      <p className="mt-2 text-sm text-red-600">
                        {errors.confirmPassword.message}
                      </p>
                    )}

                    {/* 비밀번호 확인 일치 여부 표시 */}
                    {watch('confirmPassword') && (
                      <div className="mt-2">
                        {watch('confirmPassword') === password ? (
                          <div className="flex items-center text-sm text-green-600">
                            <svg
                              className="w-4 h-4 mr-2 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="font-medium">
                              비밀번호가 일치합니다
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center text-sm text-red-600">
                            <svg
                              className="w-4 h-4 mr-2 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="font-medium">
                              비밀번호가 일치하지 않습니다
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 버튼 영역 */}
            <div className="flex items-center justify-between space-x-3 pt-4">
              <button
                type="button"
                onClick={() => navigate(ROUTES.PROFILE)}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isSubmitting || isLoading}
              >
                취소
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
    </div>
  );
};

export default ProfileEditPage;
