export interface LoginCredentials {
  email: string;
  password: string;
}

export interface IUserRepository {
  login(credentials: LoginCredentials): Promise<any>;
  register(userData: any): Promise<any>;
  findById(id: string): Promise<any>;
  updateProfile(id: string, data: any): Promise<any>;
  deleteAccount(id: string): Promise<void>;
}
