import request from 'supertest';
import app from '../app';

// 테스트 환경 설정
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.DB_NAME = 'test_shopping_mall';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.GEMINI_API_KEY = 'test-api-key';

describe('API Gateway', () => {
  describe('Health Check Endpoints', () => {
    it('GET /health - should return healthy status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: 'healthy',
          uptime: expect.any(Number),
          version: expect.any(String),
          environment: 'test',
        },
        message: 'API Gateway is healthy',
        timestamp: expect.any(String),
        requestId: expect.any(String),
      });
    });

    it('GET /health/live - should return alive status', async () => {
      const response = await request(app).get('/health/live').expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          alive: true,
          timestamp: expect.any(String),
          pid: expect.any(Number),
        },
        message: 'Service is alive',
      });
    });

    it('GET /health/ready - should return readiness status', async () => {
      const response = await request(app).get('/health/ready').expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          ready: true,
          checks: {
            memory: expect.any(Boolean),
            uptime: expect.any(Boolean),
            environment: expect.any(Boolean),
          },
        },
        message: 'Service is ready',
      });
    });
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/v1/auth/login', () => {
      it('should login with valid credentials', async () => {
        const loginData = {
          email: 'admin@example.com',
          password: 'admin123',
        };

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(loginData)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            user: {
              id: expect.any(String),
              email: 'admin@example.com',
              name: expect.any(String),
              role: expect.any(String),
            },
            tokens: {
              accessToken: expect.any(String),
              refreshToken: expect.any(String),
            },
          },
          message: '로그인 성공',
        });
      });

      it('should fail with invalid credentials', async () => {
        const loginData = {
          email: 'admin@example.com',
          password: 'wrongpassword',
        };

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(loginData)
          .expect(401);

        expect(response.body).toMatchObject({
          success: false,
          error: '이메일 또는 비밀번호가 올바르지 않습니다',
        });
      });

      it('should fail with missing email', async () => {
        const loginData = {
          password: 'admin123',
        };

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(loginData)
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: '입력 데이터가 올바르지 않습니다',
        });
      });

      it('should fail with invalid email format', async () => {
        const loginData = {
          email: 'invalid-email',
          password: 'admin123',
        };

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(loginData)
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: '입력 데이터가 올바르지 않습니다',
        });
      });
    });

    describe('POST /api/v1/auth/register', () => {
      it('should register with valid data', async () => {
        const registerData = {
          name: '테스트 사용자',
          email: `test-${Date.now()}@example.com`,
          password: 'TestPassword123',
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(registerData)
          .expect(201);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            user: {
              id: expect.any(String),
              email: registerData.email,
              name: registerData.name,
              role: 'customer',
            },
            tokens: {
              accessToken: expect.any(String),
              refreshToken: expect.any(String),
            },
          },
          message: '회원가입 성공',
        });
      });

      it('should fail with duplicate email', async () => {
        const registerData = {
          name: '테스트 사용자',
          email: 'admin@example.com', // 이미 존재하는 이메일
          password: 'TestPassword123',
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(registerData)
          .expect(409);

        expect(response.body).toMatchObject({
          success: false,
          error: '이미 존재하는 이메일입니다',
        });
      });

      it('should fail with weak password', async () => {
        const registerData = {
          name: '테스트 사용자',
          email: 'newuser@example.com',
          password: '123', // 너무 짧은 비밀번호
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(registerData)
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: '입력 데이터가 올바르지 않습니다',
        });
      });
    });

    describe('POST /api/v1/auth/refresh', () => {
      it('should refresh tokens with valid refresh token', async () => {
        // 먼저 로그인해서 토큰 획득
        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'admin@example.com',
            password: 'admin123',
          });

        const { refreshToken } = loginResponse.body.data.tokens;

        // 토큰 갱신 요청
        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          },
          message: '토큰 갱신 성공',
        });

        // 새 토큰이 이전 토큰과 다른지 확인
        expect(response.body.data.refreshToken).not.toBe(refreshToken);
      });

      it('should fail with invalid refresh token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: 'invalid-token' })
          .expect(401);

        expect(response.body).toMatchObject({
          success: false,
          error: '유효하지 않은 리프레시 토큰입니다',
        });
      });
    });

    describe('POST /api/v1/auth/logout', () => {
      it('should logout successfully', async () => {
        const response = await request(app)
          .post('/api/v1/auth/logout')
          .send({ refreshToken: 'some-token' })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: '로그아웃 성공',
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('경로를 찾을 수 없습니다'),
        requestId: expect.any(String),
      });
    });

    it('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app).get('/health').expect(200);

      // Helmet에 의해 추가되는 보안 헤더들 확인
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-download-options']).toBe('noopen');
    });

    it('should include request ID in response headers', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should allow normal request rate', async () => {
      // 여러 요청을 연속으로 보내서 정상 처리되는지 확인
      for (let i = 0; i < 5; i++) {
        await request(app).get('/health').expect(200);
      }
    });

    // 참고: 실제 rate limiting 테스트는 통합 테스트에서 수행
    // 단위 테스트에서는 너무 많은 요청을 보내지 않도록 주의
  });
});
