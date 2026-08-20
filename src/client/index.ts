import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { SshConsoleView } from './SshConsoleView.tsx'
import { en, NS, zh, type SshLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' { interface LocaleNamespaceMap { 'dsh-withssh': SshLocaleKey } }
export const inject = ['slots', 'locale']
export function apply(ctx: ClientContext): void { ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-withssh: dictionaries'); const t = ctx.locale.bind(NS); ctx.slots.inject('conversation.view', () => ctx.slots.register({ name: 'conversation.view', id: 'dsh-withssh-console', order: 20, label: () => t('view'), locale: NS }, SshConsoleView)); ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({ name: 'conversation.session.header.actions', id: 'dsh-withssh-status', order: 20, locale: NS }, () => null)) }
export { SshConsoleView }
