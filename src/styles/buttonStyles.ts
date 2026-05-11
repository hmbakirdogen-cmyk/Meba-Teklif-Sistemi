export const buttonClassNames = {
  primary: 'app-btn app-btn-primary',
  primarySmall: 'app-btn app-btn-primary app-btn-sm',
  secondary: 'app-btn app-btn-secondary',
  secondarySmall: 'app-btn app-btn-secondary app-btn-sm',
  ghost: 'app-btn app-btn-ghost',
  ghostSmall: 'app-btn app-btn-ghost app-btn-sm',
  danger: 'app-btn app-btn-danger',
  dangerSmall: 'app-btn app-btn-danger app-btn-sm',
  iconGhost: 'app-btn app-btn-ghost app-btn-icon',
  iconGhostSmall: 'app-btn app-btn-ghost app-btn-sm app-btn-icon',
  iconSecondary: 'app-btn app-btn-secondary app-btn-icon',
  iconPrimary: 'app-btn app-btn-primary app-btn-icon',
  smallAction: 'app-btn app-btn-ghost app-btn-small-action',
  smallActionDanger: 'app-btn app-btn-danger app-btn-small-action',
  link: 'app-link-button',
} as const;

export function chipButtonClassName(active: boolean) {
  return `app-chip-button${active ? ' is-active' : ''}`;
}
