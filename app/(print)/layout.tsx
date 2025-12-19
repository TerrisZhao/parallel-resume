// Minimal layout for print pages - no providers, no client components
// This prevents hydration errors by not wrapping the page in the root layout
export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Return children directly without any wrapper
  // The print page will provide its own <html> and <body> tags
  return children;
}
