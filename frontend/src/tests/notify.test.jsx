import { describe, it, expect, vi } from 'vitest';
import { notifySuccess, notifyError } from '../utils/notify';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('notifySuccess', () => {
  it('calls toast.success with message and duration 3000', async () => {
    const toast = (await import('react-hot-toast')).default;
    notifySuccess('Operation successful');
    expect(toast.success).toHaveBeenCalledWith('Operation successful', { duration: 3000 });
  });
});

describe('notifyError', () => {
  it('calls toast.error with err.response.data.message', async () => {
    const toast = (await import('react-hot-toast')).default;
    const err = { response: { data: { message: 'Email already taken' } } };
    notifyError(err);
    expect(toast.error).toHaveBeenCalledWith('Email already taken', { duration: 5000 });
  });

  it('falls back to err.message when no response', async () => {
    const toast = (await import('react-hot-toast')).default;
    const err = new Error('Network failure');
    notifyError(err);
    expect(toast.error).toHaveBeenCalledWith('Network failure', { duration: 5000 });
  });

  it('falls back to default message when nothing is available', async () => {
    const toast = (await import('react-hot-toast')).default;
    notifyError({});
    expect(toast.error).toHaveBeenCalledWith('Something went wrong', { duration: 5000 });
  });

  it('prioritizes response message over err.message', async () => {
    const toast = (await import('react-hot-toast')).default;
    const err = { response: { data: { message: 'From server' } }, message: 'Local error' };
    notifyError(err);
    expect(toast.error).toHaveBeenCalledWith('From server', { duration: 5000 });
  });
});
