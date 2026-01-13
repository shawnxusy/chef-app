import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { logout } = useAuth();
  const location = useLocation();
  const isManageMode = location.pathname.startsWith('/manage');
  const isCookMode = location.pathname.startsWith('/cook');

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-primary-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🥗</span>
              <span className="text-lg font-semibold text-primary-700">私房菜谱</span>
            </div>

            {/* Mode Toggle */}
            <nav className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <NavLink
                to="/manage"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isManageMode
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                管理
              </NavLink>
              <NavLink
                to="/cook"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isCookMode
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                烹饪
              </NavLink>
            </nav>

            {/* User Menu */}
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
