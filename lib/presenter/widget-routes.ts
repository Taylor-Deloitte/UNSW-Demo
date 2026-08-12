import type { PresenterWidgetId } from './widgets';

export const PRESENTER_WIDGET_ROUTES: Record<PresenterWidgetId, string> = {
  signalsFeed: '/signals',
  cohortsChart: '/cohorts',
  segmentsResult: '/segments',
  ciRecommendations: '/course-intelligence',
};
