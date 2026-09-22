// Paleta fixa do menu lateral e do cabeçalho ("chrome" do app). Intencional-
// mente NÃO segue o tema claro/escuro do conteúdo (useColors()) — o menu é
// sempre escuro, como aprovado no protótipo de layout. nav.accent é o mesmo
// teal usado como `primary` no modo escuro em theme.config.js, para manter
// uma única cor de destaque em todo o app.
export const NAV_COLORS = {
  bg: '#101E25',
  card: '#16262D',
  border: '#1F323A',
  fg: '#9FB4B7',
  fgStrong: '#EDF6F6',
  fgMuted: '#6C8285',
  accent: '#55C2C8',
  accentOn: '#0B1417',
  topAccent: '#EF6C2E',
  activeBg: 'rgba(255,255,255,0.09)',
  hoverBg: 'rgba(255,255,255,0.06)',
};

export const NAV_WIDTH_EXPANDED = 252;
export const NAV_WIDTH_COLLAPSED = 76;
export const APP_VERSION = 'V1.0';
