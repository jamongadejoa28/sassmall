// Basic Event Types for User Service
export interface BaseEvent {
  id: string;
  type: string;
  timestamp: string;
  version: string;
  serviceName: string;
  data: any;
  eventId?: string; // Alias for id for backward compatibility
}

export interface UserRegisteredEvent extends BaseEvent {
  type: 'UserRegistered';
  data: {
    userId: string;
    email: string;
    name: string;
    registrationTime: string;
  };
}

export type DomainEvent = UserRegisteredEvent;