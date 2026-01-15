import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ReferenceProvider } from '@/context/ReferenceContext';
import { PasswordGate } from '@/pages/PasswordGate';
import { Layout } from '@/components/Layout';
import { RecipeListPage } from '@/pages/manage/RecipeListPage';
import { RecipeFormPage } from '@/pages/manage/RecipeFormPage';
import { RecipeDetailPage } from '@/pages/manage/RecipeDetailPage';
import { ReferenceManagePage } from '@/pages/manage/ReferenceManagePage';
import { MealListPage } from '@/pages/cook/MealListPage';
import { MealBuilderPage } from '@/pages/cook/MealBuilderPage';
import { PreparationPage } from '@/pages/cook/PreparationPage';
import { LoadingSpinner } from '@/components/LoadingSpinner';

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PasswordGate />;
  }

  return (
    <ReferenceProvider>
      <Layout>
        <Routes>
          {/* Manage mode routes */}
          <Route path="/" element={<Navigate to="/manage" replace />} />
          <Route path="/manage" element={<RecipeListPage />} />
          <Route path="/manage/new" element={<RecipeFormPage />} />
          <Route path="/manage/reference" element={<ReferenceManagePage />} />
          <Route path="/manage/:id" element={<RecipeDetailPage />} />
          <Route path="/manage/:id/edit" element={<RecipeFormPage />} />

          {/* Cook mode routes */}
          <Route path="/cook" element={<MealListPage />} />
          <Route path="/cook/new" element={<MealBuilderPage />} />
          <Route path="/cook/:id" element={<MealBuilderPage />} />
          <Route path="/cook/:id/prepare" element={<PreparationPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/manage" replace />} />
        </Routes>
      </Layout>
    </ReferenceProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProtectedRoutes />
    </AuthProvider>
  );
}
