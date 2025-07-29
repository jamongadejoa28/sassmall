// ========================================
// 회원가입 페이지 - User Service API 연동
// client/src/frameworks/ui/pages/RegisterPage.tsx
// ========================================

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../state/authStore';
import { RegisterData } from '../../../shared/types/user';
import { ROUTES } from '../../../shared/constants/routes';
import PhoneVerification, {
  VerificationResult,
} from '../components/PhoneVerification';
import { AddressData } from '../components/AddressSearch';
import AddressModal from '../components/AddressModal';

// ========================================
// 타입 정의
// ========================================

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  postalCode: string;
  address: string;
  detailAddress?: string;
  agreeToTerms: boolean;
  isPhoneVerified: boolean;
}

// ========================================
// 유효성 검증 스키마
// ========================================

const registerSchema = yup.object({
  name: yup
    .string()
    .required('이름을 입력해주세요')
    .min(2, '이름은 최소 2자 이상이어야 합니다')
    .max(100, '이름은 최대 100자까지 입력 가능합니다')
    .matches(/^[가-힣a-zA-Z\s]+$/, '이름은 한글, 영문, 공백만 사용 가능합니다'),
  email: yup
    .string()
    .required('이메일을 입력해주세요')
    .email('올바른 이메일 형식을 입력해주세요')
    .max(255, '이메일은 최대 255자까지 입력 가능합니다'),
  password: yup
    .string()
    .required('비밀번호를 입력해주세요')
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
    .max(128, '비밀번호는 최대 128자까지 입력 가능합니다')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      '비밀번호는 대문자, 소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다'
    ),
  confirmPassword: yup
    .string()
    .required('비밀번호 확인을 입력해주세요')
    .oneOf([yup.ref('password')], '비밀번호가 일치하지 않습니다'),
  phoneNumber: yup
    .string()
    .required('휴대폰 번호를 입력해주세요')
    .matches(
      /^010\d{8}$/,
      '휴대폰 번호 형식이 올바르지 않습니다 (010으로 시작하는 11자리 숫자)'
    ),
  agreeToTerms: yup
    .boolean()
    .oneOf([true], '이용약관에 동의해주세요')
    .required(),
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
  isPhoneVerified: yup
    .boolean()
    .oneOf([true], '휴대폰 본인인증을 완료해주세요')
    .required(),
});

// ========================================
// RegisterPage 컴포넌트
// ========================================

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch,
    setValue,
  } = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema) as any,
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phoneNumber: '',
      postalCode: '',
      address: '',
      detailAddress: '',
      agreeToTerms: false,
      isPhoneVerified: false,
    },
  });

  // 실시간 비밀번호 확인
  const password = watch('password');

  // ========================================
  // 이벤트 핸들러
  // ========================================

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const registerData: RegisterData = {
        name: data.name,
        email: data.email,
        password: data.password,
        phoneNumber: data.phoneNumber,
        postalCode: data.postalCode,
        address: data.address,
        role: 'customer', // 모든 사용자를 일반 회원으로 설정
      };

      // detailAddress가 있을 때만 추가
      if (data.detailAddress?.trim()) {
        registerData.detailAddress = data.detailAddress.trim();
      }

      const result = await registerUser(registerData);

      if (result.success) {
        toast.success('회원가입이 완료되었습니다!', {
          duration: 4000,
          icon: '🎉',
        });

        // 로그인 페이지로 이동
        navigate(ROUTES.LOGIN);
      } else {
        // 서버에서 반환된 에러 메시지 표시
        if (result.error?.includes('이메일')) {
          setError('email', {
            type: 'server',
            message: result.error,
          });
        } else {
          setError('root', {
            type: 'server',
            message: result.error || '회원가입에 실패했습니다.',
          });
        }
      }
    } catch (error) {
      console.error('회원가입 오류:', error);
      toast.error('회원가입 중 오류가 발생했습니다.', {
        duration: 4000,
        icon: '❌',
      });
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handlePhoneVerification = (result: VerificationResult) => {
    setValue('isPhoneVerified', result.isVerified);
    if (result.isVerified && result.phoneNumber) {
      setValue('phoneNumber', result.phoneNumber.replace(/[-\s]/g, ''));
      toast.success('휴대폰 본인인증이 완료되었습니다!', {
        duration: 3000,
        icon: '✅',
      });
    }
  };

  const handlePhoneVerificationFailed = (error: string) => {
    setValue('isPhoneVerified', false);
    toast.error(error, {
      duration: 4000,
      icon: '❌',
    });
  };

  const handleAddressSelect = (addressData: AddressData) => {
    setValue('postalCode', addressData.zonecode);
    setValue('address', addressData.address);
    setIsAddressModalOpen(false);
  };

  const openAddressModal = () => {
    setIsAddressModalOpen(true);
  };

  const closeAddressModal = () => {
    setIsAddressModalOpen(false);
  };

  // ========================================
  // 렌더링
  // ========================================

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* 로고 */}
        <Link to={ROUTES.HOME} className="flex justify-center">
          <h1 className="text-3xl font-bold text-blue-600">ShoppingMall</h1>
        </Link>

        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          회원가입
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          이미 계정이 있으신가요?{' '}
          <Link
            to={ROUTES.LOGIN}
            className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            로그인하기
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit as any)}>
            {/* 이름 입력 */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                이름
              </label>
              <div className="mt-1">
                <input
                  {...register('name')}
                  type="text"
                  autoComplete="name"
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
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

            {/* 이메일 입력 */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                이메일
              </label>
              <div className="mt-1">
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.email
                      ? 'border-red-300 text-red-900 placeholder-red-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="이메일을 입력하세요"
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                비밀번호
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10 ${
                    errors.password
                      ? 'border-red-300 text-red-900 placeholder-red-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="비밀번호를 입력하세요"
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
                {/* 비밀번호 요구사항 한 줄 표시 */}
                <p className="mt-1 text-xs text-gray-500">
                  8자 이상, 대문자·소문자·숫자·특수문자 포함
                </p>
              </div>
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                비밀번호 확인
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10 ${
                    errors.confirmPassword
                      ? 'border-red-300 text-red-900 placeholder-red-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="비밀번호를 다시 입력하세요"
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

            {/* 휴대폰 번호 입력 */}
            <div>
              <label
                htmlFor="phoneNumber"
                className="block text-sm font-medium text-gray-700"
              >
                휴대폰 번호
              </label>
              <div className="mt-1">
                <input
                  {...register('phoneNumber')}
                  type="tel"
                  autoComplete="tel"
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.phoneNumber
                      ? 'border-red-300 text-red-900 placeholder-red-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="01012345678"
                  onChange={e => {
                    // 숫자만 입력되도록 처리
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (value.length <= 11) {
                      e.target.value = value;
                      // react-hook-form에 값 업데이트
                      setValue('phoneNumber', value);
                    }
                  }}
                />
                {errors.phoneNumber && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.phoneNumber.message}
                  </p>
                )}
                {errors.isPhoneVerified && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.isPhoneVerified.message}
                  </p>
                )}

                {/* 휴대폰 번호 형식 안내 */}
                <p className="mt-1 text-xs text-gray-500">
                  010으로 시작하는 11자리 숫자를 입력해주세요
                </p>
              </div>

              {/* PASS 본인인증 컴포넌트 */}
              <div className="mt-3">
                <PhoneVerification
                  phoneNumber={watch('phoneNumber') || ''}
                  onVerificationComplete={handlePhoneVerification}
                  onVerificationFailed={handlePhoneVerificationFailed}
                  disabled={
                    !watch('phoneNumber') ||
                    !/^010\d{8}$/.test(watch('phoneNumber'))
                  }
                />
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
                    className={`flex-1 px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-50 ${
                      errors.postalCode
                        ? 'border-red-300 text-red-900'
                        : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={openAddressModal}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-50 ${
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
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
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

              {/* 주소 안내 */}
              <p className="text-xs text-gray-500">
                우편번호 검색 버튼을 클릭하여 주소를 선택해주세요
              </p>
            </div>

            {/* 이용약관 동의 */}
            <div className="flex items-center">
              <input
                {...register('agreeToTerms')}
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="agreeToTerms"
                className="ml-2 block text-sm text-gray-900"
              >
                <span>이용약관</span> 및 <span>개인정보처리방침</span>에
                동의합니다
              </label>
            </div>
            {errors.agreeToTerms && (
              <p className="text-sm text-red-600">
                {errors.agreeToTerms.message}
              </p>
            )}

            {/* 전체 에러 메시지 */}
            {errors.root && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{errors.root.message}</p>
              </div>
            )}

            {/* 회원가입 버튼 */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting || isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    회원가입 중...
                  </>
                ) : (
                  '회원가입'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 주소 검색 모달 */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={closeAddressModal}
        onAddressSelect={handleAddressSelect}
      />
    </div>
  );
};

export default RegisterPage;
