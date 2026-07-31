import { NextResponse } from 'next/server';
import { getDataBundle } from '../../../../lib/data';
import { queryDynamics } from '../../../../lib/agent/mcp-tools/query-dynamics';
import { queryAep } from '../../../../lib/agent/mcp-tools/query-aep';
import { queryLinkedin } from '../../../../lib/agent/mcp-tools/query-linkedin';
import { createAepSegment } from '../../../../lib/agent/mcp-tools/create-aep-segment';
import { draftAjoCampaign } from '../../../../lib/agent/mcp-tools/draft-ajo-campaign';
import { runPropensityModel } from '../../../../lib/agent/mcp-tools/run-propensity-model';

/**
 * Direct MCP tool executor. Bypasses the LLM — used by the token-driven
 * screens to fire real tool calls whose results feed the audit log and
 * (optionally) the on-screen tables. See docs/03-AGENT-LAYER.md.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ name: string }> },
): Promise<Response> {
  const { name } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const bundle = await getDataBundle();

  try {
    switch (name) {
      case 'query_dynamics':
        return NextResponse.json(queryDynamics(bundle, body as never));
      case 'query_aep':
        return NextResponse.json(queryAep(bundle, body as never));
      case 'query_linkedin':
        return NextResponse.json(queryLinkedin(bundle, body as never));
      case 'run_propensity_model':
        return NextResponse.json(runPropensityModel(bundle, body as never));
      case 'create_aep_segment':
        return NextResponse.json(createAepSegment(body as never));
      case 'draft_ajo_campaign':
        return NextResponse.json(draftAjoCampaign(body as never));
      default:
        return NextResponse.json({ error: `unknown tool: ${name}` }, { status: 404 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
