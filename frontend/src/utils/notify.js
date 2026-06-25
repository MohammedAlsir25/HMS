import toast from 'react-hot-toast';

export function notifySuccess(message) {
  toast.success(message, { duration: 3000 });
}

export function notifyError(err) {
  const message = err?.response?.data?.message || err?.message || 'Something went wrong';
  toast.error(message, { duration: 5000 });
}
