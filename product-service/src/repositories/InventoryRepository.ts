import { Inventory } from "../entities/Inventory";

export interface InventoryRepository {
  findByProductId(productId: string): Promise<Inventory | null>;
  save(inventory: Inventory): Promise<Inventory>;
  findLowStock(threshold: number): Promise<Inventory[]>;
  findOutOfStock(): Promise<Inventory[]>;
}
