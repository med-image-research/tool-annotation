import { connection } from 'next/server';
import { serializeFindingsToCsv } from '@/lib/csv';
import { getAllFindings } from '@/lib/db';

export async function GET() {
  await connection();
  try {
    const findings = await getAllFindings();
    const csv = serializeFindingsToCsv(findings);
    const stamp = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ViX-Ray_Verified_${stamp}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Failed to export CSV:', err);
    return Response.json({ error: 'Failed to export CSV' }, { status: 500 });
  }
}
