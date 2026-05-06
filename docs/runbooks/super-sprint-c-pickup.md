# Super Sprint C — Pickup Point 1

> Pausa após MX215 (PICKUP POINT 1 do roadmap original).
> Data: 2026-05-06. HEAD: `4155dc9`.

---

## Completado: MX214-MX215 (Bloco 1 — Setup)

### MX214 — react-i18next + estrutura de locales

`apps/shell-commercial`:

- Deps instaladas: `react-i18next`, `i18next`, `i18next-browser-languagedetector`.
- `src/locales/{pt-BR,en}/<ns>.json` — 30 namespaces × 2 línguas = 60 arquivos.
  - PT-BR `common.json` populado com 35+ strings genéricas + map de errors.
  - Demais namespaces ficam `{}` (vazios) até strings serem extraídas.
- `src/i18n.ts` — config completa com LanguageDetector, fallback `pt-BR`,
  resources estáticos (Vite bundla JSONs), localStorage key
  `aethereos-language`, `useSuspense=false`.
- `src/main.tsx` — `import "./i18n"` antes do render.

App compila e roda. Nenhum componente migrado ainda.

### MX215 — useAppTranslation hook + LanguageSwitcher

- `src/hooks/useAppTranslation.ts`: wrapper sobre `useTranslation` com
  formatadores Intl:
  - `formatDate(date, 'short' | 'long' | 'relative')` — usa
    `Intl.RelativeTimeFormat` para relative.
  - `formatNumber(num, fractionDigits?)`
  - `formatCurrency(amount, currency?)` — default BRL para pt, USD para en.
  - `formatPercent(value, fractionDigits=0)`
  - Locale dinâmico via `i18n.language`.
- `src/components/shared/LanguageSwitcher.tsx`: select com bandeira +
  label, troca via `i18n.changeLanguage()`. Variante `compact`.

---

## Pendente: MX216-MX223 (Blocos 2-4)

### Bloco 2 — Extrair strings PT-BR

- **MX216** — Shell components (TopBar, Dock, TabBar, Mesa, Lockscreen,
  Splash, Launcher, Login, Register, Onboarding, ErrorBoundary).
  Pattern: `const { t } = useAppTranslation('shell')` em cada componente.
  Preencher `locales/pt-BR/shell.json` com chaves snake_case.

- **MX217** — 5 apps core (gestor 3000+ linhas, configuracoes 7000+,
  magic-store 3400+, copilot 1500+, governanca 1700+). HEAVY.
  Cada app: 1 namespace, ~50-200 chaves.

- **MX218** — 7 apps produtividade (tarefas, kanban, notas, calendario,
  drive, chat, pessoas). Médio.

- **MX219** — 15 apps menores (auditoria, lixeira, enquetes, seguranca,
  rh, calculadora, relogio, weather, camera, gravador, agenda, pdf,
  navegador, automacoes, reuniao, notifications). Muitos arquivos
  pequenos.

### Bloco 3 — Traduzir EN

- **MX220** — common + shell + 5 core apps (foundation).
- **MX221** — 7 apps produtividade.
- **MX222** — 15 apps menores + error codes para Edge Functions.

### Bloco 4 — Polish

- **MX223** — Validação visual, push, atualizar SPRINT_LOG/CHANGELOG/README.

---

## Como retomar

```
Estou retomando Super Sprint C (i18n) no Aethereos.
Continue a partir do MX216 (Extrair strings shell components).

Estado:
- HEAD: 4155dc9 (push para main feito após este pickup)
- MX214-MX215 completos (foundation pronta)
- 60 arquivos de locale (vazios exceto common.json PT-BR)
- LanguageSwitcher já existe — falta wirear no app Configuracoes
- Pendente: MX216-MX223 (extração + tradução)

Roadmap em docs/sprint-prompts/SUPER_SPRINT_C_I18N.md
Pickup detalhado em docs/runbooks/super-sprint-c-pickup.md
```

## Notas técnicas para retomada

- **Pattern de extração:** em cada componente, `import { useAppTranslation } from "@hooks/useAppTranslation"`, depois substituir literais por `t('chave_snake_case')`.
- **Chaves:** snake_case (R15). Exemplos: `nova_tarefa`, `nenhum_contato`.
- **Plurais:** usar sufixo i18next (`_one`, `_other`) quando aplicável (R16).
- **Nomes próprios:** NÃO traduzir — "Aethereos", "Dock", "Magic Store", "Copilot", "Aether AI" (R7).
- **LanguageSwitcher:** wirear no app Configuracoes em uma seção "Idioma" ou em "Aparência" (parte do MX217).
- **Edge Functions:** retornar códigos de erro (`AUTH_REQUIRED`, etc.) — frontend mapeia em `common.errors.*`.
- **E2E:** já usam `data-testid`, não devem quebrar com i18n. Se quebrarem: corrigir para usar testid (R6).
- **Volume estimado:** ~2000 strings totais distribuídas em ~30 arquivos. Cada milestone do bloco 2 vai tocar 5-15 arquivos de componente.

## Estratégia recomendada para retomada

1. Não tentar fazer tudo em uma sessão. Cada milestone é grande.
2. Para apps grandes (configuracoes 7000+ linhas, magic-store 3400+):
   considerar dividir em sub-commits (R12 permite).
3. Priorizar visibilidade alta primeiro: shell components (MX216) →
   apps que o user vê primeiro (login/onboarding/Configuracoes).
4. Tradução EN (Blocos 3): após cada extração PT-BR estar estável,
   pode-se fazer tradução em paralelo (não precisa esperar todos os
   apps PT-BR estarem prontos).
