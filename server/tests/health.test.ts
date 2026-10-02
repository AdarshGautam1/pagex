import request from 'supertest';
import { app } from '../src/index';

describe('Health and General Endpoints', () => {
  it('GET /health returns 200 with service info', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('PAGEX API');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /non-existent-route returns 404', async () => {
    const res = await request(app).get('/unknown-api-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('not found');
  });
});
