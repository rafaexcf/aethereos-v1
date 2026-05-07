# Permissões — Scopes

> Apps declaram scopes no manifesto. Usuário aceita ao instalar. Grants ficam em `kernel.app_permission_grants` per-company.

## Filosofia

- **Princípio do menor privilégio.** Peça apenas o necessário.
- **Justifique scopes sensíveis.** O wizard exige texto livre (10+ chars) para cada um.
- **`auth.read` é base.** Todo app recebe automaticamente — não precisa pedir.

## Catálogo (17 scopes)

### Autenticação

| Scope       | Sensível | Descrição                                             |
| ----------- | -------- | ----------------------------------------------------- |
| `auth.read` | não      | Identidade do usuário (id, nome, e-mail) — base scope |

### Drive

| Scope          | Sensível | Descrição                |
| -------------- | -------- | ------------------------ |
| `drive.read`   | não      | Listar e ler arquivos    |
| `drive.write`  | não      | Criar e editar arquivos  |
| `drive.delete` | sim      | Apagar arquivos do Drive |

### Pessoas

| Scope          | Sensível | Descrição               |
| -------------- | -------- | ----------------------- |
| `people.read`  | não      | Listar contatos         |
| `people.write` | sim      | Criar e editar contatos |

### Chat

| Scope        | Sensível | Descrição                           |
| ------------ | -------- | ----------------------------------- |
| `chat.read`  | não      | Ler canais e mensagens              |
| `chat.write` | não      | Enviar mensagens em nome do usuário |

### Notificações

| Scope                | Sensível | Descrição                          |
| -------------------- | -------- | ---------------------------------- |
| `notifications.send` | não      | Enviar notificações para o usuário |

### SCP (Event Bus)

| Scope           | Sensível | Descrição                                          |
| --------------- | -------- | -------------------------------------------------- |
| `scp.emit`      | não      | Emitir eventos no event bus                        |
| `scp.subscribe` | sim      | Inscrever em eventos (acessa dados de outros apps) |

### IA

| Scope      | Sensível | Descrição                                |
| ---------- | -------- | ---------------------------------------- |
| `ai.chat`  | não      | Chamadas de chat com LLM (consome quota) |
| `ai.embed` | não      | Gerar embeddings (consome quota)         |

### Settings

| Scope            | Sensível | Descrição                        |
| ---------------- | -------- | -------------------------------- |
| `settings.read`  | não      | Ler config global do tenant      |
| `settings.write` | sim      | Escrever config global do tenant |

### Theme

| Scope        | Sensível | Descrição                |
| ------------ | -------- | ------------------------ |
| `theme.read` | não      | Ler tema atual do tenant |

### Windows

| Scope            | Sensível | Descrição                           |
| ---------------- | -------- | ----------------------------------- |
| `windows.manage` | não      | Abrir links externos, fechar janela |

## Scopes sensíveis (5)

Exigem justificativa textual no manifesto:

- `drive.delete`
- `people.write`
- `scp.subscribe`
- `settings.write`

(O 5º depende de updates futuros no catálogo — ver `packages/client/src/scopes.ts`.)

## Fluxo de consentimento

1. Usuário clica "Instalar" na Magic Store.
2. Modal mostra:
   - Nome + ícone do app
   - Lista de scopes solicitados, com badge "sensível" onde aplicável
   - Justificativa de cada scope sensível (vinda do manifesto)
3. Usuário aceita ou cancela.
4. Aceitar: INSERT em `kernel.app_permission_grants` com `granted_at=now()`.
5. App pode chamar métodos do SDK que mapeiam para scopes aceitos.

## Verificação no servidor

Ao receber chamada do SDK via Bridge, o shell verifica:

1. App tem grant ativo para o scope?
2. Se não: retornar `SdkError { code: "permission_denied", message: "..." }`.
3. Se sim: executar a operação.

## Como testar

No **sandbox** do Developer Console (botão "Testar"):

- Mock bridge responde com dados fake para todos os scopes (sem
  verificação real de grants).
- Útil para validar handshake e formato de requests.
- **Não simula** o flow real de consentimento — esse só acontece em
  instalação real.
