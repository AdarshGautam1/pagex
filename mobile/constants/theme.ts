/**
 * PAGEX Archival Editorial Design System
 * Synchronized with Stitch Project: "PAGEX Modern E-Library App"
 * Palette: Archival Wove Paper, Terracotta Book-Cloth, Forest Sage, Literary Carbon Ink
 */

export const colors = {
  // Archival Backgrounds & Surface Tiers
  background: '#FBF9F3', // Foundational unbleached wove paper
  surface: '#F5F3ED', // Surface container low
  surfaceContainer: '#F0EEE8', // Standard surface container
  surfaceHigh: '#EAE8E2', // Elevated panel / card
  surfaceHighest: '#E4E2DD', // Highest surface contrast
  surfaceActive: '#E5E2DA', // Pressed touch state
  surfaceLowest: '#FFFFFF', // Elevated Pure White Card
  white: '#FFFFFF',

  // Structural Rules & Boundaries
  border: '#EAE6DF', // Hairline rule line / bookbinder's thread
  borderLight: '#F2EFE9', // Subtle divider
  outline: '#8A726A', // Secondary boundary & glyphs
  outlineVariant: '#DDC0B8',

  // Literary Ink & Text Hierarchy
  ink: '#1B1C18', // Literary Carbon Ink (Primary)
  inkSecondary: '#57423C', // Warm Umber Graphite (Subtitles/Metadata)
  inkMuted: '#8A726A', // Weathered Lead (Captions/Placeholders)
  inverseSurface: '#30312D',
  inverseOnSurface: '#F3F1EB',

  // Primary Action Accent (Terracotta & Rust Book-Cloth)
  primary: '#7E2604', // Deep Rust
  primaryContainer: '#9E3D1B', // Terracotta Book-Cloth
  primaryLight: '#FFB59E',
  accent: '#9E3D1B', // Primary action accent (backward-compatible)
  accentLight: '#B84E29',
  accentSubtle: '#FBF0EC', // Warm terracotta wash for badges/chips
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#FFC9B8',

  // Secondary Accent (Archival Forest & Herbarium Green)
  secondary: '#436746', // Archival Pine/Forest
  secondaryContainer: '#C4EDC3', // Sage container
  onSecondaryContainer: '#2B4E30',
  sage: '#436746', // Backward-compatible
  sageLight: '#EBF4EB',
  success: '#436746', // Semantic success

  // Tertiary (Muted Slate Ink)
  tertiary: '#46453F',
  tertiaryContainer: '#5E5C56',
  tertiaryLight: '#CAC6BE',

  // Semantic Alerts & Moderation
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#93000A',

  // Leaderboard Honors & Medals
  gold: '#C99700', // 1st Place Ledger Gold
  silver: '#8A887B', // 2nd Place Archival Silver
  bronze: '#A66B38', // 3rd Place Bronze Buckram
};

export const fonts = {
  // Classical Transitional Serif (Newsreader) — Headlines & Literary Gravitas
  display: 'Newsreader_400Regular',
  displayItalic: 'Newsreader_400Regular_Italic',
  heading: 'Newsreader_600SemiBold',
  subheading: 'Newsreader_500Medium',
  headingBold: 'Newsreader_700Bold',

  // Humanist Sans-Serif (Source Sans 3) — Crisp Body, Dense Bibliographic Meta & UI
  body: 'SourceSans3_400Regular',
  bodyMedium: 'SourceSans3_500Medium',
  bodySemiBold: 'SourceSans3_600SemiBold',
  bodyBold: 'SourceSans3_700Bold',
  label: 'SourceSans3_600SemiBold',

  // Legacy fallbacks for compatibility
  headingOutfit: 'Outfit_700Bold',
  bodyInter: 'Inter_400Regular',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  xs: 2,
  sm: 4, // Spine tags, micro chips
  md: 8, // Catalog cards, book covers, inputs, buttons
  lg: 12, // Elevated panels, modals
  xl: 16, // Sheet corners
  full: 9999, // Circular badges & avatars
};
