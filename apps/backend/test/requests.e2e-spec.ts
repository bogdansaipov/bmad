import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('RequestsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customerToken: string;
  let handymanToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    const custRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'e2e-requests-customer@example.com',
        password: 'strongpassword1',
        role: 'CUSTOMER',
        displayName: 'E2E Requests Customer',
      });
    expect(custRes.status).toBe(201);
    customerToken = custRes.body.accessToken as string;

    const handyRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'e2e-requests-handyman@example.com',
        password: 'strongpassword1',
        role: 'HANDYMAN',
        displayName: 'E2E Requests Handyman',
      });
    expect(handyRes.status).toBe(201);
    handymanToken = handyRes.body.accessToken as string;
  });

  const fixtureEmails = [
    'e2e-requests-customer@example.com',
    'e2e-requests-handyman@example.com',
  ];

  afterAll(async () => {
    await prisma.serviceRequest.deleteMany({
      where: { customer: { email: { in: fixtureEmails } } },
    });
    await prisma.customerProfile.deleteMany({
      where: { user: { email: { in: fixtureEmails } } },
    });
    await prisma.handymanProfile.deleteMany({
      where: { user: { email: { in: fixtureEmails } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: fixtureEmails } },
    });

    await app.close();
  });

  describe('GET /requests', () => {
    it('no Authorization header → 401', async () => {
      await request(app.getHttpServer()).get('/requests').expect(401);
    });

    it('HANDYMAN bearer token → 403', async () => {
      await request(app.getHttpServer())
        .get('/requests')
        .set('Authorization', `Bearer ${handymanToken}`)
        .expect(403);
    });

    it('CUSTOMER bearer token → 200 with { items: [] }', async () => {
      const response = await request(app.getHttpServer())
        .get('/requests')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toEqual({ items: [] });
    });
  });
});
