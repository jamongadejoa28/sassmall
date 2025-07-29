import { Order } from './Order';

export type CreateOrderItemData = {
  productId: string;
  quantity: number;
};

export type CreateOrderData = {
  items: CreateOrderItemData[];
  shippingAddress: string;
  paymentMethod: string;
};

export interface IOrderRepository {
  createOrder(data: CreateOrderData): Promise<Order>;
}
