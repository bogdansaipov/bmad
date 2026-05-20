import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: process.env['CORS_ORIGIN'],
    credentials: false,
  },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly joinRoomCounter = new Map<string, { count: number; windowStart: number }>();
  private readonly JOIN_ROOM_LIMIT = 20;
  private readonly JOIN_ROOM_WINDOW_MS = 10_000;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token =
      (client.handshake.auth as Record<string, string>)['token'] ??
      (client.handshake.query['token'] as string | undefined);

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify<{ sub: string; role: string }>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      (client as Socket & { userId?: string; role?: string }).userId = payload.sub;
      (client as Socket & { userId?: string; role?: string }).role = payload.role;
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = (client as Socket & { userId?: string }).userId;
    if (userId) this.joinRoomCounter.delete(userId);
  }

  private isJoinRoomRateLimited(userId: string): boolean {
    const now = Date.now();
    const entry = this.joinRoomCounter.get(userId);
    if (!entry || now - entry.windowStart > this.JOIN_ROOM_WINDOW_MS) {
      this.joinRoomCounter.set(userId, { count: 1, windowStart: now });
      return false;
    }
    entry.count += 1;
    return entry.count > this.JOIN_ROOM_LIMIT;
  }

  // Room key: 'request-${requestId}'. Future chat messages can be emitted on this same room without changing the room identity model.
  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { requestId: string },
  ): Promise<void> {
    const userId = (client as Socket & { userId?: string }).userId;
    const role = (client as Socket & { role?: string }).role;
    if (!userId || !role || !data?.requestId) return;
    if (this.isJoinRoomRateLimited(userId)) return;

    const authorized = await this.canAccessRoom(userId, role, data.requestId);
    if (!authorized) return;

    await client.join(`request-${data.requestId}`);
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { requestId: string },
  ): Promise<void> {
    if (data?.requestId) {
      await client.leave(`request-${data.requestId}`);
    }
  }

  private async canAccessRoom(userId: string, role: string, requestId: string): Promise<boolean> {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      select: { customerId: true, assignedHandymanId: true },
    });
    if (!request) return false;
    if (role === 'CUSTOMER') return request.customerId === userId;
    if (role === 'HANDYMAN') return request.assignedHandymanId === userId;
    return false;
  }
}
