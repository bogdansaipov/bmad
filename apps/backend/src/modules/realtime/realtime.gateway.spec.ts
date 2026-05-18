import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RealtimeGateway } from './realtime.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { Socket } from 'socket.io';

type AuthSocket = Socket & { userId?: string; role?: string };

function makeSocket(overrides: Partial<Socket> = {}): AuthSocket {
  return {
    handshake: { auth: {}, query: {} },
    disconnect: jest.fn(),
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as AuthSocket;
}

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let jwtService: { verify: jest.Mock };
  let prismaService: { serviceRequest: { findUnique: jest.Mock } };

  beforeEach(async () => {
    jwtService = { verify: jest.fn() };
    prismaService = { serviceRequest: { findUnique: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-secret') } },
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    gateway = module.get<RealtimeGateway>(RealtimeGateway);
  });

  describe('handleConnection', () => {
    it('disconnects when no token provided', async () => {
      const client = makeSocket();
      await gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('disconnects when JWT verification fails', async () => {
      const client = makeSocket({ handshake: { auth: { token: 'bad-token' }, query: {} } as unknown } as unknown as Partial<Socket>);
      jwtService.verify.mockImplementation(() => { throw new Error('invalid'); });
      await gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('attaches userId and role when token is valid', async () => {
      const client = makeSocket({ handshake: { auth: { token: 'good-token' }, query: {} } as unknown } as unknown as Partial<Socket>);
      jwtService.verify.mockReturnValue({ sub: 'user-1', role: 'CUSTOMER' });
      await gateway.handleConnection(client);
      expect(client.disconnect).not.toHaveBeenCalled();
      expect((client as AuthSocket).userId).toBe('user-1');
      expect((client as AuthSocket).role).toBe('CUSTOMER');
    });

    it('reads token from query param as fallback', async () => {
      const client = makeSocket({ handshake: { auth: {}, query: { token: 'query-token' } } as unknown } as unknown as Partial<Socket>);
      jwtService.verify.mockReturnValue({ sub: 'user-2', role: 'HANDYMAN' });
      await gateway.handleConnection(client);
      expect((client as AuthSocket).userId).toBe('user-2');
    });
  });

  describe('handleJoinRoom', () => {
    it('joins room when customer owns the request', async () => {
      const client = makeSocket() as AuthSocket;
      client.userId = 'cust-1';
      client.role = 'CUSTOMER';
      prismaService.serviceRequest.findUnique.mockResolvedValue({
        customerId: 'cust-1',
        assignedHandymanId: null,
      });

      await gateway.handleJoinRoom(client as Socket, { requestId: 'req-1' });

      expect(client.join).toHaveBeenCalledWith('request-req-1');
    });

    it('joins room when handyman is assigned', async () => {
      const client = makeSocket() as AuthSocket;
      client.userId = 'hm-1';
      client.role = 'HANDYMAN';
      prismaService.serviceRequest.findUnique.mockResolvedValue({
        customerId: 'cust-1',
        assignedHandymanId: 'hm-1',
      });

      await gateway.handleJoinRoom(client as Socket, { requestId: 'req-1' });

      expect(client.join).toHaveBeenCalledWith('request-req-1');
    });

    it('does not join room when handyman is not assigned to request', async () => {
      const client = makeSocket() as AuthSocket;
      client.userId = 'hm-other';
      client.role = 'HANDYMAN';
      prismaService.serviceRequest.findUnique.mockResolvedValue({
        customerId: 'cust-1',
        assignedHandymanId: 'hm-1',
      });

      await gateway.handleJoinRoom(client as Socket, { requestId: 'req-1' });

      expect(client.join).not.toHaveBeenCalled();
    });

    it('does not join when userId is missing', async () => {
      const client = makeSocket() as AuthSocket;
      await gateway.handleJoinRoom(client as Socket, { requestId: 'req-1' });
      expect(client.join).not.toHaveBeenCalled();
    });

    it('does not join when request does not exist', async () => {
      const client = makeSocket() as AuthSocket;
      client.userId = 'cust-1';
      client.role = 'CUSTOMER';
      prismaService.serviceRequest.findUnique.mockResolvedValue(null);

      await gateway.handleJoinRoom(client as Socket, { requestId: 'req-missing' });

      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe('handleLeaveRoom', () => {
    it('leaves room when requestId provided', async () => {
      const client = makeSocket();
      await gateway.handleLeaveRoom(client as Socket, { requestId: 'req-1' });
      expect(client.leave).toHaveBeenCalledWith('request-req-1');
    });

    it('does nothing when data has no requestId', async () => {
      const client = makeSocket();
      await gateway.handleLeaveRoom(client as Socket, { requestId: '' });
      expect(client.leave).not.toHaveBeenCalled();
    });
  });
});
