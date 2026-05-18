import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeService } from './realtime.service';
import { RealtimeGateway } from './realtime.gateway';

describe('RealtimeService', () => {
  let service: RealtimeService;
  let toFn: jest.Mock;
  let emitFn: jest.Mock;

  beforeEach(async () => {
    emitFn = jest.fn();
    toFn = jest.fn().mockReturnValue({ emit: emitFn });

    const gatewayMock = {
      server: { to: toFn },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeService,
        { provide: RealtimeGateway, useValue: gatewayMock },
      ],
    }).compile();

    service = module.get<RealtimeService>(RealtimeService);
  });

  describe('emitStatusUpdate', () => {
    it('emits to the correct room with requestId and status', () => {
      service.emitStatusUpdate('req-1', 'ON_THE_WAY');

      expect(toFn).toHaveBeenCalledWith('request-req-1');
      expect(emitFn).toHaveBeenCalledWith('request.status.updated', {
        requestId: 'req-1',
        status: 'ON_THE_WAY',
      });
    });

    it('emits COMPLETE status to the correct room', () => {
      service.emitStatusUpdate('req-2', 'COMPLETE');

      expect(toFn).toHaveBeenCalledWith('request-req-2');
      expect(emitFn).toHaveBeenCalledWith('request.status.updated', {
        requestId: 'req-2',
        status: 'COMPLETE',
      });
    });
  });
});
