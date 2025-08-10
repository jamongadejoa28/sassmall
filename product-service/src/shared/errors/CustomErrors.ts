// Custom Errors
export class DatabaseConnectionError extends Error {
  constructor(message: string = 'Database connection failed') {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string = 'Configuration error') {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string = 'Database error') {
    super(message);
    this.name = 'DatabaseError';
  }
}