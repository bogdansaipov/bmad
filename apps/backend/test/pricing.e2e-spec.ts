import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('PricingController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customerToken: string;
  let handymanToken: string;
  const validCategoryId = '3b5144da-c652-4c14-8a16-aa5bc4bc2f36';

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

    const customerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'e2e-pricing-customer@example.com',
        password: 'strongpassword1',
        role: 'CUSTOMER',
        displayName: 'E2E Pricing Customer',
      });
    expect(customerRes.status).toBe(201);
    customerToken = customerRes.body.accessToken as string;

    const handymanRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'e2e-pricing-handyman@example.com',
        password: 'strongpassword1',
        role: 'HANDYMAN',
        displayName: 'E2E Pricing Handyman',
      });
    expect(handymanRes.status).toBe(201);
    handymanToken = handymanRes.body.accessToken as string;
  });

  afterAll(async () => {
    const fixtureEmails = [
      'e2e-pricing-customer@example.com',
      'e2e-pricing-handyman@example.com',
    ];

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

  it('GET /pricing/estimate with customer token → 200', async () => {
    const response = await request(app.getHttpServer())
      .get('/pricing/estimate')
      .query({ categoryId: validCategoryId })
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(response.body).toEqual({
      categoryId: validCategoryId,
      baseFee: 30,
      categoryFee: 20,
      partsAllowance: 15,
      estimatedTotal: 65,
      disclaimer: 'This is an estimate. Final charges may vary based on actual work and materials.',
    });
  });

  it('GET /pricing/estimate with handyman token → 403', async () => {
    await request(app.getHttpServer())
      .get('/pricing/estimate')
      .query({ categoryId: validCategoryId })
      .set('Authorization', `Bearer ${handymanToken}`)
      .expect(403);
  });

  it('GET /pricing/estimate missing categoryId → 400', async () => {
    await request(app.getHttpServer())
      .get('/pricing/estimate')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(400);
  });
});
