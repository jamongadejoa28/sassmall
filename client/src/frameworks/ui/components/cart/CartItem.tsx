import React from 'react';

interface CartItemProps {
  item: {
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    availableQuantity: number;
    totalPrice: number;
  };
  onUpdateQuantity: (productId: string, quantity: number) => Promise<boolean>;
  onRemove: (productId: string) => Promise<boolean>;
  isLoading?: boolean;
}

export const CartItem: React.FC<CartItemProps> = ({
  item,
  onUpdateQuantity,
  onRemove,
  isLoading = false,
}) => {
  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 0) return;
    await onUpdateQuantity(item.productId, newQuantity);
  };

  const handleRemove = async () => {
    await onRemove(item.productId);
  };

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg mb-4">
      {/* 상품 정보 */}
      <div className="flex-1">
        <h3 className="font-semibold text-lg text-gray-900">
          {item.productName}
        </h3>
        <p className="text-gray-600">단가: {item.price.toLocaleString()}원</p>
        <p className="text-sm text-gray-500">
          재고: {item.availableQuantity}개
        </p>
      </div>

      {/* 수량 조절 */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => handleQuantityChange(item.quantity - 1)}
          disabled={isLoading || item.quantity <= 1}
          className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          -
        </button>

        <span className="px-4 py-2 border border-gray-300 rounded-md min-w-[60px] text-center">
          {item.quantity}
        </span>

        <button
          onClick={() => handleQuantityChange(item.quantity + 1)}
          disabled={isLoading || item.quantity >= item.availableQuantity}
          className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>

      {/* 총 가격 */}
      <div className="text-right ml-6">
        <p className="text-lg font-semibold text-gray-900">
          {item.totalPrice.toLocaleString()}원
        </p>
      </div>

      {/* 제거 버튼 */}
      <button
        onClick={handleRemove}
        disabled={isLoading}
        className="ml-4 px-3 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        제거
      </button>
    </div>
  );
};
