import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { CaseInbox } from './components/CaseInbox';
import { CaseDetail } from './components/CaseDetail';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: CaseInbox },
      { path: 'case/:caseId', Component: CaseDetail },
    ],
  },
]);
