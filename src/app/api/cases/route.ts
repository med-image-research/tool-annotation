import { connection } from 'next/server';
import { getDatasetPayload } from '@/lib/db';

export async function GET() {
  await connection();
  try {
    const payload = await getDatasetPayload();
    return Response.json(payload, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Failed to load cases:', err);
    return Response.json(
      { error: 'Không thể tải dữ liệu bệnh án' },
      { status: 500 }
    );
  }
}
