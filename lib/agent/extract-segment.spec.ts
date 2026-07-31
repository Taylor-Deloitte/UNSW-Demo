import { describe, it, expect } from 'vitest';
import { extractSegment } from './extract-segment';
import type { ChatMessage } from '../../hooks/useAgentChat';

describe('extractSegment', () => {
  it('returns null when no relevant tool has run', () => {
    const messages: ChatMessage[] = [
      { id: 'u1', role: 'user', text: 'hi', toolCalls: [] },
      { id: 'a1', role: 'agent', text: 'hi back', toolCalls: [] },
    ];
    expect(extractSegment(messages)).toBeNull();
  });

  it('extracts from run_propensity_model', () => {
    const messages: ChatMessage[] = [
      {
        id: 'a1',
        role: 'agent',
        text: '',
        toolCalls: [
          {
            tool: 'run_propensity_model',
            input: { courseIdOrName: 'AI for Leaders' },
            status: 'done',
            output: {
              courseId: 'prog-000001',
              courseName: 'AI for Leaders — Intake 24',
              ranked: [
                { alumniId: 'a1', displayName: 'Alice Smith', score: 0.87, topFeatures: ['industry_match', 'seniority_match'] },
                { alumniId: 'a2', displayName: 'Bob Jones', score: 0.82, topFeatures: ['recency'] },
              ],
            },
          },
        ],
      },
    ];
    const seg = extractSegment(messages);
    expect(seg).not.toBeNull();
    expect(seg!.source).toBe('run_propensity_model');
    expect(seg!.audienceSize).toBe(2);
    expect(seg!.rows).toHaveLength(2);
    expect(seg!.rows[0].propensityScore).toBe(0.87);
    expect(seg!.courseContext).toContain('AI for Leaders');
  });

  it('extracts from query_aep', () => {
    const messages: ChatMessage[] = [
      {
        id: 'a1',
        role: 'agent',
        text: '',
        toolCalls: [
          {
            tool: 'query_aep',
            input: {},
            status: 'done',
            output: {
              profiles: [
                { profileId: 'crm-x', displayName: 'Alice Smith', industry: 'Technology', seniority: 'Senior', location: 'Sydney, NSW' },
              ],
              audienceSize: 340,
            },
          },
        ],
      },
    ];
    const seg = extractSegment(messages);
    expect(seg).not.toBeNull();
    expect(seg!.source).toBe('query_aep');
    expect(seg!.audienceSize).toBe(340);
    expect(seg!.rows[0].displayName).toBe('Alice Smith');
    expect(seg!.rows[0].location).toBe('Sydney, NSW');
  });

  it('prefers the most recent relevant tool_result', () => {
    const messages: ChatMessage[] = [
      {
        id: 'a1',
        role: 'agent',
        text: '',
        toolCalls: [
          {
            tool: 'query_aep',
            input: {},
            status: 'done',
            output: { profiles: [], audienceSize: 100 },
          },
          {
            tool: 'run_propensity_model',
            input: {},
            status: 'done',
            output: {
              courseId: 'p', courseName: 'X',
              ranked: [{ alumniId: 'a1', displayName: 'A', score: 0.9, topFeatures: [] }],
            },
          },
        ],
      },
    ];
    const seg = extractSegment(messages);
    expect(seg!.source).toBe('run_propensity_model');
  });
});
