export interface CartItem {
  productId: string;
  quantity: number;
  addedAt: string;
}

export class CartStorageAdapter {
  private readonly CART_KEY = 'shopping_cart';

  getCartItems(): CartItem[] {
    try {
      const cartData = localStorage.getItem(this.CART_KEY);
      return cartData ? JSON.parse(cartData) : [];
    } catch (error) {
      console.error('카트 데이터 로드 실패:', error);
      return [];
    }
  }

  addToCart(productId: string, quantity: number): void {
    const items = this.getCartItems();
    const existingIndex = items.findIndex(item => item.productId === productId);

    if (existingIndex >= 0) {
      items[existingIndex].quantity += quantity;
    } else {
      items.push({
        productId,
        quantity,
        addedAt: new Date().toISOString(),
      });
    }

    this.saveCartItems(items);
  }

  updateQuantity(productId: string, quantity: number): void {
    const items = this.getCartItems();
    const existingIndex = items.findIndex(item => item.productId === productId);

    if (existingIndex >= 0) {
      if (quantity <= 0) {
        items.splice(existingIndex, 1);
      } else {
        items[existingIndex].quantity = quantity;
      }
      this.saveCartItems(items);
    }
  }

  removeFromCart(productId: string): void {
    const items = this.getCartItems().filter(
      item => item.productId !== productId
    );
    this.saveCartItems(items);
  }

  clearCart(): void {
    localStorage.removeItem(this.CART_KEY);
  }

  getCartCount(): number {
    return this.getCartItems().reduce(
      (total, item) => total + item.quantity,
      0
    );
  }

  private saveCartItems(items: CartItem[]): void {
    try {
      localStorage.setItem(this.CART_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('카트 데이터 저장 실패:', error);
    }
  }
}
