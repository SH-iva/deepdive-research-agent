export const DEPTHS = [
  { id: 'Quick', minutes: 'About a minute', sources: 5, stepMs: 650 },
  { id: 'Standard', minutes: 'A few minutes', sources: 12, stepMs: 1000 },
  { id: 'Deep', minutes: 'Several minutes', sources: 30, stepMs: 1500 },
];

export const depthInfo = (d) => `${d.minutes}, up to ${d.sources} sources`;
