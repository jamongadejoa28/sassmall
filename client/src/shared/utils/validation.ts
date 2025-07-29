import * as yup from 'yup';

export const validationSchemas = {
  login: yup.object({
    email: yup
      .string()
      .email('유효한 이메일을 입력해주세요')
      .required('이메일은 필수입니다'),
    password: yup
      .string()
      .min(6, '비밀번호는 최소 6자 이상이어야 합니다')
      .required('비밀번호는 필수입니다'),
  }),

  register: yup.object({
    name: yup
      .string()
      .min(2, '이름은 최소 2자 이상이어야 합니다')
      .required('이름은 필수입니다'),
    email: yup
      .string()
      .email('유효한 이메일을 입력해주세요')
      .required('이메일은 필수입니다'),
    password: yup
      .string()
      .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        '비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다'
      )
      .required('비밀번호는 필수입니다'),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref('password')], '비밀번호가 일치하지 않습니다')
      .required('비밀번호 확인은 필수입니다'),
  }),

  address: yup.object({
    street: yup.string().required('주소는 필수입니다'),
    city: yup.string().required('도시는 필수입니다'),
    state: yup.string().required('주/도는 필수입니다'),
    zipCode: yup.string().required('우편번호는 필수입니다'),
    country: yup.string().required('국가는 필수입니다'),
  }),
};
