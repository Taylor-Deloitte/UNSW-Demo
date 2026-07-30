export const brand = {
  name: 'UNSW Online',
  productName: 'Marketing Intelligence',
  logoPath: '/unsw-logo.svg',
  colors: {
    yellow: '#FFD100',
    black: '#000000',
    navy: '#001A2C',
    slate: '#3E4A56',
    mist: '#F2F4F6',
  },
} as const;

export const tabs = [
  { href: '/alumni-insights', label: 'Alumni Insights' },
  { href: '/lifecycle-health', label: 'Lifecycle Health' },
  { href: '/segmentation', label: 'Segmentation + Campaign' },
  { href: '/forecast', label: 'Forecast' },
] as const;
