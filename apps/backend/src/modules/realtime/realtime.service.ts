import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  emitStatusUpdate(requestId: string, status: string): void {
    this.gateway.server.to(`request-${requestId}`).emit('request.status.updated', {
      requestId,
      status,
    });
    this.logger.log({ event: 'realtime.status.emitted', requestId, status });
  }
}
