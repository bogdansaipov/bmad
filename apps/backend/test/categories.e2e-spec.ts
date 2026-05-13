import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('CategoriesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customerToken: string;

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
        email: 'e2e-cats-customer@example.com',
        password: 'strongpassword1',
        role: 'CUSTOMER',
        displayName: 'E2E Categories Customer',
      });
    expect(custRes.status).toBe(201);
    customerToken = custRes.body.accessToken as string;
  });

  afterAll(async () => {
    await prisma.customerProfile.deleteMany({
      where: { user: { email: 'e2e-cats-customer@example.com' } },
    });
    await prisma.user.deleteMany({
      where: { email: 'e2e-cats-customer@example.com' },
    });

    await app.close();
  });

  describe('GET /categories', () => {
    it('no Authorization header → 401', async () => {
      await request(app.getHttpServer()).get('/categories').expect(401);
    });

    it('valid customer token → 200 with { items: [...] } containing seeded categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBe(6);

      const names = response.body.items.map((c: { name: string }) => c.name);
      expect(names).toContain('Plumbing');
      expect(names).toContain('Electrical');
      expect(names).toContain('Carpentry');
      expect(names).toContain('Painting');
      expect(names).toContain('Cleaning');
      expect(names).toContain('HVAC');

      // Should be sorted alphabetically
      expect(names).toEqual([...names].sort());
    });
  });
});
