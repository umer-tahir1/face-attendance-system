import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { Toaster } from './components/ui/sonner';
import { LoadingScreen } from './components/LoadingScreen';

export default function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <LoadingScreen />
        <RouterProvider router={router} />
        <Toaster />
      </AuthProvider>
    </AppProvider>
  );
}