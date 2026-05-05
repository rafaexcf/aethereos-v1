# SPRINT 22 — Client SDK + App Bridge: @aethereos/client

> **Objetivo:** Criar package @aethereos/client com API tipada para apps third-party. Implementar App Bridge (postMessage) para comunicacao iframe <-> shell. Primeiro app iframe funcional usando o SDK.
> **NAO inclui:** permissoes granulares, Developer Console, monetizacao, manifesto .aeth completo.
> **Estimativa:** 4-6 horas. Custo: $25-45.

---

## CONTEXTO INICIAL OBRIGATORIO

Voce e Claude Code em ~/Projetos/aethereos.

### Leituras obrigatorias antes de tocar em codigo

1. CLAUDE.md
2. SPRINT_LOG.md — confirmar Sprint 21 documentado
3. git log --oneline -10 — confirmar HEAD
4. apps/shell-commercial/src/components/os/IframeAppFrame.tsx — iframe renderer existente (sandbox, loading, fallback)
5. apps/shell-commercial/src/components/os/AppFrame.tsx — dispatch: entry_mode=iframe -> IframeAppFrame
6. apps/shell-commercial/src/components/EmbeddedApp.tsx — postMessage primitivo existente
7. apps/shell-commercial/src/lib/embed.ts — postMessage helper existente
8. packages/drivers/src/interfaces/ — 11 driver interfaces (auth, storage, database, llm, etc.)
9. kernel.app_registry — 52 apps, todos weblinks ou internal (nenhum iframe real ainda)

### Estado atual

- IframeAppFrame renderiza <iframe sandbox="allow-scripts allow-same-origin allow-popups allow-forms">
- EmbeddedApp.tsx tem postMessage primitivo (envia tokens, recebe ready)
- embed.ts tem helper window.parent.postMessage()
- @aethereos/client NAO existe
- Nenhum app iframe real existe (todos weblinks que abrem em nova aba)
- Sem protocolo estruturado de bridge (sem requestId, sem validacao de origin, sem nonce)

### Arquitetura da solucao

MODO 1 — Direct (apps nativos dentro do shell):

- SDK importa drivers diretamente: aeth.drive.read() -> StorageDriver.read()
- Sem postMessage, sem bridge. Acesso direto aos stores e drivers.
- Usado por apps que rodam como componentes React dentro do shell.

MODO 2 — Bridge (apps iframe third-party):

- SDK detecta que esta em iframe (window.parent !== window)
- Toda chamada do SDK vira postMessage request para o host
- Host (shell) recebe, valida origin + appId + (futuro: permissoes), executa via drivers, retorna resposta
- Protocolo estruturado com requestId, timeout, error handling

---

## MILESTONES

### MX117 — Package @aethereos/client

O que fazer:

1. Criar packages/client/ com:

   packages/client/
   package.json (@aethereos/client, type: module)
   tsconfig.json
   src/
   index.ts — re-export tudo
   client.ts — createAethereosClient() factory
   types.ts — tipos compartilhados (Request, Response, Error)
   transport.ts — interface Transport (direct vs bridge)
   transports/
   direct.ts — DirectTransport (chama drivers diretamente)
   bridge.ts — BridgeTransport (postMessage para host)
   modules/
   drive.ts — aeth.drive._
   people.ts — aeth.people._
   chat.ts — aeth.chat._
   notifications.ts — aeth.notifications._
   scp.ts — aeth.scp._
   ai.ts — aeth.ai._
   settings.ts — aeth.settings._
   windows.ts — aeth.windows._
   auth.ts — aeth.auth._
   theme.ts — aeth.theme._
   **tests**/
   bridge-transport.test.ts

2. API principal:

   const aeth = createAethereosClient();

   // Deteccao automatica de modo:
   // - Se window.parent !== window && window.**AETHEREOS_BRIDGE**: modo bridge
   // - Se drivers disponíveis no contexto: modo direct
   // - Fallback: modo bridge (assume iframe)

   aeth.auth.getSession() -> { userId, email, companyId }
   aeth.auth.getUser() -> { id, email, name }

   aeth.drive.list(path?) -> FileEntry[]
   aeth.drive.read(fileId) -> Blob
   aeth.drive.write(path, data) -> { fileId }
   aeth.drive.delete(fileId) -> void

   aeth.people.list(query?) -> Person[]
   aeth.people.create(data) -> Person
   aeth.people.update(id, data) -> Person

   aeth.chat.listChannels() -> Channel[]
   aeth.chat.sendMessage(channelId, text) -> Message

   aeth.notifications.send(title, body, opts?) -> void
   aeth.notifications.list() -> Notification[]

   aeth.scp.emit(eventType, payload) -> { eventId }
   aeth.scp.subscribe(eventType, handler) -> unsubscribe()

   aeth.ai.chat(messages, opts?) -> { content, model }
   aeth.ai.embed(text) -> { embedding }

   aeth.settings.get(key) -> value
   aeth.settings.set(key, value) -> void

   aeth.windows.close() -> void
   aeth.windows.setTitle(title) -> void
   aeth.windows.sendMessage(targetAppId, message) -> void
   aeth.windows.onMessage(handler) -> unsubscribe()

   aeth.theme.getTheme() -> 'light' | 'dark'
   aeth.theme.onThemeChange(handler) -> unsubscribe()

3. Cada modulo e uma classe que recebe Transport no construtor:
   class DriveModule { constructor(private transport: Transport) {} }

4. Transport interface:
   interface Transport {
   request<T>(method: string, params?: Record<string, unknown>): Promise<T>;
   subscribe(event: string, handler: (data: unknown) => void): () => void;
   }

Criterio de aceite: Package compila, tipos exportados corretamente, createAethereosClient() retorna objeto tipado.

Commit: feat(client): @aethereos/client — SDK package with typed API modules (MX117)

---

### MX118 — BridgeTransport (postMessage client-side)

O que fazer:

1. Implementar transports/bridge.ts:

   class BridgeTransport implements Transport {
   request<T>(method: string, params?): Promise<T> {
   const requestId = crypto.randomUUID();
   return new Promise((resolve, reject) => {
   const timeout = setTimeout(() => reject(new Error('Bridge timeout')), 10_000);
   const handler = (event: MessageEvent) => {
   if (event.data?.type !== 'AETHEREOS_SDK_RESPONSE') return;
   if (event.data?.requestId !== requestId) return;
   clearTimeout(timeout);
   window.removeEventListener('message', handler);
   if (event.data.success) resolve(event.data.data);
   else reject(new Error(event.data.error?.message ?? 'Bridge error'));
   };
   window.addEventListener('message', handler);
   window.parent.postMessage({
   type: 'AETHEREOS_SDK_REQUEST',
   requestId,
   method,
   params: params ?? {},
   }, '\*');
   });
   }

   subscribe(event, handler) {
   const listener = (e: MessageEvent) => {
   if (e.data?.type !== 'AETHEREOS_SDK_EVENT') return;
   if (e.data?.event !== event) return;
   handler(e.data.data);
   };
   window.addEventListener('message', listener);
   return () => window.removeEventListener('message', listener);
   }
   }

2. Protocolo de mensagens:

   Request (iframe -> host):
   { type: 'AETHEREOS_SDK_REQUEST', requestId: uuid, method: 'drive.list', params: { path: '/' } }

   Response (host -> iframe):
   { type: 'AETHEREOS_SDK_RESPONSE', requestId: uuid, success: true, data: [...] }
   { type: 'AETHEREOS_SDK_RESPONSE', requestId: uuid, success: false, error: { code: 'PERMISSION_DENIED', message: '...' } }

   Event push (host -> iframe):
   { type: 'AETHEREOS_SDK_EVENT', event: 'theme.changed', data: { theme: 'dark' } }

3. Handshake inicial:
   - Quando SDK inicia em modo bridge: envia { type: 'AETHEREOS_SDK_HANDSHAKE', version: '1.0.0' }
   - Host responde: { type: 'AETHEREOS_SDK_HANDSHAKE_ACK', appId, companyId, theme }
   - SDK armazena contexto recebido

4. Testes unitarios: mock postMessage, verifica request/response flow, timeout, error handling.

Criterio de aceite: BridgeTransport funciona com mock. Handshake + request/response + subscribe testados.

Commit: feat(client): BridgeTransport — postMessage protocol for iframe apps (MX118)

---

### MX119 — Host Bridge Handler no shell

O que fazer:

1. Criar apps/shell-commercial/src/lib/app-bridge-handler.ts:

   class AppBridgeHandler {
   constructor(
   private drivers: AllDrivers,
   private userId: string,
   private companyId: string,
   ) {}

   start(iframe: HTMLIFrameElement, appId: string) {
   window.addEventListener('message', this.handleMessage);
   }

   stop() {
   window.removeEventListener('message', this.handleMessage);
   }

   private handleMessage = async (event: MessageEvent) => {
   if (event.data?.type === 'AETHEREOS_SDK_HANDSHAKE') {
   this.sendHandshakeAck(event.source, appId);
   return;
   }
   if (event.data?.type !== 'AETHEREOS_SDK_REQUEST') return;
   // Validar origin (futuro: allowedOrigins do app_registry)
   const { requestId, method, params } = event.data;
   try {
   const result = await this.executeMethod(method, params);
   event.source?.postMessage({
   type: 'AETHEREOS_SDK_RESPONSE', requestId, success: true, data: result
   }, '_');
   } catch (err) {
   event.source?.postMessage({
   type: 'AETHEREOS_SDK_RESPONSE', requestId, success: false,
   error: { code: 'EXECUTION_ERROR', message: err.message }
   }, '_');
   }
   }

   private async executeMethod(method: string, params: Record<string, unknown>) {
   // Router: method = 'drive.list' -> this.handleDriveList(params)
   const [module, action] = method.split('.');
   switch (module) {
   case 'drive': return this.handleDrive(action, params);
   case 'people': return this.handlePeople(action, params);
   case 'auth': return this.handleAuth(action, params);
   case 'notifications': return this.handleNotifications(action, params);
   case 'settings': return this.handleSettings(action, params);
   case 'theme': return this.handleTheme(action, params);
   default: throw new Error(`Unknown module: ${module}`);
   }
   }
   }

2. Implementar handlers para pelo menos:
   - auth.getSession -> retorna { userId, email, companyId }
   - auth.getUser -> retorna user profile
   - drive.list -> SELECT kernel.files WHERE company_id
   - drive.read -> fetch do storage
   - people.list -> SELECT kernel.people WHERE company_id
   - notifications.send -> INSERT kernel.notifications
   - settings.get -> SELECT kernel.settings
   - theme.getTheme -> retorna tema atual

3. Handlers executam com credenciais do usuario autenticado (RLS se aplica).

4. NAO implementar permissoes granulares neste sprint — todo metodo e permitido se o iframe esta carregado. Permissoes sao Sprint 23.

Criterio de aceite: Handler recebe request, roteia para driver correto, retorna response.

Commit: feat(shell): AppBridgeHandler — host-side message router for iframe SDK (MX119)

---

### MX120 — Integrar bridge no IframeAppFrame

O que fazer:

1. No IframeAppFrame.tsx:
   - Quando iframe carrega (onLoad): instanciar AppBridgeHandler com ref do iframe
   - Passar appId, drivers, userId, companyId
   - Ao desmontar: chamar handler.stop()

2. Enviar handshake ACK quando iframe envia HANDSHAKE:
   - appId, companyId, theme, version

3. Enviar evento theme.changed quando tema muda (via useTheme hook).

4. Log estruturado: registrar cada request recebido (method, appId) para auditoria futura.

Criterio de aceite: IframeAppFrame instancia bridge, responde handshake, roteia requests.

Commit: feat(shell): integrate AppBridgeHandler in IframeAppFrame (MX120)

---

### MX121 — App iframe de demonstracao

O que fazer:

1. Criar um mini app de teste que roda como iframe e usa o SDK:
   - apps/shell-commercial/public/demo-iframe-app/index.html
   - Carrega @aethereos/client via <script type="module"> (inline ou CDN local)
   - UI simples: botoes para cada metodo do SDK
     - "Get Session" -> aeth.auth.getSession() -> mostra resultado
     - "List Files" -> aeth.drive.list() -> mostra lista
     - "List People" -> aeth.people.list() -> mostra lista
     - "Send Notification" -> aeth.notifications.send('Hello', 'From iframe!')
     - "Get Theme" -> aeth.theme.getTheme() -> mostra light/dark

2. Registrar o demo app no banco:
   INSERT INTO kernel.app_registry (id, slug, name, description, icon, color, category, app_type, entry_mode, entry_url, status)
   VALUES ('demo-iframe', 'demo-iframe', 'Demo SDK', 'App de demonstracao do @aethereos/client', 'Puzzle', '#06b6d4', 'utilities', 'native', 'iframe', '/demo-iframe-app/index.html', 'published');

3. Instalar para companies de teste via INSERT em company_modules.

4. Testar: abrir Demo SDK na Magic Store -> instalar -> abrir -> clicar botoes -> verificar que dados reais aparecem.

Criterio de aceite: App iframe abre no shell, usa SDK para ler dados reais via bridge, mostra resultados.

Commit: feat(demo): iframe demo app using @aethereos/client SDK (MX121)

---

### MX122 — Testes + documentacao

O que fazer:

1. Testes unitarios:
   - BridgeTransport: request/response, timeout, error, subscribe
   - AppBridgeHandler: route method, auth handler, drive handler, unknown method error
   - Handshake flow

2. Rodar suite completa:
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

3. Resultado esperado: 33+ passed, 0 failed.

4. Criar packages/client/README.md com:
   - Instalacao: pnpm add @aethereos/client
   - Quick start: createAethereosClient() + exemplos
   - API reference (lista de modulos e metodos)
   - Bridge protocol specification

5. Atualizar SPRINT_LOG.md com Sprint 22.

6. Atualizar ARCHITECTURE_OVERVIEW.md com Client SDK + App Bridge.

Criterio de aceite: Testes passam, docs criados.

Commit: docs: sprint 22 — client SDK + app bridge (MX122)

---

## REGRAS INVIOLAVEIS

R1. Commit por milestone com mensagem feat/fix/docs(scope): descricao (MXN).
R2. Milestone so comeca apos anterior ter criterio de aceite e commit.
R3. Apos 3 tentativas de fix de bug especifico, marcar BLOQUEADO, registrar, pular.
R4. Nova dep exige justificativa em commit.
R5. Bloqueios mantidos: sem next em shells, sem inngest, sem @clerk/_, sem prisma.
R6. Antes de cada commit: pnpm typecheck && pnpm lint.
R7. Nao execute fora de ~/Projetos/aethereos.
R8. Ao perceber contexto cheio: pare, escreva pickup point.
R9. NAO quebrar os 33+ E2E existentes.
R10. Bridge handlers executam com credenciais do USUARIO (RLS se aplica). Iframe NAO recebe tokens diretamente.
R11. NAO implementar permissoes granulares neste sprint. Todo metodo e permitido se iframe carregou. Permissoes sao Sprint 23.
R12. postMessage target: usar '_' por enquanto. Sprint 23 adicionara origin validation.
R13. O SDK deve funcionar tanto como ESM import quanto como script tag inline (para demo).

---

## TERMINO DO SPRINT

Quando MX122 estiver commitado:

1. Rode o gate final:
   pnpm typecheck && pnpm lint
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

2. Reporte o resultado (X passed, Y failed, Z skipped).

3. Pare aqui. Nao inicie Sprint 23.

---

## PROMPT DE RETOMADA

Estou retomando Sprint 22 (Client SDK + App Bridge) no Aethereos.

Antes de qualquer acao:

1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md
3. Rode: git log --oneline -10 && git status
4. Identifique a proxima milestone MX117-MX122 nao concluida
5. Continue a partir dela

Lembrar:

- @aethereos/client: SDK para apps third-party com API tipada
- BridgeTransport: postMessage protocol para iframe apps
- AppBridgeHandler: host-side router no shell que executa requests via drivers
- Protocolo: AETHEREOS_SDK_REQUEST -> AETHEREOS_SDK_RESPONSE
- Handshake: AETHEREOS_SDK_HANDSHAKE -> AETHEREOS_SDK_HANDSHAKE_ACK
- Demo app iframe em public/demo-iframe-app/
- Sem permissoes granulares neste sprint (Sprint 23)
- 33+ E2E existentes nao podem quebrar

Roadmap em SPRINT_22_PROMPT.md na raiz.
