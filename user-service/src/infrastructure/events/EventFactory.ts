// Simple Event Factory for User Service
import { v4 as uuidv4 } from 'uuid';
import { BaseEvent, UserRegisteredEvent } from './types';

export class EventFactory {
  private serviceName: string;
  private version: string;

  constructor(serviceName: string = 'user-service', version: string = '1.0.0') {
    this.serviceName = serviceName;
    this.version = version;
  }

  createUserRegisteredEvent(userId: string, data: {
    email: string;
    name: string;
    role?: string;
    isActive?: boolean;
    registrationSource?: string;
  }): UserRegisteredEvent {
    const eventId = uuidv4();
    return {
      id: eventId,
      eventId: eventId,
      type: 'UserRegistered',
      timestamp: new Date().toISOString(),
      version: this.version,
      serviceName: this.serviceName,
      data: {
        userId,
        email: data.email,
        name: data.name,
        registrationTime: new Date().toISOString()
      }
    };
  }

  private createBaseEvent(type: string, data: any): BaseEvent {
    return {
      id: uuidv4(),
      type,
      timestamp: new Date().toISOString(),
      version: this.version,
      serviceName: this.serviceName,
      data
    };
  }
}