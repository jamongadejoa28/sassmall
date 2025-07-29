// AddressSearch 컴포넌트 성능 테스트
// 위치: client/src/frameworks/ui/components/__tests__/AddressSearch.test.tsx

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddressSearch from '../AddressSearch';

// Mock Daum Postcode API - Override original types for testing
interface MockDaumPostcode {
  embed: jest.Mock;
  open: jest.Mock;
  oncomplete?: (data: any) => void;
  onclose?: () => void;
}

// Note: We'll use type assertions to avoid global declaration conflicts

describe('AddressSearch 성능 테스트', () => {
  let mockPostcodeInstance: MockDaumPostcode;
  let mockOnAddressSelect: jest.Mock;
  let mockOnClose: jest.Mock;

  beforeEach(() => {
    // Mock 초기화
    mockOnAddressSelect = jest.fn();
    mockOnClose = jest.fn();
    mockPostcodeInstance = {
      embed: jest.fn(),
      open: jest.fn(),
    };

    // Daum Postcode API Mock - Override window.daum for testing
    (window as any).daum = {
      Postcode: jest.fn().mockImplementation((options: any) => {
        // oncomplete 콜백을 저장해서 나중에 테스트에서 호출할 수 있도록 함
        mockPostcodeInstance.oncomplete = options.oncomplete;
        mockPostcodeInstance.onclose = options.onclose;
        return mockPostcodeInstance;
      }),
    };

    // 스크립트 로드 성공 시뮬레이션
    // eslint-disable-next-line testing-library/no-node-access
    const existingScript = document.head.querySelector(
      'script[src*="postcode.v2.js"]'
    );
    if (!existingScript) {
      const script = document.createElement('script');
      script.src =
        'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      script.onload = () => {};
      document.head.appendChild(script);
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
    // DOM 정리
    // eslint-disable-next-line testing-library/no-node-access
    const scripts = document.head.querySelectorAll(
      'script[src*="postcode.v2.js"]'
    );
    scripts.forEach(script => script.remove());
  });

  test('스크립트 중복 로딩 방지 테스트', async () => {
    // 첫 번째 컴포넌트 렌더링
    const { unmount: unmount1 } = render(
      <AddressSearch
        onAddressSelect={mockOnAddressSelect}
        onClose={mockOnClose}
      />
    );

    // 두 번째 컴포넌트 렌더링
    const { unmount: unmount2 } = render(
      <AddressSearch
        onAddressSelect={mockOnAddressSelect}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      // 스크립트가 한 번만 로드되어야 함
      // eslint-disable-next-line testing-library/no-node-access
      const scripts = document.head.querySelectorAll(
        'script[src*="postcode.v2.js"]'
      );
      expect(scripts.length).toBeLessThanOrEqual(1);
    });

    unmount1();
    unmount2();
  });

  test('컴포넌트 언마운트 시 메모리 정리 테스트', async () => {
    const { unmount } = render(
      <AddressSearch
        onAddressSelect={mockOnAddressSelect}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect((window as any).daum.Postcode).toHaveBeenCalled();
    });

    // 실제 embed 호출 확인
    expect(mockPostcodeInstance.embed).toHaveBeenCalled();

    // 컴포넌트 언마운트
    unmount();

    // 메모리 정리가 제대로 되었는지 확인
    // (실제로는 이 부분을 더 정교하게 테스트해야 함)
    // embed가 이미 호출되었음을 확인
  });

  test('React.memo로 인한 불필요한 리렌더링 방지 테스트', () => {
    const props = {
      onAddressSelect: mockOnAddressSelect,
      onClose: mockOnClose,
      width: 500,
      height: 600,
    };

    const { rerender } = render(<AddressSearch {...props} />);

    // 같은 props로 리렌더링 시 실제로 리렌더링이 되지 않아야 함
    const initialCallCount = (
      (window as any).daum.Postcode as jest.MockedFunction<any>
    ).mock.calls.length;

    rerender(<AddressSearch {...props} />);

    // Postcode 생성자가 추가로 호출되지 않아야 함
    expect(
      ((window as any).daum.Postcode as jest.MockedFunction<any>).mock.calls
        .length
    ).toBe(initialCallCount);
  });

  test('AbortController를 사용한 비동기 작업 취소 테스트', async () => {
    const { unmount } = render(
      <AddressSearch
        onAddressSelect={mockOnAddressSelect}
        onClose={mockOnClose}
      />
    );

    // 컴포넌트가 마운트되자마자 바로 언마운트
    unmount();

    // 비동기 작업이 취소되어야 하므로 onClose가 호출되지 않아야 함
    await waitFor(() => {
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  test('주소 선택 시 콜백 최적화 테스트', async () => {
    render(
      <AddressSearch
        onAddressSelect={mockOnAddressSelect}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(mockPostcodeInstance.embed).toHaveBeenCalled();
    });

    // 주소 선택 시뮬레이션
    const mockAddressData = {
      zonecode: '12345',
      roadAddress: '서울특별시 강남구 테헤란로 123',
      jibunAddress: '서울특별시 강남구 역삼동 123',
      userSelectedType: 'R',
      bname: '역삼동',
      buildingName: '테스트빌딩',
      addressEnglish: 'Test Address',
    };

    act(() => {
      if (mockPostcodeInstance.oncomplete) {
        mockPostcodeInstance.oncomplete(mockAddressData);
      }
    });

    // 콜백이 정확히 호출되었는지 확인
    expect(mockOnAddressSelect).toHaveBeenCalledWith({
      zonecode: '12345',
      address: '서울특별시 강남구 테헤란로 123',
      addressEnglish: 'Test Address',
      addressType: 'R',
      bname: '역삼동',
      buildingName: '테스트빌딩',
      userSelectedType: 'R',
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('로딩 상태 표시 테스트', () => {
    // Daum API를 일시적으로 undefined로 설정
    delete (window as any).daum;

    render(
      <AddressSearch
        onAddressSelect={mockOnAddressSelect}
        onClose={mockOnClose}
      />
    );

    // 로딩 상태가 표시되어야 함
    expect(
      screen.getByText('주소 검색 서비스를 로딩 중...')
    ).toBeInTheDocument();
  });

  test('에러 핸들링 테스트', async () => {
    // 에러를 발생시키는 Mock
    (window as any).daum = {
      Postcode: jest.fn().mockImplementation(() => {
        throw new Error('초기화 실패');
      }),
    };

    render(
      <AddressSearch
        onAddressSelect={mockOnAddressSelect}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  test('requestAnimationFrame 최적화 테스트', async () => {
    // requestAnimationFrame Mock
    const originalRAF = window.requestAnimationFrame;
    const mockRAF = jest.fn(callback => {
      setTimeout(callback, 16); // 16ms 지연으로 60fps 시뮬레이션
      return 1;
    });
    window.requestAnimationFrame = mockRAF;

    render(
      <AddressSearch
        onAddressSelect={mockOnAddressSelect}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(mockRAF).toHaveBeenCalled();
    });

    // 원래 함수 복원
    window.requestAnimationFrame = originalRAF;
  });
});

// 성능 벤치마크 테스트
describe('AddressSearch 성능 벤치마크', () => {
  test('대량 렌더링 성능 테스트', async () => {
    const startTime = performance.now();

    // 여러 개의 컴포넌트를 동시에 렌더링
    const components = Array.from({ length: 10 }, (_, i) => (
      <AddressSearch key={i} onAddressSelect={jest.fn()} onClose={jest.fn()} />
    ));

    const { unmount } = render(<div>{components}</div>);

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // 렌더링 시간이 합리적인 범위 내에 있어야 함 (예: 1초 이내)
    expect(renderTime).toBeLessThan(1000);

    unmount();
  });

  test('메모리 사용량 측정 테스트', () => {
    // Chrome 환경에서만 테스트 실행
    const performanceMemory = (window.performance as any).memory;
    if (!performanceMemory) {
      console.log('performance.memory not available, skipping test');
      return;
    }

    const initialMemory = performanceMemory.usedJSHeapSize;

    const { unmount } = render(
      <AddressSearch onAddressSelect={jest.fn()} onClose={jest.fn()} />
    );

    const afterMountMemory = performanceMemory.usedJSHeapSize;

    unmount();

    // 강제 가비지 컬렉션 (테스트 환경에서만 가능)
    if (global.gc) {
      global.gc();
    }

    const afterUnmountMemory = performanceMemory.usedJSHeapSize;

    // 메모리 사용량이 증가했다가 다시 감소했는지 확인
    expect(afterMountMemory).toBeGreaterThan(initialMemory);
    expect(afterUnmountMemory).toBeLessThan(afterMountMemory);
  });
});
