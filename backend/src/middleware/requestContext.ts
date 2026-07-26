import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  hospitalId: string | null;
  userId: string | null;
  role: string | null;
}

const als = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return als.getStore();
}

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return als.run(ctx, fn);
}

export function setHospitalId(hospitalId: string) {
  const store = als.getStore();
  if (store) store.hospitalId = hospitalId;
}

export function setUserId(userId: string) {
  const store = als.getStore();
  if (store) store.userId = userId;
}

export function setRole(role: string) {
  const store = als.getStore();
  if (store) store.role = role;
}
