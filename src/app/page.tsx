import { Suspense } from 'react';
import { connection } from 'next/server';
import { Workstation } from '@/components/Workstation';
import { WorkstationLoading } from '@/components/WorkstationLoading';
import { getDatasetPayload } from '@/lib/db';

async function WorkstationLoader() {
  await connection();
  const initialData = await getDatasetPayload();
  return (
    <Workstation
      initialData={initialData}
      initialImageId={initialData.cases[0]?.imageId ?? null}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<WorkstationLoading />}>
      <WorkstationLoader />
    </Suspense>
  );
}
