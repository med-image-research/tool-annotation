import { Suspense } from 'react';
import { connection } from 'next/server';
import { Workstation } from '@/components/Workstation';
import { WorkstationLoading } from '@/components/WorkstationLoading';
import { getDatasetPayload } from '@/lib/db';

async function CaseLoader({
  params,
}: {
  params: Promise<{ imageId: string }>;
}) {
  await connection();
  const [{ imageId }, initialData] = await Promise.all([params, getDatasetPayload()]);
  return (
    <Workstation
      initialData={initialData}
      initialImageId={decodeURIComponent(imageId)}
    />
  );
}

export default function CasePage({ params }: PageProps<'/case/[imageId]'>) {
  return (
    <Suspense fallback={<WorkstationLoading />}>
      <CaseLoader params={params} />
    </Suspense>
  );
}
