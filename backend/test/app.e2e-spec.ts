import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { Response } from 'supertest';
import { AppModule } from '../src/app.module';

describe('HRMS API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves health status', async () => {
    await request(app.getHttpServer()).get('/health').expect(200).expect((response: Response) => {
      expect(response.body.status).toBe('ok');
    });
  });
});
