export class Product {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly price: number,
    public readonly imageUrl: string,
    public readonly categoryId: string,
    public readonly stock: number,
    public readonly rating: number = 0,
    public readonly reviewCount: number = 0,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  public isInStock(): boolean {
    return this.stock > 0;
  }

  public isAvailableForQuantity(quantity: number): boolean {
    return this.stock >= quantity;
  }

  public getFormattedPrice(): string {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(this.price);
  }

  public getRatingStars(): string {
    return (
      '★'.repeat(Math.floor(this.rating)) +
      '☆'.repeat(5 - Math.floor(this.rating))
    );
  }

  public static fromApiResponse(data: any): Product {
    return new Product(
      data.id,
      data.name,
      data.description,
      data.price,
      data.imageUrl,
      data.categoryId,
      data.stock,
      data.rating,
      data.reviewCount,
      data.createdAt ? new Date(data.createdAt) : undefined,
      data.updatedAt ? new Date(data.updatedAt) : undefined
    );
  }
}
