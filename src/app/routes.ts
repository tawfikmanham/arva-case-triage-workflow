import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { CaseInbox } from './components/CaseInbox';
import { CaseDetail } from './components/CaseDetail';
import { Duplicates } from './components/Duplicates';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: CaseInbox },
      { path: 'duplicates', Component: Duplicates },
      { path: 'case/:caseId', Component: CaseDetail },
    ],
  },
]);
