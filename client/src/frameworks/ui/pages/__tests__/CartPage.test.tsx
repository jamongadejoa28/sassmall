import { CartProduct } from '@/types/cart-type/CartProduct';
import { OrderApiAdapter } from '@adapters/api/OrderApiAdapter';
import { useAuthStore } from '@frameworks/state/authStore';
import { useCartLocalStore } from '@frameworks/state/cartStoreLocal'; // CartState 정의가 이 파일에 있을 가능성이 높습니다.
import { ROUTES } from '@shared/constants/routes';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CartPage from '../CartPage';

jest.mock('@adapters/api/OrderApiAdapter');

const mockProduct: CartProduct = {
  id: 'prod-1',
  name: 'Test Product',
  description: '테스트 상품입니다.',
  price: 100,
  brand: 'Test Brand',
  sku: 'SKU123',
  category: {
    id: 'cat-1',
    name: 'Test Category',
    slug: 'test-category',
  },
  inventory: {
    availableQuantity: 10,
    status: 'in_stock',
    location: 'MAIN_WAREHOUSE',
  },
  rating: 4.5,
  review_count: 128,
  is_featured: true,
  min_order_quantity: 1,
  max_order_quantity: 10,
  tags: ['test'],
  image_urls: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const setup = (isLoggedIn: boolean) => {
  // CartState의 모든 필수 속성을 포함하도록 수정
  useCartLocalStore.setState(
    {
      items: [
        {
          product: mockProduct,
          quantity: 1,
          addedAt: new Date(),
        },
      ],
      addItem: jest.fn(),
      removeItem: jest.fn(),
      updateQuantity: jest.fn(),
      clearCart: jest.fn(),
      getTotalQuantity: () => 1,
      getTotalPrice: () => 100,
      getItemCount: () => 1,
      isEmpty: () => false,
      getItem: () => undefined,
      hasItem: () => true,
      getItemQuantity: () => 1,
      error: null,

      // --- 여기에 누락된 속성들을 추가합니다 ---
      loading: false, // `loading` 속성 추가
      loadCart: jest.fn(), // `loadCart` 함수 추가
      removeSelectedItems: jest.fn(), // `removeSelectedItems` 함수 추가
      syncProductInfo: jest.fn(), // `syncProductInfo` 함수 추가
      // --- CartState에 정의된 다른 속성들이 있다면 모두 추가해야 합니다 ---
    },
    true // 전체 상태를 교체하는 것이므로 true 유지
  );

  useAuthStore.setState(
    {
      isAuthenticated: isLoggedIn,
      user: isLoggedIn
        ? {
            id: 'user-123',
            name: 'Test User',
            email: 'test@test.com',
            role: 'USER',
            isEmailVerified: true,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : null,
    } as any // 타입 충돌 해결을 위한 임시 캐스팅 (이 부분도 가능하면 정확한 타입으로 개선하는 것이 좋습니다)
  );

  render(
    <MemoryRouter initialEntries={[ROUTES.CART]}>
      <Routes>
        <Route path={ROUTES.CART} element={<CartPage />} />
        <Route path={ROUTES.LOGIN} element={<div>로그인 페이지</div>} />
        <Route path={ROUTES.ORDERS} element={<div>주문 내역 페이지</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('CartPage', () => {
  const mockCreateOrder = jest.fn().mockResolvedValue({ id: 'order-123' });

  beforeEach(() => {
    jest.clearAllMocks();
    (OrderApiAdapter as jest.Mock).mockImplementation(() => ({
      createOrder: mockCreateOrder,
    }));
  });

  test('비로그인 상태에서 "구매하기" 버튼을 클릭하면 로그인 페이지로 이동해야 한다.', () => {
    setup(false);
    fireEvent.click(screen.getByRole('button', { name: /구매하기/i }));
    expect(screen.getByText('로그인 페이지')).toBeInTheDocument();
  });

  test('로그인 상태에서 "구매하기" 버튼을 클릭하면 주문을 생성한다.', async () => {
    setup(true);
    fireEvent.click(screen.getByRole('button', { name: /구매하기/i }));

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledWith({
        items: [{ productId: 'prod-1', quantity: 1 }],
        shippingAddress: 'temp address',
        paymentMethod: 'credit_card',
      });
    });
  });
});
