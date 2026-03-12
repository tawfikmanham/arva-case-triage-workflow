const footerLinks = [
  'Terms',
  'Privacy',
  'Security',
  'Status',
  'Docs',
  'Contact',
];

export function AppFooter() {
  return (
    <footer className="py-2">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[#6B7280]" style={{ fontSize: '11px' }}>
          <span className="text-[11px]">© 2026 Arva.ai</span>
          {footerLinks.map((link) => (
            <button
              key={link}
              type="button"
              className="text-[11px] hover:text-[#1A1E21] transition-colors"
            >
              {link}
            </button>
          ))}
          <span className="ml-auto inline-flex items-center gap-1.5 text-[#9CA3AF] text-[11px]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#00A63E]" />
            All systems operational
          </span>
        </div>
      </div>
    </footer>
  );
}
