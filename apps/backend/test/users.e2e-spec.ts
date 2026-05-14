import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('UsersController - handyman profile (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customerToken: string;
  let handymanToken: string;
  let plumbingId: string;
  let electricalId: string;
  let inactiveId: string;

  const fixtureEmails = [
    'e2e-users-customer@example.com',
    'e2e-users-handyman@example.com',
  ];

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
        email: 'e2e-users-customer@example.com',
        password: 'strongpassword1',
        role: 'CUSTOMER',
        displayName: 'E2E Users Customer',
      });
    expect(custRes.status).toBe(201);
    customerToken = custRes.body.accessToken as string;

    const handyRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'e2e-users-handyman@example.com',
        password: 'strongpassword1',
        role: 'HANDYMAN',
        displayName: 'E2E Users Handyman',
      });
    expect(handyRes.status).toBe(201);
    handymanToken = handyRes.body.accessToken as string;

    const plumbing = await prisma.serviceCategory.upsert({
      where: { name: 'Plumbing' },
      update: { isActive: true },
      create: { name: 'Plumbing', description: 'Pipes' },
    });
    plumbingId = plumbing.id;

    const electrical = await prisma.serviceCategory.upsert({
      where: { name: 'Electrical' },
      update: { isActive: true },
      create: { name: 'Electrical', description: 'Wires' },
    });
    electricalId = electrical.id;

    const inactive = await prisma.serviceCategory.create({
      data: {
        name: 'E2E Users Inactive Category',
        description: 'Inactive for tests',
        isActive: false,
      },
    });
    inactiveId = inactive.id;
  });

  afterAll(async () => {
    const profile = await prisma.handymanProfile.findFirst({
      where: { user: { email: 'e2e-users-handyman@example.com' } },
    });
    if (profile) {
      await prisma.handymanCategoryPreference.deleteMany({
        where: { handymanProfileId: profile.id },
      });
    }
    await prisma.serviceCategory.deleteMany({ where: { id: inactiveId } });
    await prisma.customerProfile.deleteMany({
      where: { user: { email: { in: fixtureEmails } } },
    });
    await prisma.handymanProfile.deleteMany({
      where: { user: { email: { in: fixtureEmails } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: fixtureEmails } } });

    await app.close();
  });

  describe('GET /users/me/handyman-profile', () => {
    it('no Authorization header → 401', async () => {
      await request(app.getHttpServer()).get('/users/me/handyman-profile').expect(401);
    });

    it('CUSTOMER token → 403', async () => {
      await request(app.getHttpServer())
        .get('/users/me/handyman-profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('HANDYMAN token → 200 with isProfileComplete=false on first load', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me/handyman-profile')
        .set('Authorization', `Bearer ${handymanToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        displayName: 'E2E Users Handyman',
        availabilityStatus: 'offline',
        serviceRadiusKm: null,
        categories: [],
        isProfileComplete: false,
      });
    });
  });

  describe('PUT /users/me/handyman-profile', () => {
    it('CUSTOMER token → 403', async () => {
      await request(app.getHttpServer())
        .put('/users/me/handyman-profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ serviceRadiusKm: 10, categoryIds: [plumbingId] })
        .expect(403);
    });

    it('rejects unknown category id with 400', async () => {
      await request(app.getHttpServer())
        .put('/users/me/handyman-profile')
        .set('Authorization', `Bearer ${handymanToken}`)
        .send({
          serviceRadiusKm: 10,
          categoryIds: ['11111111-1111-1111-1111-111111111111'],
        })
        .expect(400);
    });

    it('rejects inactive category with 400', async () => {
      await request(app.getHttpServer())
        .put('/users/me/handyman-profile')
        .set('Authorization', `Bearer ${handymanToken}`)
        .send({
          serviceRadiusKm: 10,
          categoryIds: [inactiveId],
        })
        .expect(400);
    });

    it('rejects radius below the allowed minimum with 400', async () => {
      await request(app.getHttpServer())
        .put('/users/me/handyman-profile')
        .set('Authorization', `Bearer ${handymanToken}`)
        .send({ serviceRadiusKm: 0, categoryIds: [plumbingId] })
        .expect(400);
    });

    it('saves and returns isProfileComplete=true after a valid update', async () => {
      const response = await request(app.getHttpServer())
        .put('/users/me/handyman-profile')
        .set('Authorization', `Bearer ${handymanToken}`)
        .send({
          serviceRadiusKm: 12.5,
          categoryIds: [plumbingId, electricalId],
        })
        .expect(200);

      expect(response.body.isProfileComplete).toBe(true);
      expect(response.body.serviceRadiusKm).toBe(12.5);
      const categoryNames = (response.body.categories as Array<{ categoryName: string }>).map(
        (c) => c.categoryName,
      );
      expect(categoryNames).toEqual(expect.arrayContaining(['Plumbing', 'Electrical']));
    });

    it('replaces previous preferences when called again', async () => {
      const response = await request(app.getHttpServer())
        .put('/users/me/handyman-profile')
        .set('Authorization', `Bearer ${handymanToken}`)
        .send({
          serviceRadiusKm: 20,
          categoryIds: [plumbingId],
        })
        .expect(200);

      expect(response.body.serviceRadiusKm).toBe(20);
      const categoryIds = (response.body.categories as Array<{ categoryId: string }>).map(
        (c) => c.categoryId,
      );
      expect(categoryIds).toEqual([plumbingId]);
    });
  });
});
