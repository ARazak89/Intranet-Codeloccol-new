'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';
import {
  Home,
  FolderOpen,
  Trophy,
  User,
  CheckSquare,
  Calendar,
  Users,
  Bell,
  Menu,
  X,
  LogOut,
  Settings
} from 'lucide-react';
import { getMineNotifications } from '@/actions/notifications';

interface LayoutProps {
  children: ReactNode;
}

const API_BASE_URL = config.baseUrl;

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsCount, setNotificationsCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;

      const response = await getMineNotifications()
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setNotificationsCount(data.filter((n: any) => !n.read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };



  const navigation = [
    { name: 'Tableau de bord', href: '/dashboard', icon: Home },
    { name: 'Mes Projets', href: '/projects', icon: FolderOpen },
    { name: 'Hackathons', href: '/hackathons', icon: Trophy },
    { name: 'Mon Profil', href: '/profile', icon: User },
    { name: 'Évaluations', href: '/evaluations', icon: CheckSquare },
    { name: 'Calendrier', href: '/calendar', icon: Calendar },
  ];

  if (user?.role === 'staff' || user?.role === 'admin') {
    navigation.push({ name: 'Gestion des Utilisateurs', href: '/admin/users', icon: Users });
  }

  const isActive = (href: string) => pathname === href;
  const daysRemaining = user?.daysRemaining ?? 0;



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <img
              src="/logo.png"
              alt="CodeLoccol"
              className="h-8 w-auto object-contain"
            />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-8 px-4">
          <div className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isActive(item.href)
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <img
              src={user?.profilePicture ? `${API_BASE_URL}${user.profilePicture}` : '/default-avatar.jpg'}
              alt="Avatar"
              className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600"
            />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 ">
        {/* Top navigation */}
        <header className="bg-white  dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu className="h-5 w-5" />
            </button>


            <div className="flex items-center space-x-4 justify-between w-full">
              {/* Days remaining */}
              <div className="hidden sm:flex items-center px-3 py-1 bg-emerald-100 dark:bg-emerald-900 rounded-full">
                <span
                  className={`text-sm font-medium ${daysRemaining > 10
                    ? "text-emerald-700 dark:text-emerald-200"
                    : daysRemaining > 5
                      ? "text-yellow-600 dark:text-yellow-400"
                      : daysRemaining > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                >
                  Jours restants : {daysRemaining}
                </span>

              </div>

              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <div className="relative">
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 relative">
                    <Bell className="h-5 w-5" />
                    {notificationsCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {notificationsCount}
                      </span>
                    )}
                  </button>
                </div>


                {/* User menu */}
                <div className="relative">
                  <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <img
                      src={user?.profilePicture ? `${API_BASE_URL}${user.profilePicture}` : '/default-avatar.jpg'}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600"
                    />
                    <span className="hidden sm:block text-sm font-medium text-gray-900 dark:text-white">
                      {user?.name}
                    </span>
                  </button>
                </div>

                {/* Logout button */}
                <button
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  title="Déconnexion"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
