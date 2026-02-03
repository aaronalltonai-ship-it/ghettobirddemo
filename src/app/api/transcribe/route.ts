import { NextResponse } from " next/server\;

const SAMPLE_TRANSCRIPT = \Command received: perimeter sweep hold altitude report anomalies.\;

export const runtime = \nodejs\;

export async function POST() {
 return NextResponse.json({ text: SAMPLE_TRANSCRIPT });
}
