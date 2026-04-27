export const colors = {
  ink: '#17211b',
  muted: '#617065',
  subtle: '#8a988e',
  canvas: '#f7f8f5',
  surface: '#ffffff',
  surfaceSoft: '#eef3ed',
  border: '#dce4dc',
  borderStrong: '#c2d0c3',
  primary: '#136f3a',
  primaryHover: '#0f5c30',
  primarySoft: '#dff2e5',
  accent: '#f2b84b',
  danger: '#b42318',
  dangerSoft: '#fde8e6',
  success: '#168246',
  successSoft: '#e1f4e7',
  shadow: 'rgba(25, 40, 30, 0.12)',
  heatmap: ['#e8eee8', '#bde6c9', '#73c98f', '#2f9e5b', '#126b38'] as const,
};

export const darkColors = {
  ink: '#f3f7f1',
  muted: '#b9c6bb',
  subtle: '#8e9b91',
  canvas: '#101511',
  surface: '#161d18',
  surfaceSoft: '#1d281f',
  border: '#2b392f',
  borderStrong: '#405345',
  primary: '#7bdc96',
  primaryHover: '#96e6aa',
  primarySoft: '#203f2a',
  accent: '#f3c35f',
  danger: '#ff9b92',
  dangerSoft: '#3c211f',
  success: '#7bdc96',
  successSoft: '#1f3d29',
  shadow: 'rgba(0, 0, 0, 0.35)',
  heatmap: ['#263027', '#244c31', '#287244', '#2fa75e', '#69d486'] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  pill: 999,
};

export const type = {
  family: 'System',
  mono: 'SpaceMono',
};

export type Palette = typeof colors;
