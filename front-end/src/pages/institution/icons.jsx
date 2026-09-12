/* Compact 20x20 line icons (stroke = currentColor). */

const S = {
  viewBox: "0 0 24 24",
  width: 20,
  height: 20,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const Icon = {
  grid: () => (
    <svg {...S}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
  ),
  receipt: () => (
    <svg {...S}><path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Z" /><path d="M9 7h6M9 11h6M9 15h4" /></svg>
  ),
  tag: () => (
    <svg {...S}><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V4a1 1 0 0 1 1-1h7.9a2 2 0 0 1 1.4.6l7.5 7.5a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>
  ),
  card: () => (
    <svg {...S}><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19M6 15h4" /></svg>
  ),
  calendar: () => (
    <svg {...S}><rect x="3.5" y="4.5" width="17" height="16" rx="2.5" /><path d="M3.5 9.5h17M8 2.5v4M16 2.5v4M8.5 14l2.2 2.2L15.5 12" /></svg>
  ),
  chart: () => (
    <svg {...S}><path d="M4 20V4M4 20h16M8 20v-6M12.5 20V9M17 20v-9" /></svg>
  ),
  bell: () => (
    <svg {...S}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
  ),
  building: () => (
    <svg {...S}><path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M15 9h2a2 2 0 0 1 2 2v10M3 21h18M9 7h2M9 11h2M9 15h2" /></svg>
  ),
  logout: () => (
    <svg {...S}><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3M16 17l5-5-5-5M21 12H9" /></svg>
  ),
  menu: () => (
    <svg {...S}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
  ),
  chevronDown: () => (
    <svg {...S} width={16} height={16}><path d="m6 9 6 6 6-6" /></svg>
  ),
  upload: () => (
    <svg {...S}><path d="M12 15V4M8 8l4-4 4 4M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
  ),
  payment: () => (
    <svg {...S}><rect x="2.5" y="6" width="19" height="12" rx="2" /><path d="M2.5 10h19" /></svg>
  ),
  warning: () => (
    <svg {...S}><path d="M12 3.5 22 20H2L12 3.5Z" /><path d="M12 9v5M12 17.5h.01" /></svg>
  ),
  report: () => (
    <svg {...S}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>
  ),
  plan: () => (
    <svg {...S}><rect x="3.5" y="4.5" width="17" height="16" rx="2.5" /><path d="M3.5 9.5h17M8 2.5v4M16 2.5v4M9 14l2 2 4-4" /></svg>
  ),
  search: () => (
    <svg {...S}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
  ),
  close: () => (
    <svg {...S}><path d="M6 6l12 12M18 6 6 18" /></svg>
  ),
  chevronLeft: () => (
    <svg {...S} width={16} height={16}><path d="m15 6-6 6 6 6" /></svg>
  ),
  chevronRight: () => (
    <svg {...S} width={16} height={16}><path d="m9 6 6 6-6 6" /></svg>
  ),
  checkCircle: () => (
    <svg {...S}><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 5-5" /></svg>
  ),
  dotCircle: () => (
    <svg {...S}><circle cx="12" cy="12" r="9" /></svg>
  ),
};
