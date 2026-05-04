import type { Transport } from "./transport.js";
import { BridgeTransport } from "./transports/bridge.js";
import {
  DirectTransport,
  type DirectRouter,
  type DirectEventBus,
} from "./transports/direct.js";
import { AuthModule } from "./modules/auth.js";
import { DriveModule } from "./modules/drive.js";
import { PeopleModule } from "./modules/people.js";
import { ChatModule } from "./modules/chat.js";
import { NotificationsModule } from "./modules/notifications.js";
import { ScpModule } from "./modules/scp.js";
import { AiModule } from "./modules/ai.js";
import { SettingsModule } from "./modules/settings.js";
import { WindowsModule } from "./modules/windows.js";
import { ThemeModule } from "./modules/theme.js";

export interface AethereosClient {
  readonly transport: Transport;
  readonly auth: AuthModule;
  readonly drive: DriveModule;
  readonly people: PeopleModule;
  readonly chat: ChatModule;
  readonly notifications: NotificationsModule;
  readonly scp: ScpModule;
  readonly ai: AiModule;
  readonly settings: SettingsModule;
  readonly windows: WindowsModule;
  readonly theme: ThemeModule;
}

export interface CreateClientOptions {
  /**
   * Transport explicito. Se omitido:
   *  - Se direct.router fornecido: usa DirectTransport.
   *  - Senao: usa BridgeTransport (assume iframe).
   */
  transport?: Transport;
  /** Para apps nativos do shell que injetam o router direto (sem postMessage). */
  direct?: { router: DirectRouter; bus?: DirectEventBus };
}

/**
 * Sprint 22 MX117 — factory do cliente Aethereos.
 *
 * Modo bridge (default): SDK assume iframe e usa postMessage para o host.
 * Modo direct: shell pode passar router que executa direto via drivers.
 */
export function createAethereosClient(
  opts: CreateClientOptions = {},
): AethereosClient {
  let transport: Transport;
  if (opts.transport !== undefined) {
    transport = opts.transport;
  } else if (opts.direct !== undefined) {
    transport = new DirectTransport(opts.direct.router, opts.direct.bus);
  } else {
    transport = new BridgeTransport();
  }
  return {
    transport,
    auth: new AuthModule(transport),
    drive: new DriveModule(transport),
    people: new PeopleModule(transport),
    chat: new ChatModule(transport),
    notifications: new NotificationsModule(transport),
    scp: new ScpModule(transport),
    ai: new AiModule(transport),
    settings: new SettingsModule(transport),
    windows: new WindowsModule(transport),
    theme: new ThemeModule(transport),
  };
}
