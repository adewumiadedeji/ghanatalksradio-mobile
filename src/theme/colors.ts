// Ported 1:1 from the Stitch web prototype's StyledComponents.ts COLORS object,
// so the RN app matches the approved design exactly.
export const COLORS = {
  surface: '#f8f9ff',
  surfaceDim: '#cbdbf5',
  surfaceBright: '#f8f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e5eeff',
  surfaceContainerHigh: '#dce9ff',
  surfaceContainerHighest: '#d3e4fe',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#45464d',
  inverseSurface: '#213145',
  inverseOnSurface: '#eaf1ff',
  outline: '#76777d',
  outlineVariant: '#c6c6cd',
  primary: '#000000',
  onPrimary: '#ffffff',
  primaryContainer: '#131b2e',
  onPrimaryContainer: '#7c839b',
  secondary: '#0051d5',
  onSecondary: '#ffffff',
  secondaryContainer: '#316bf3',
  onSecondaryContainer: '#fefcff',
  tertiary: '#000000',
  onTertiary: '#ffffff',
  tertiaryContainer: '#40000d',
  onTertiaryContainer: '#f23d5c',
  error: '#ba1a1a',
};

// Stitch design used 'Newsreader' (serif, headings) and 'Work Sans' (sans, body).
// Load these via expo-font in App.tsx; fall back to system fonts until loaded.
export const FONTS = {
  serif: 'Newsreader_700Bold',
  serifSemibold: 'Newsreader_600SemiBold',
  sans: 'WorkSans_400Regular',
  sansMedium: 'WorkSans_500Medium',
  sansSemibold: 'WorkSans_600SemiBold',
  sansBold: 'WorkSans_700Bold',
};

export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  pill: 9999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};
