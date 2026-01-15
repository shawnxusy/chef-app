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
  const isReferencePage = location.pathname === '/manage/reference';

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
                  isManageMode && !isReferencePage
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

            {/* User Actions */}
            <div className="flex items-center gap-3">
              {/* Data Management Link */}
              <NavLink
                to="/manage/reference"
                className={`p-2 rounded-lg transition-colors ${
                  isReferencePage
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                title="数据管理"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </NavLink>

              {/* Logout */}
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                退出
              </button>
            </div>
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
