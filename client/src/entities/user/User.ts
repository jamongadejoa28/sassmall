export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string,
    public readonly role: string,
    public readonly avatar?: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  public isAdmin(): boolean {
    return this.role === 'admin';
  }

  public getDisplayName(): string {
    return this.name || this.email.split('@')[0];
  }

  public canManageProducts(): boolean {
    return this.isAdmin();
  }

  public static fromApiResponse(data: any): User {
    return new User(
      data.id,
      data.email,
      data.name,
      data.role,
      data.avatar,
      data.createdAt ? new Date(data.createdAt) : undefined,
      data.updatedAt ? new Date(data.updatedAt) : undefined
    );
  }
}
