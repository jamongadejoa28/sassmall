import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../utils/api';

interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: () => Promise<void>;
  reset: () => void;
}

/**
 * API 호출을 위한 커스텀 Hook
 */
function useApi<T = any>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  payload?: any,
  options: UseApiOptions = {}
): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { immediate = false, onSuccess, onError } = options;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let response;
      switch (method) {
        case 'GET':
          response = await apiClient.get(url);
          break;
        case 'POST':
          response = await apiClient.post(url, payload);
          break;
        case 'PUT':
          response = await apiClient.put(url, payload);
          break;
        case 'DELETE':
          response = await apiClient.delete(url);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      setData(response.data);
      onSuccess?.(response.data);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'API 요청 중 오류가 발생했습니다.';
      setError(errorMessage);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [url, method, payload, onSuccess, onError]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [immediate, fetchData]);

  return {
    data,
    loading,
    error,
    execute: fetchData,
    reset,
  };
}

export default useApi;
