## Arva Case Triage Workflow

A realistic AML case triage and investigation interface built with React + Vite.

### Short Description (for GitHub About)
`AML case triage workflow UI with duplicate review, investigation workspace, and analyst decisioning.`

### What this project includes
- Case Inbox with filtering, sorting, and analyst assignment
- Duplicates page with grouped merge/unmerge workflows
- Case Detail workspace with:
- Signals and evidence accordions
- Communications and similar-cases tabs
- AI recommendation and decision composer
- Rationale, evidence references, and attachments
- Duplicate-detection alert and safe navigation dialog

### Tech stack
- React
- TypeScript
- Vite
- Tailwind CSS utility classes
- Lucide icons

### Run locally
```bash
npm install
npm run dev
```

### Build
```bash
npm run build
npm run preview
```

### Deployment
The app is set up for Vercel static deployment.
- Build command: `npm run build`
- Output directory: `dist`

### Notes
- Main branch contains the latest merged updates.
- UI data is mock AML case data for product/design exploration.
