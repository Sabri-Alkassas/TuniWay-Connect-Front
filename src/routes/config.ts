/**
 * Central route paths. Use these for NavLink and programmatic navigation.
 */
export const ROUTES = {
  HOME: '/',
  EXAMPLE: '/example',
  NOT_FOUND: '*',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
