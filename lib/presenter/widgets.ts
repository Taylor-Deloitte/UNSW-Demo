export const PRESENTER_WIDGETS = {
  signalsFeed: 'Career signals',
  cohortsChart: 'Cohort trend',
  segmentsResult: 'Matched alumni',
  ciReasoning: 'Agent reasoning',
  ciRecommendations: 'Course recommendations',
} as const;

export type PresenterWidgetId = keyof typeof PRESENTER_WIDGETS;

export const PRESENTER_WIDGET_IDS: readonly PresenterWidgetId[] = Object.keys(
  PRESENTER_WIDGETS,
) as PresenterWidgetId[];

export function isPresenterWidgetId(x: string): x is PresenterWidgetId {
  return Object.prototype.hasOwnProperty.call(PRESENTER_WIDGETS, x);
}
