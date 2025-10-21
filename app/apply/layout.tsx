export default function PublicApplyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Minimal, standalone layout: no sidebar/topbar/providers. globals.css still loaded by root.
  return children as React.ReactElement;
}
