import { NextResponse } from 'next/server';

import { fetchProtocolHealthPageData } from '@/lib/protocol-health-api';

function serializeProtocolHealthData(data: Awaited<ReturnType<typeof fetchProtocolHealthPageData>>) {
  return {
    checkedAt: data.checkedAt,
    agentStatus: data.agentStatus,
    protocols: data.protocols.map((protocol) => ({
      ...protocol,
      tvlMicrostx: protocol.tvlMicrostx.toString(),
    })),
  };
}

export async function GET(): Promise<NextResponse> {
  try {
    const data = await fetchProtocolHealthPageData();
    return NextResponse.json(serializeProtocolHealthData(data), {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Unable to load protocol health data.',
      },
      { status: 500 },
    );
  }
}
