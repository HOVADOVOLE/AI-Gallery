import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import MainLayout from './components/MainLayout';

// Pages
import { LoginScreen } from './pages/LoginScreen';
import { RegisterScreen } from './pages/RegisterScreen';
import { GalleryScreen } from './pages/GalleryScreen'; // Existing logic
import DashboardPage from './pages/DashboardPage'; // New
import AlbumsPage from './pages/AlbumsPage';       // New
import ReviewPage from './pages/ReviewPage';       // New
import ImportPage from './pages/ImportPage';       // New
import SettingsPage from './pages/SettingsPage';   // New
import AboutPage from './pages/AboutPage';         // New

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.JSX.Element }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Routes - No Layout / Simple Layout */}
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />

      {/* Protected Routes - Wrapped in MainLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard is the Index Route */}
        <Route index element={<DashboardPage />} />
        
        {/* Other Sections */}
        <Route path="gallery" element={<GalleryScreen />} />
        <Route path="albums" element={<AlbumsPage />} />
        <Route path="review" element={<ReviewPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="about" element={<AboutPage />} />
      </Route>

      {/* Catch all - Redirect to Dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;