import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { ErrorBoundary } from './components/ui/ErrorBoundary.jsx';
import { ProtectedRoute, RoleRoute, PublicOnlyRoute, RoleRedirect } from './components/routing/guards.jsx';
import { LoginPage } from './pages/auth/LoginPage.jsx';
import { SignupPage } from './pages/auth/SignupPage.jsx';
import { ChangePasswordPage } from './pages/account/ChangePasswordPage.jsx';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.jsx';
import { UsersPage } from './pages/admin/UsersPage.jsx';
import { AddUserPage } from './pages/admin/AddUserPage.jsx';
import { UserDetailPage } from './pages/admin/UserDetailPage.jsx';
import { StoresPage } from './pages/admin/StoresPage.jsx';
import { AddStorePage } from './pages/admin/AddStorePage.jsx';
import { BrowseStoresPage } from './pages/user/BrowseStoresPage.jsx';
import { OwnerDashboardPage } from './pages/owner/OwnerDashboardPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<RoleRedirect />} />

              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/change-password" element={<ChangePasswordPage />} />

                  <Route element={<RoleRoute roles={['admin']} />}>
                    <Route path="/admin" element={<AdminDashboardPage />} />
                    <Route path="/admin/users" element={<UsersPage />} />
                    <Route path="/admin/users/new" element={<AddUserPage />} />
                    <Route path="/admin/users/:id" element={<UserDetailPage />} />
                    <Route path="/admin/stores" element={<StoresPage />} />
                    <Route path="/admin/stores/new" element={<AddStorePage />} />
                  </Route>

                  <Route element={<RoleRoute roles={['user']} />}>
                    <Route path="/stores" element={<BrowseStoresPage />} />
                  </Route>

                  <Route element={<RoleRoute roles={['store_owner']} />}>
                    <Route path="/owner" element={<OwnerDashboardPage />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
