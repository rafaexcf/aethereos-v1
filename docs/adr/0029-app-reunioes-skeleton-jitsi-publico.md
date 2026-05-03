# ADR-0029 — App Reuniões: skeleton via Jitsi público (departure de stack)

**Status:** Proposto
**Data:** 2026-05-03
**Sprint:** 12 — Continuidade de OS
**Subordinado a:** ADR-0014, ADR-0016
**Rigidez:** [HIP]
**Flag para humano:** sim — esta ADR introduz dependência (`meet.jit.si`) que não está na tabela de stack do CLAUDE.md §4.

---

## Contexto

Usuários pediram videoconferência dentro do OS — paridade funcional com Google Meet, sem precisar abrir outra aba.

Implementar uma stack de WebRTC própria significa:

- Servidor de signaling (Jitsi Videobridge self-hosted, LiveKit ou equivalente).
- Backend de gravação (composite recording server-side, não client-side).
- Pipeline de transcrição (Whisper self-hosted, AssemblyAI, ou similar).
- TURN servers para NAT traversal.
- Observabilidade de qualidade de chamada.

Isso é, no mínimo, **um sprint dedicado** — provavelmente dois. O Sprint 12 não comporta. Mas deixar reunião como "TODO" indefinido é negar feature alta-importância.

---

## Decisão

Entregar app `reuniao` como **skeleton funcional** que delega o vídeo para `meet.jit.si` público e grava/transcreve client-side. A arquitetura "real" fica declarada como roadmap.

### Persistência (production-grade)

`kernel.meetings`:

```
id UUID, company_id UUID, user_id UUID, room_id TEXT UNIQUE,
title TEXT, started_at TIMESTAMPTZ, ended_at TIMESTAMPTZ,
recording_url TEXT, transcript TEXT, participants JSONB
```

- RLS canônica multi-tenant.
- Bucket `kernel-meetings` (Storage) para gravações, RLS por `company_id`.
- Migração: `supabase/migrations/20260503000014_kernel_meetings.sql`.

A tabela e o bucket são definitivos — quando substituirmos o vídeo, o schema permanece.

### Camada de vídeo: `meet.jit.si` público em iframe

App `apps/shell-commercial/src/apps/reuniao/index.tsx`:

- Cria row em `kernel.meetings` ao iniciar (gera `room_id`).
- Embed: `<iframe src="https://meet.jit.si/${room_id}" allow="camera; microphone; display-capture" />`.
- `room_id` = `aethereos-{companyId-prefix}-{random36^6}` — entropia ~36^6 (~2 bilhões); colisão muito improvável mas **não criptograficamente segura**.

### Gravação: `MediaRecorder` + `getDisplayMedia` client-side

- Usuário clica "Gravar" → browser pede permissão de tela.
- `MediaRecorder` codifica WebM no client.
- Ao parar, upload do blob para `kernel-meetings/{meeting_id}.webm`.

### Transcrição: `webkitSpeechRecognition` (Chrome only)

- Usuário clica "Transcrever" → browser captura áudio do mic.
- Texto incremental é escrito em `meetings.transcript` em debounce.

### Limitações declaradas (no produto e aqui)

1. **`meet.jit.si` é público sem SLA.** Pode estar fora do ar; pode mudar TOS; sujeito a rate limit anônimo.
2. **Salas anônimas.** Qualquer pessoa com a URL entra — entropia do `room_id` é a única defesa.
3. **Sem SSO no Jitsi.** Usuário do OS precisa digitar nome novamente no Jitsi.
4. **Gravação morre se a tab fechar.** Sem composite server-side, sem retomada.
5. **Transcrição apenas Chrome.** Firefox/Safari/Edge sem `webkitSpeechRecognition` mostram "indisponível".
6. **Sem breakout rooms, sem polls, sem features avançadas** — limitado ao que `meet.jit.si` expõe via URL.
7. **Compliance.** Conteúdo de reuniões trafega por servidor terceiro fora do nosso controle. **Não usar para reuniões com PII sensível ou contratuais até substituição.**

A UI exibe banner explícito com essas limitações.

---

## Departure de stack — flag para humano

CLAUDE.md §4 não lista videoconferência. Esta ADR introduz `meet.jit.si` como dependência runtime de feature. Decisão pede ratificação humana porque:

1. Adiciona dependência externa não enumerada na constituição.
2. Tem implicações de privacy/compliance que afetam o pitch B2B do produto.
3. Pode contradizer SECURITY_GUIDELINES (rever antes do merge).

---

## Roadmap "real"

Quando a stack de reuniões for construída de verdade:

1. **Vídeo:** Jitsi Videobridge self-hosted **ou** LiveKit Cloud **ou** Daily.co. Escolha exige ADR comparativa.
2. **SSO:** auth do OS injetada no Jitsi via JWT (Jitsi suporta `room.token`).
3. **Gravação:** composite recording server-side (Jibri se Jitsi, Egress se LiveKit) → upload para bucket privado.
4. **Transcrição:** worker server-side com Whisper (self-hosted) ou AssemblyAI via LiteLLM gateway.
5. **Eventos SCP:** `meeting.started`, `meeting.ended`, `meeting.recording.available`, `meeting.transcript.ready` — com schemas no `scp-registry`.
6. **Feature flag** desliga skeleton browser na transição.

---

## Alternativas rejeitadas

### A1 — Não entregar reunião neste sprint

**Rejeitado:** feature de alta visibilidade, usuários esperam. Skeleton com banner é mais honesto que omissão.

### A2 — Integrar Google Meet / Zoom via SDK

**Rejeitado por ora:** ambos exigem conta paga, OAuth dance, e amarra o produto ao vendor. Skeleton com Jitsi público é trade equivalente em qualidade e zero-cost para validar product fit.

### A3 — Build próprio com WebRTC nativo + signaling do zero

**Rejeitado:** sub-projeto de meses. Não cabe em Sprint 12.

### A4 — Daily.co / LiveKit hosted como skeleton

**Rejeitado para skeleton** (mas é candidato sério para a versão real). Custo recorrente desde dia 1, e ainda assim demanda backend para tokens. Jitsi público é literalmente zero-config.

---

## Consequências

### Positivas

- Feature reunião funcional hoje.
- Schema `kernel.meetings` e bucket `kernel-meetings` definitivos.
- Aprendizado: descobrir o que usuários realmente fazem em reuniões antes de gastar sprint na stack real.

### Negativas

- Departure de stack (`meet.jit.si` não enumerado em CLAUDE.md §4).
- Reuniões de produção dependem de serviço terceiro sem SLA — risco operacional declarado.
- Gravação/transcrição client-side é frágil — usuário pode perder conteúdo.
- Risco de cliente B2B usar para conteúdo sensível antes da troca.

---

## Regras operacionais

1. Banner de limitações **não pode** ser removido até a versão server-side existir.
2. Não emitir eventos SCP `meeting.*` ainda — domain ainda não está reservado em `scp-registry`. Reservar quando o roadmap server-side for executado.
3. Bucket `kernel-meetings` tem retention policy: 90 dias (padrão), revogável por usuário.
4. Não vender reunião como feature de "compliance/auditoria" no marketing até substituição.

---

## Referências

- Migração: `supabase/migrations/20260503000014_kernel_meetings.sql`
- App: `apps/shell-commercial/src/apps/reuniao/index.tsx`
- CLAUDE.md §4 — tabela de stack (esta ADR introduz item não-listado)
- CLAUDE.md §12 — "parar e perguntar antes de adicionar nova dependência" (cumprido aqui via ADR + flag para humano)
- ADR-0014 — Stack de referência
- `docs/SECURITY_GUIDELINES.md` — revisão de privacy pendente
