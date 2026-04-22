import SiteHeader from './SiteHeader';
import SiteProviders from './SiteProviders';
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SiteProviders>
      <SiteHeader />
      <main>{children}</main>
    </SiteProviders>
  );
}
