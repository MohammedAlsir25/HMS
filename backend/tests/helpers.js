import request from 'supertest';
import app from '../src/app.js';

let cachedToken = null;
let cachedRefreshToken = null;

export async function getAuthToken() {
  if (cachedToken) return cachedToken;
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@aljawarih.sd', password: 'password123' });
  if (res.status === 200 && res.body.token) {
    cachedToken = res.body.token;
    cachedRefreshToken = res.body.refreshToken;
    return cachedToken;
  }
  return null;
}

export function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

export function makeId() {
  return crypto.randomUUID();
}

export async function getRefreshToken() {
  if (!cachedToken) await getAuthToken();
  return cachedRefreshToken;
}

export function resetTokenCache() {
  cachedToken = null;
  cachedRefreshToken = null;
}
