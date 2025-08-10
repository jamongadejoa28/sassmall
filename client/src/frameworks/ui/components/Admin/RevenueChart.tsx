// ========================================
// Revenue Chart Component - 매출 추이 차트 컴포넌트
// Clean Architecture: Framework Layer
// src/frameworks/ui/components/Admin/RevenueChart.tsx
// ========================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { AdminApiAdapter } from '../../../../adapters/api/AdminApiAdapter';
import toast from 'react-hot-toast';

// Chart.js 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface RevenueChartData {
  labels: string[];
  revenues: number[];
  orders: number[];
  period: string;
  totalRevenue: number;
  totalOrders: number;
  averageRevenue: number;
  growthRate?: number;
}

/**
 * RevenueChart - 매출 추이 차트 컴포넌트
 *
 * 기능:
 * - 기간별 매출 추이 시각화
 * - 기간 선택 (최근 7일, 30일, 3개월, 6개월, 1년)
 * - 매출과 주문 수량 이중 축 차트
 * - 성장률 표시
 * - 반응형 디자인
 */
const RevenueChart: React.FC = () => {
  const [chartData, setChartData] = useState<RevenueChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<
    'week' | 'month' | '3months' | '6months' | 'year'
  >('week');

  const adminApiAdapter = useMemo(() => new AdminApiAdapter(), []);

  // 기간 옵션
  const periodOptions = [
    { value: 'week', label: '최근 7일' },
    { value: 'month', label: '최근 30일' },
    { value: '3months', label: '최근 3개월' },
    { value: '6months', label: '최근 6개월' },
    { value: 'year', label: '최근 1년' },
  ] as const;

  // 차트 데이터 로드
  const loadChartData = useCallback(
    async (period: typeof selectedPeriod) => {
      try {
        setLoading(true);
        setError(null);

        const data = await adminApiAdapter.getRevenueChart(period);
        setChartData(data);
      } catch (error: any) {
        console.error('매출 차트 데이터 로드 오류:', error);
        setError(error.message);
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    },
    [adminApiAdapter]
  );

  // 컴포넌트 마운트 및 기간 변경 시 데이터 로드
  useEffect(() => {
    loadChartData(selectedPeriod);
  }, [selectedPeriod, loadChartData]);

  // 기간 변경 핸들러
  const handlePeriodChange = (period: typeof selectedPeriod) => {
    setSelectedPeriod(period);
  };

  // 차트 설정
  const getChartConfig = () => {
    if (!chartData) return null;

    return {
      labels: chartData.labels,
      datasets: [
        {
          label: '매출 (원)',
          data: chartData.revenues,
          borderColor: 'rgb(139, 69, 19)', // 브라운 컬러
          backgroundColor: 'rgba(139, 69, 19, 0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y',
          pointBackgroundColor: 'rgb(139, 69, 19)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: '주문 수',
          data: chartData.orders,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          fill: false,
          tension: 0.4,
          yAxisID: 'y1',
          pointBackgroundColor: 'rgb(54, 162, 235)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            family:
              "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function (context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;

            if (label.includes('매출')) {
              return `${label}: ₩${value.toLocaleString()}`;
            } else {
              return `${label}: ${value.toLocaleString()}건`;
            }
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
            family:
              "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          },
          color: '#6B7280',
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: '매출 (원)',
          font: {
            size: 12,
            weight: 'bold' as const,
            family:
              "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          },
          color: '#374151',
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
            family:
              "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          },
          color: '#6B7280',
          callback: function (value: any) {
            return '₩' + Number(value).toLocaleString();
          },
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: '주문 수 (건)',
          font: {
            size: 12,
            weight: 'bold' as const,
            family:
              "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          },
          color: '#374151',
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          font: {
            size: 11,
            family:
              "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          },
          color: '#6B7280',
          callback: function (value: any) {
            return Number(value).toLocaleString() + '건';
          },
        },
      },
    },
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-500">매출 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="h-80 bg-red-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <svg
            className="w-12 h-12 text-red-400 mx-auto mb-4"
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
          <p className="text-red-800 font-medium mb-2">데이터 로드 실패</p>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={() => loadChartData(selectedPeriod)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 데이터 없음
  if (!chartData || chartData.labels.length === 0) {
    return (
      <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <svg
            className="w-12 h-12 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-gray-500">매출 데이터가 없습니다</p>
        </div>
      </div>
    );
  }

  const chartConfig = getChartConfig();
  if (!chartConfig) return null;

  return (
    <div className="space-y-4">
      {/* 헤더 및 기간 선택 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">매출 추이</h3>
          <p className="text-sm text-gray-600 mt-1">
            선택한 기간의 매출과 주문 현황을 확인할 수 있습니다
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {periodOptions.map(option => (
            <button
              key={option.value}
              onClick={() => handlePeriodChange(option.value)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedPeriod === option.value
                  ? 'bg-purple-100 text-purple-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 통계 요약 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">총 매출</p>
          <p className="text-xl font-bold text-gray-900">
            ₩{chartData.totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">총 주문</p>
          <p className="text-xl font-bold text-gray-900">
            {chartData.totalOrders.toLocaleString()}건
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">평균 주문액</p>
          <p className="text-xl font-bold text-gray-900">
            ₩{Math.round(chartData.averageRevenue).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">성장률</p>
          <p
            className={`text-xl font-bold ${
              (chartData.growthRate || 0) >= 0
                ? 'text-green-600'
                : 'text-red-600'
            }`}
          >
            {chartData.growthRate !== undefined
              ? `${chartData.growthRate > 0 ? '+' : ''}${chartData.growthRate.toFixed(1)}%`
              : 'N/A'}
          </p>
        </div>
      </div>

      {/* 차트 */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="h-80">
          <Line data={chartConfig} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

export default RevenueChart;
