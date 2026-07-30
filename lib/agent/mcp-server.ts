import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type { DataBundle } from '../types';
import { queryDynamics } from './mcp-tools/query-dynamics';
import { queryAep } from './mcp-tools/query-aep';
import { queryLinkedin } from './mcp-tools/query-linkedin';
import { createAepSegment } from './mcp-tools/create-aep-segment';
import { draftAjoCampaign } from './mcp-tools/draft-ajo-campaign';
import { runPropensityModel } from './mcp-tools/run-propensity-model';

export function createUnswMcpServer(bundle: DataBundle, sessionId: string) {
  return createSdkMcpServer({
    name: 'unsw-marketing',
    version: '0.1.0',
    tools: [
      tool(
        'query_dynamics',
        'Search alumni or prospective learners in Dynamics 365. Returns rows with reasoning.',
        {
          entity: z.enum(['alumni', 'prospects']),
          filters: z.object({
            industry: z.string().optional(),
            state: z.string().optional(),
            seniority: z.string().optional(),
            leadRating: z.enum(['Hot', 'Warm', 'Cold']).optional(),
            graduationYearMin: z.number().optional(),
            graduationYearMax: z.number().optional(),
          }),
          limit: z.number().optional(),
        },
        async (input) => {
          const result = queryDynamics(bundle, input);
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        },
      ),
      tool(
        'query_aep',
        'Query AEP audience profiles by criteria. Returns profile records + audience size.',
        {
          audienceCriteria: z.object({
            industries: z.array(z.string()).optional(),
            seniorities: z.array(z.string()).optional(),
            states: z.array(z.string()).optional(),
            hasRecentSignal: z.boolean().optional(),
          }),
          limit: z.number().optional(),
        },
        async (input) => {
          const result = queryAep(bundle, input);
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        },
      ),
      tool(
        'query_linkedin',
        'Look up LinkedIn-style career signals — by alumni ID, or across all alumni for a given signal type.',
        {
          mode: z.enum(['by_alumni', 'by_signal_type']),
          alumniId: z.string().optional(),
          signalType: z
            .enum([
              'promoted',
              'role_change',
              'industry_change',
              'location_change',
              'redundancy_risk',
              'course_recency_threshold',
              'alumni_anniversary',
            ])
            .optional(),
          withinDays: z.number().optional(),
          limit: z.number().optional(),
        },
        async (input) => {
          const result = queryLinkedin(bundle, input);
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        },
      ),
      tool(
        'create_aep_segment',
        'Create an audience segment in AEP. Returns the segment IDs.',
        {
          name: z.string(),
          audienceSize: z.number(),
          criteriaSummary: z.string(),
        },
        async (input) => {
          const result = createAepSegment({ ...input, sessionId });
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        },
      ),
      tool(
        'draft_ajo_campaign',
        'Draft a campaign brief in AJO tied to an existing AEP segment.',
        {
          segmentId: z.string(),
          channel: z.enum(['email', 'sms', 'push']),
          subjectLine: z.string().optional(),
          bodyPreview: z.string().optional(),
        },
        async (input) => {
          const result = draftAjoCampaign({ ...input, sessionId });
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        },
      ),
      tool(
        'run_propensity_model',
        'Score alumni for a specific course. Optionally restrict to a subset of alumni IDs (a segment).',
        {
          courseIdOrName: z.string(),
          filterAlumniIds: z.array(z.string()).optional(),
          topN: z.number().optional(),
        },
        async (input) => {
          const result = runPropensityModel(bundle, input);
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        },
      ),
    ],
  });
}
