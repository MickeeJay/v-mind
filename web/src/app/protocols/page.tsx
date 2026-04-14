import { ProtocolHealthDashboard } from '@/components/protocols/protocol-health-dashboard';
import { fetchProtocolHealthPageData } from '@/lib/protocol-health-api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProtocolsPage(): Promise<JSX.Element> {
  const initialData = await fetchProtocolHealthPageData();
  return <ProtocolHealthDashboard initialData={initialData} />;
}
