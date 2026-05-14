import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('RequestsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customerToken: string;
  let handymanToken: string;
  let categoryId: string;
  let handymanUserId: string;

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
    handymanUserId = handyRes.body.userId as string;

    const category = await prisma.serviceCategory.create({
      data: {
        name: 'E2E Requests Category',
        description: 'For request submission tests',
      },
    });
    categoryId = category.id;

    const handymanProfile = await prisma.handymanProfile.findUniqueOrThrow({
      where: { userId: handymanUserId },
      select: { id: true },
    });

    await prisma.$executeRaw(Prisma.sql`
      UPDATE handyman_profiles
      SET
        availability_status = 'ONLINE',
        service_radius_km = 20,
        base_lat = 41.2995,
        base_lng = 69.2401
      WHERE user_id = ${handymanUserId}
    `);
    await prisma.handymanCategoryPreference.create({
      data: {
        handymanProfileId: handymanProfile.id,
        categoryId,
      },
    });
  });

  const fixtureEmails = [
    'e2e-requests-customer@example.com',
    'e2e-requests-handyman@example.com',
  ];

  afterAll(async () => {
    await prisma.serviceRequest.deleteMany({
      where: { categoryId },
    });
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM job_offer_visibility
      WHERE handyman_id = ${handymanUserId}
    `);
    await prisma.serviceCategory.deleteMany({
      where: { id: categoryId },
    });
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

  describe('POST /requests', () => {
    it('no Authorization header → 401', async () => {
      await request(app.getHttpServer())
        .post('/requests')
        .send({ categoryId, title: 'Fix my sink' })
        .expect(401);
    });

    it('HANDYMAN bearer token → 403', async () => {
      await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', `Bearer ${handymanToken}`)
        .send({ categoryId, title: 'Fix my sink' })
        .expect(403);
    });

    it('CUSTOMER bearer token with valid body → 201', async () => {
      const response = await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          categoryId,
          title: 'Fix my sink',
          description: 'Cold tap keeps dripping',
          locationLat: 41.2995,
          locationLng: 69.2401,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        status: 'PENDING',
        estimatedTotal: 65,
        categoryName: 'E2E Requests Category',
      });
      expect(response.body.id).toEqual(expect.any(String));
      expect(response.body.createdAt).toEqual(expect.any(String));

      const offers = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id
        FROM job_offer_visibility
        WHERE request_id = ${response.body.id as string}
          AND handyman_id = ${handymanUserId}
      `);
      expect(offers).toHaveLength(1);
    });

    it('missing required title → 400', async () => {
      await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ categoryId })
        .expect(400);
    });

    it('invalid UUID for categoryId → 400', async () => {
      await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ categoryId: 'not-a-uuid', title: 'Fix my sink' })
        .expect(400);
    });
  });

  describe('GET /matching/job-offers/me', () => {
    it('HANDYMAN bearer token → 200 with visible offers after request creation', async () => {
      const requestResponse = await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          categoryId,
          title: 'Need sink repair',
          description: 'Bathroom sink has a steady leak.',
          locationLat: 41.2995,
          locationLng: 69.2401,
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/matching/job-offers/me')
        .set('Authorization', `Bearer ${handymanToken}`)
        .expect(200);

      expect(response.body.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            requestId: requestResponse.body.id,
            categoryName: 'E2E Requests Category',
            estimatedTotal: 65,
          }),
        ]),
      );
    });

    it('CUSTOMER bearer token → 403', async () => {
      await request(app.getHttpServer())
        .get('/matching/job-offers/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });
});
