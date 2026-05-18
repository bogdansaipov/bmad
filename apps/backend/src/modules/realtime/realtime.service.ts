import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  emitStatusUpdate(requestId: string, status: string): void {
    this.gateway.server.to(`request-${requestId}`).emit('request.status.updated', {
      requestId,
      status,
    });
  }
}
