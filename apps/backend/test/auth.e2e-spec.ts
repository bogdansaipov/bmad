import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus } from '@prisma/client';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await prisma.customerProfile.deleteMany({
      where: { user: { email: { contains: 'e2e-register' } } },
    });
    await prisma.handymanProfile.deleteMany({
      where: { user: { email: { contains: 'e2e-register' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'e2e-register' } },
    });

    await prisma.customerProfile.deleteMany({
      where: { user: { email: { contains: 'e2e-login' } } },
    });
    await prisma.handymanProfile.deleteMany({
      where: { user: { email: { contains: 'e2e-login' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'e2e-login' } },
    });

    await app.close();
  });

  describe('POST /auth/register', () => {
    it('valid payload → 201 + userId, email, role, accessToken', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'customer@e2e-register.test',
          password: 'strongpassword1',
          role: 'CUSTOMER',
          displayName: 'E2E Customer',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        userId: expect.any(String),
        email: 'customer@e2e-register.test',
        role: 'CUSTOMER',
        accessToken: expect.any(String),
      });
    });

    it('valid handyman payload → 201 + HANDYMAN role', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'handyman@e2e-register.test',
          password: 'strongpassword1',
          role: 'HANDYMAN',
          displayName: 'E2E Handyman',
        })
        .expect(201);

      expect(response.body.role).toBe('HANDYMAN');
    });

    it('duplicate email → 409', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'duplicate@e2e-register.test',
          password: 'strongpassword1',
          role: 'CUSTOMER',
          displayName: 'First User',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'duplicate@e2e-register.test',
          password: 'anotherpassword1',
          role: 'HANDYMAN',
          displayName: 'Second User',
        })
        .expect(409);
    });

    it('missing fields → 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'incomplete@e2e-register.test' })
        .expect(400);
    });

    it('invalid email → 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'strongpassword1',
          role: 'CUSTOMER',
          displayName: 'User',
        })
        .expect(400);
    });

    it('weak password (< 8 chars) → 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'weakpass@e2e-register.test',
          password: 'short',
          role: 'CUSTOMER',
          displayName: 'User',
        })
        .expect(400);
    });

    it('invalid role → 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'badrole@e2e-register.test',
          password: 'strongpassword1',
          role: 'ADMIN',
          displayName: 'User',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    let customerToken: string;
    let handymanToken: string;

    beforeAll(async () => {
      // Register fixtures
      const custRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'customer@e2e-login.test',
          password: 'strongpassword1',
          role: 'CUSTOMER',
          displayName: 'Login Customer',
        });
      expect(custRes.status).toBe(201);
      customerToken = custRes.body.accessToken as string;

      const handyRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'handyman@e2e-login.test',
          password: 'strongpassword1',
          role: 'HANDYMAN',
          displayName: 'Login Handyman',
        });
      expect(handyRes.status).toBe(201);
      handymanToken = handyRes.body.accessToken as string;
    });

    it('valid customer credentials → 200 + userId, email, role CUSTOMER, accessToken', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'customer@e2e-login.test', password: 'strongpassword1' })
        .expect(200);

      expect(response.body).toMatchObject({
        userId: expect.any(String),
        email: 'customer@e2e-login.test',
        role: 'CUSTOMER',
        accessToken: expect.any(String),
      });
    });

    it('valid handyman credentials → 200 + role HANDYMAN', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'handyman@e2e-login.test', password: 'strongpassword1' })
        .expect(200);

      expect(response.body.role).toBe('HANDYMAN');
    });

    it('wrong password → 401 with generic message', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'customer@e2e-login.test', password: 'wrongpassword' })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });

    it('unknown email → 401 with same generic message', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@e2e-login.test', password: 'strongpassword1' })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });

    it('missing / invalid fields → 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'customer@e2e-login.test' })
        .expect(400);
    });

    it('suspended account → 401 with generic message', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'suspended@e2e-login.test',
          password: 'strongpassword1',
          role: 'CUSTOMER',
          displayName: 'Suspended User',
        });
      expect(res.status).toBe(201);

      await prisma.user.update({
        where: { email: 'suspended@e2e-login.test' },
        data: { account_status: AccountStatus.SUSPENDED },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'suspended@e2e-login.test', password: 'strongpassword1' })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });

    describe('GET /auth/me', () => {
      it('missing Authorization header → 401', async () => {
        await request(app.getHttpServer()).get('/auth/me').expect(401);
      });

      it('valid bearer JWT → 200 + { userId, email, role }', async () => {
        const response = await request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          userId: expect.any(String),
          email: 'customer@e2e-login.test',
          role: 'CUSTOMER',
        });
      });

      it('tampered JWT → 401', async () => {
        const tampered = customerToken.slice(0, -3) + 'xxx';
        await request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${tampered}`)
          .expect(401);
      });

      it('expired JWT → 401', async () => {
        const jwtService = app.get(JwtService);
        const expiredToken = jwtService.sign(
          { sub: 'test-id', email: 'test@example.com', role: 'CUSTOMER' },
          { expiresIn: '-1s' },
        );
        await request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);
      });
    });

    describe('GET /auth/customer-only and /auth/handyman-only', () => {
      it('customer token on customer endpoint → 200', async () => {
        await request(app.getHttpServer())
          .get('/auth/customer-only')
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(200);
      });

      it('customer token on handyman endpoint → 403', async () => {
        await request(app.getHttpServer())
          .get('/auth/handyman-only')
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(403);
      });

      it('handyman token on customer endpoint → 403', async () => {
        await request(app.getHttpServer())
          .get('/auth/customer-only')
          .set('Authorization', `Bearer ${handymanToken}`)
          .expect(403);
      });

      it('handyman token on handyman endpoint → 200', async () => {
        await request(app.getHttpServer())
          .get('/auth/handyman-only')
          .set('Authorization', `Bearer ${handymanToken}`)
          .expect(200);
      });

      it('missing token on customer endpoint → 401', async () => {
        await request(app.getHttpServer()).get('/auth/customer-only').expect(401);
      });

      it('missing token on handyman endpoint → 401', async () => {
        await request(app.getHttpServer()).get('/auth/handyman-only').expect(401);
      });
    });
  });
});
