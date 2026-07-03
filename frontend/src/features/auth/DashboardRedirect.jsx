import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { getClinicRoute } from '../../app/router';

const ROLE_ROUTES = {
  'Receptionist': '/reception',
  'Pharmacist': '/pharmacy',
  'Optician': '/optics',
  'Accountant': '/accounting',
  'CFO': '/accounting',
  'CEO': '/accounting',
  'HR Manager': '/hr',
  'Lab Technician': '/lab',
  'Lab Admin': '/lab',
  'Inventory Manager': '/inventory',
  'Procurement Manager': '/procurement',
};

const navItems = [
  { label: 'Reception', link: '/reception', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M16 2v6h6 M9 15l2 2 4-4' },
  { label: 'Waiting Room', link: '/waiting-room', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { label: 'Medicine', link: '/clinic/medicine', icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' },
  { label: 'ENT', link: '/clinic/ent', icon: 'M6 18C3.5 16 2 13 2 9c0-3 2-5 5-5s5 2 5 5c0 4-1.5 7-4 9 M12 22c3.5-7.5 7-10 10-10M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0' },
  { label: 'Dental', link: '/clinic/dental', icon: 'M12 6C8 6 4 7 4 11c0 4 2 7 4 9 1 1 2 1 4 1s3 0 4-1c2-2 4-5 4-9 0-4-4-5-8-5z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4' },
  { label: 'Retina', link: '/clinic/retina', icon: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6' },
  { label: 'Glaucoma', link: '/clinic/glaucoma', icon: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M18 6l4 4M22 6l-4 4' },
  { label: 'Orbit', link: '/clinic/orbit', icon: 'M12 2a10 10 0 1 0 10 10M12 2a10 10 0 0 1 10 10M12 2l10 10M12 22l10-10' },
  { label: 'Peds Ophth', link: '/clinic/pediatrics-ophth', icon: 'M12 2a10 10 0 1 0 10 10M12 2a10 10 0 0 1 10 10M12 2l10 10M12 22l10-10' },
  { label: 'Gen Ophth', link: '/clinic/general-ophth', icon: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M17 7l-5 5M12 12l-5 5' },
  { label: 'Optometry', link: '/clinic/optometry', icon: 'M10 2l-8 8 8 8M14 2l8 8-8 8M4 6l8-4 8 4M4 18l8 4 8-4' },
  { label: 'Surgery', link: '/surgery', icon: 'M8 8l8-8M8 8l-4-4M8 8L4 12M16 16l4-4M16 16l4 4M16 16l-8 8M6 18l6-6M18 6l-6 6' },
  { label: 'Referrals', link: '/referrals', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M16 2v6h6 M9 15h6M12 12v6' },
  { label: 'Laboratory', link: '/lab', icon: 'M8 2v6l-4 4v2h16v-2l-4-4V2M4 18h16M8 22h8M12 18v4M10 6h4' },
  { label: 'Pharmacy', link: '/pharmacy', icon: 'M7 21V7a5 5 0 0 1 10 0v14M4 21h16M7 7h10M12 7v14 M9 12h6 M9 16h6' },
  { label: 'Optics', link: '/optics', icon: 'M10 2l-8 8 8 8M14 2l8 8-8 8' },
  { label: 'Inventory', link: '/inventory', icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12' },
  { label: 'Accounting', link: '/accounting', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6M12 22V2' },
  { label: 'Admin', link: '/admin', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  { label: 'HR', link: '/hr', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M15.5 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M23 21v-2a3.5 3.5 0 0 0-2.5-3.37' },
];

export default function DashboardRedirect() {
  const user = useAuthStore((s) => s.user);

  if (user?.clinic?.slug) {
    return <Navigate to={getClinicRoute(user.clinic.slug)} replace />;
  }

  const roleRoute = user?.role && ROLE_ROUTES[user.role];
  if (roleRoute) {
    return <Navigate to={roleRoute} replace />;
  }

  return (
    <div className="max-w-[1440px] mx-auto flex-1 flex items-center" data-tour="dashboard">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 w-full">
        {navItems.map(({ label, link, icon }) => (
          <Link
            key={link}
            to={link}
            data-tour={label.toLowerCase().replace(/\s+/g, '-')}
            className="flex flex-col items-center gap-2 p-5 rounded-xl border border-silver hover:border-lilac-bloom bg-paper hover:bg-lilac-bloom/5 transition-all duration-200 touch-target group"
          >
            <div className="w-10 h-10 rounded-lg bg-bone group-hover:bg-lilac-bloom/10 transition-colors p-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full text-graphite group-hover:text-lilac-bloom transition-colors">
                <path d={icon} />
              </svg>
            </div>
            <span className="text-caption font-medium text-graphite text-center leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
