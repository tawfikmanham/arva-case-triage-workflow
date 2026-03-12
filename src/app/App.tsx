import { RouterProvider } from 'react-router';
import { router } from './routes';
import { MergedGroupsProvider } from './state/MergedGroupsContext';

export default function App() {
  return (
    <MergedGroupsProvider>
      <RouterProvider router={router} />
    </MergedGroupsProvider>
  );
}
