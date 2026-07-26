import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function RoleGuard({ requiredPermissions = [], children }) {
  const userPermissions = useAuthStore((s) => s.user?.permissions) || [];

  if (requiredPermissions.length === 0) return children;

  const hasAccess = requiredPermissions.some(p => userPermissions.includes(p));

  if (!hasAccess) {
    if (import.meta.env.DEV) {
      console.warn(
        `[RoleGuard] Missing permissions: ${requiredPermissions.join(' | ')}. ` +
        `User has: [${userPermissions.join(', ')}]. Redirecting to /access-denied.`
      );
    }
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}
