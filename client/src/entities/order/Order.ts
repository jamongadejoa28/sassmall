import { Product } from '../product/Product';

export class OrderItem {
  constructor(
    public readonly id: string,
    public readonly productId: string,
    public readonly product: Product,
    public readonly quantity: number,
    public readonly price: number
  ) {}

  public getTotalPrice(): number {
    return this.quantity * this.price;
  }

  public getFormattedTotalPrice(): string {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(this.getTotalPrice());
  }
}

export class Order {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly items: OrderItem[],
    public readonly totalAmount: number,
    public readonly status: string,
    public readonly shippingAddress: any,
    public readonly paymentMethod: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  public getTotalQuantity(): number {
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }

  public getFormattedTotalAmount(): string {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(this.totalAmount);
  }

  public canBeCancelled(): boolean {
    return this.status === 'pending' || this.status === 'paid';
  }

  public isDelivered(): boolean {
    return this.status === 'delivered';
  }

  public static fromApiResponse(data: any): Order {
    const items = data.items.map(
      (item: any) =>
        new OrderItem(
          item.id,
          item.productId,
          Product.fromApiResponse(item.product),
          item.quantity,
          item.price
        )
    );

    return new Order(
      data.id,
      data.userId,
      items,
      data.totalAmount,
      data.status,
      data.shippingAddress,
      data.paymentMethod,
      data.createdAt ? new Date(data.createdAt) : undefined,
      data.updatedAt ? new Date(data.updatedAt) : undefined
    );
  }
}
