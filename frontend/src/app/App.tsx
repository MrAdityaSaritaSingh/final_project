import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes.tsx';
import { AuthProvider } from './context/AuthContext';
import { WorkbookProvider } from './context/WorkbookContext';

export default function App() {
  return (
    <AuthProvider>
      <WorkbookProvider>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" />
      </WorkbookProvider>
    </AuthProvider>
  );
}
