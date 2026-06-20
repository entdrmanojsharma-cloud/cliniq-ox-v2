/*
  Purpose: Shared responsive layout hook.
  Responsibility: Expose screen-width breakpoints and helper utilities
                  so screens can adapt layout for mobile vs tablet vs desktop.
*/

import { useWindowDimensions } from 'react-native';

/**
 * Returns breakpoint flags and helpers based on current window width.
 *
 * Breakpoints (mirrors common mobile-first design systems):
 *   xs  < 480   – small phone
 *   sm  < 640   – large phone / small landscape phone
 *   md  < 768   – tablet portrait / landscape phone
 *   lg  < 1024  – tablet landscape / small desktop
 *   xl  ≥ 1024  – desktop
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isXs = width < 480;   // phone portrait
  const isSm = width < 640;   // large phone
  const isMd = width < 768;   // tablet portrait
  const isLg = width < 1024;  // tablet landscape

  const isMobile  = width < 640;
  const isTablet  = width >= 640 && width < 1024;
  const isDesktop = width >= 1024;

  /**
   * Returns a style value that is different per breakpoint.
   * Usage: pick({ mobile: 1, tablet: 2, desktop: 3 }) → number
   */
  const pick = ({ mobile, tablet, desktop }) => {
    if (isMobile)  return mobile  ?? desktop;
    if (isTablet)  return tablet  ?? desktop;
    return desktop;
  };

  /**
   * How many grid columns to use.
   * @param {number} wantedCols – ideal column count on desktop
   */
  const gridCols = (wantedCols = 2) => {
    if (isMobile) return 1;
    if (isTablet) return Math.min(2, wantedCols);
    return wantedCols;
  };

  return { width, height, isXs, isSm, isMd, isLg, isMobile, isTablet, isDesktop, pick, gridCols };
}
