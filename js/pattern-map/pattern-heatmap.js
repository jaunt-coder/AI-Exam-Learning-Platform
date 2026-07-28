/**
 * Sprint-19C — Pattern Heatmap builders
 */

import { roiBand, roiStars, formatStars } from './roi-calculator.js';

export const PATTERN_HEATMAP_VERSION = '19C';

/**
 * Student weakness heatmap cells.
 * @param {object[]} ranked
 */
export function buildWeaknessHeatmap(ranked = []) {
  const cells = (ranked || []).map((r) => {
    const weak = (Number(r.masteryGap) || 0) + (Number(r.recentWrong) || 0) * 8;
    return {
      patternId: r.patternId,
      name: r.name,
      mastery: r.mastery,
      recentWrong: r.recentWrong,
      intensity: Math.min(100, Math.round(weak)),
      level: weak >= 70 ? 'critical' : weak >= 45 ? 'high' : weak >= 25 ? 'mid' : 'low',
    };
  });
  return {
    type: 'weakness',
    version: PATTERN_HEATMAP_VERSION,
    cells: cells.sort((a, b) => b.intensity - a.intensity),
  };
}

/**
 * ROI color heatmap.
 * @param {object[]} ranked
 */
export function buildRoiHeatmap(ranked = []) {
  const cells = (ranked || []).map((r) => ({
    patternId: r.patternId,
    name: r.name,
    roi: r.roi,
    stars: r.stars ?? roiStars(r.roi),
    starsLabel: r.starsLabel || formatStars(roiStars(r.roi)),
    band: r.band || roiBand(r.roi),
    colorClass: `roi-band-${(r.band || roiBand(r.roi)).toLowerCase()}`,
  }));
  return {
    type: 'roi',
    version: PATTERN_HEATMAP_VERSION,
    legend: [
      { stars: 5, range: '90+', label: '★★★★★' },
      { stars: 4, range: '70~89', label: '★★★★☆' },
      { stars: 3, range: '50~69', label: '★★★☆☆' },
      { stars: 2, range: '30~49', label: '★★☆☆☆' },
      { stars: 1, range: '0~29', label: '★☆☆☆☆' },
    ],
    cells: cells.sort((a, b) => b.roi - a.roi),
  };
}

export default {
  PATTERN_HEATMAP_VERSION,
  buildWeaknessHeatmap,
  buildRoiHeatmap,
};
