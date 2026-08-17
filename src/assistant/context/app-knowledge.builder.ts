import {
  APP_AUTH_SURFACES,
  APP_DEEP_LINK_CONVENTION,
  APP_MODULES,
  APP_PUBLIC_SURFACES,
  type AppSurface,
} from './app-map';

function renderSurface(surface: AppSurface): string {
  const platform = surface.platform ? ` (${surface.platform} only)` : '';
  const segments: string[] = [
    `${surface.name}${platform}: ${surface.path}`,
    surface.summary,
  ];

  if (surface.tabs?.length) {
    segments.push(`Tabs: ${surface.tabs.join(', ')}`);
  }

  if (surface.actions?.length) {
    const buttons = surface.actions
      .map((action) => `"${action.label}" -> ${action.path}`)
      .join('; ');
    segments.push(`Buttons: ${buttons}`);
  }

  if (surface.notes?.length) {
    segments.push(surface.notes.join(' '));
  }

  return segments.join(' | ');
}

/**
 * Static reference to every page, tab, and create-action in the Astra clients.
 * Ships on every chat message, so `app-map.ts` entries stay terse.
 */
export function buildAppKnowledgeBlock(): string {
  return [
    'APP KNOWLEDGE (how the Astra apps are laid out).',
    "This block describes the Astra product itself, not the signed-in user's private data.",
    'Use it to answer "where is X", "how do I add Y", and "which screen has Z".',
    'Every path is the same in the web app and the mobile app unless a platform is named.',
    `Deep links: ${APP_DEEP_LINK_CONVENTION}`,
    'When you explain a step, name the screen and the exact button label, then give the path.',
    'Never invent a page, tab, or button that is not listed here. If something is not listed, say Astra does not have it yet.',
    '',
    'Modules:',
    ...APP_MODULES.map(renderSurface),
    '',
    'Sign-in and account:',
    ...APP_AUTH_SURFACES.map(renderSurface),
    ...APP_PUBLIC_SURFACES.map(renderSurface),
  ].join('\n');
}
