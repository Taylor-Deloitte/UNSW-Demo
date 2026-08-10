import type { PresenterWidgetId } from './widgets';

// One step in the live walkthrough. Assembled incrementally as spotlight →
// text_delta* → tool_call* events arrive from the agent stream.
export interface PresenterStep {
  target: PresenterWidgetId | null; // null = intro / no widget in focus
  tag: string; // "" for intro; short label otherwise
  text: string; // accumulated assistant text since the spotlight opened this step
  tools: string[]; // tool_call chip labels captured since the spotlight opened
  revealed: boolean; // false = "Looking at TAG..." pulse; true = body faded in
}
