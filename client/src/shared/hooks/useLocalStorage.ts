import { useState } from 'react';

type SetValue<T> = T | ((val: T) => T);

/**
 * localStorage를 사용하는 React Hook
 * 브라우저의 localStorage에 데이터를 저장하고 관리합니다.
 */
function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: SetValue<T>) => void] {
  // localStorage에서 값을 읽는 함수
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // 개발 환경에서만 에러 로깅
      if (process.env.NODE_ENV === 'development') {
        console.warn(`useLocalStorage - Error reading key "${key}":`, error);
      }
      return initialValue;
    }
  });

  // localStorage에 값을 저장하는 함수
  const setValue = (value: SetValue<T>) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // 개발 환경에서만 에러 로깅
      if (process.env.NODE_ENV === 'development') {
        console.warn(`useLocalStorage - Error setting key "${key}":`, error);
      }
    }
  };

  return [storedValue, setValue];
}

export default useLocalStorage;
