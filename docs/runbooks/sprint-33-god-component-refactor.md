# Runbook — God components refactor decision (MX188)

> Sprint 33 / MX188 originalmente listou refatoração de 3 god components.
> Análise revelou estado heterogêneo + risco assimétrico de regressão.
> Esta página documenta a decisão técnica para cada componente e o
> caminho recomendado.

Data: 2026-05-06.

---

## Estado dos 3 alvos

### gestor/index.tsx — 3062 linhas

**Status: já decomposto.**

A pasta `apps/gestor/tabs/` contém **28 arquivos**, cada um sendo um tab
isolado (`PainelGeral.tsx`, `Colaboradores.tsx`, `Departamentos.tsx`,
`SessoesAtivas.tsx`, etc.). O `index.tsx` é o shell de routing + sidebar +
fluxo de cadastro de empresa (que justificadamente fica junto pela natureza
sequencial). O componente `_shared.tsx` agrupa helpers de UI usados pelos
tabs.

**Decisão:** SKIP — já está no padrão alvo do sprint. Refatorar mais não
adiciona valor, só churn.

---

### magic-store/MagicStoreApp.tsx — 3414 linhas

**Status: monolítico, mas com isolamento parcial via `PermissionsSection.tsx`
e `catalog-adapter.ts`.**

A separação em sub-componentes (`StoreHeader`, `StoreFrontPage`, `AppCard`,
`AppDetailView`, `InstallButton`) é viável mas exige trabalho cuidadoso por:

- Estado da Magic Store é primariamente local (useState) com fluxos
  acoplados (catalogo → filtro → card → detail view → install).
- Animations Framer Motion usam refs/IDs compartilhados entre o card
  da listagem e o detail view full-page (transições layout-based).
- Hooks customizados estão inline, não em `hooks/`.

**Decisão:** SKIP — risco de regressão visual em transições e fluxo de
install. Adiar para sprint pós-dogfood quando bugs reais guiarem a
refatoração.

---

### configuracoes/index.tsx — 7278 linhas

**Status: monolítico com ~10 tabs + ~30 helpers de UI.**

Extração técnica natural:

```
configuracoes/
├── index.tsx                     # shell + router (~400 lines target)
├── _shared/
│   ├── ContentHeader.tsx
│   ├── SettingGroup.tsx, SettingRow.tsx, SmartSelect.tsx
│   ├── Toggle.tsx, Badge.tsx, Buttons.tsx
│   ├── ImageUploadCard.tsx
│   └── (~30 helpers)
└── tabs/
    ├── Home.tsx                  # ~700 lines
    ├── MinhaEmpresa.tsx          # ~1350 lines (still big, split inner)
    ├── Perfil.tsx                # ~640 lines
    ├── Notificacoes.tsx          # ~230 lines
    ├── DadosPrivacidade.tsx      # ~320 lines
    ├── Dock.tsx                  # ~240 lines
    ├── Mesa.tsx                  # ~490 lines
    ├── Aparencia.tsx             # ~430 lines
    └── Sobre.tsx                 # ~790 lines
```

**Riscos identificados na refatoração:**

1. **Compartilhamento implícito de tipos** (`TabId`, `NavSection`, `NotifPrefs`)
   — extração precisa criar `_types.ts`.
2. **Helpers genéricos** (Toggle, Badge, SettingGroup) usados em 5+ tabs;
   extração precisa exportar e re-importar.
3. **Hooks `useUserPreference`, `useSessionStore`, `useDrivers`** referenciados
   em quase todos os tabs — múltiplos imports duplicados.
4. **30+ pontos de chamada DB** distribuídos em tabs — fácil quebrar fluxos
   de save sem cobertura E2E adequada.
5. **Sem teste E2E que cobre cada tab** — apenas `os-shell.spec.ts` faz
   smoke superficial. Refatoração às cegas tem risco real de regressão
   silenciosa.

**Custo estimado:** 4-8h de trabalho cuidadoso + necessidade de E2E novo
por tab para regressão.

**Decisão:** SKIP refatoração mecânica. Manter como dívida técnica
documentada. Plano:

1. Antes de refatorar configuracoes, escrever **E2E por tab**
   (~10 testes — abrir cada tab, salvar config, recarregar, assertar
   persistência).
2. Em sprint dedicada (pós-dogfood), refatorar tab a tab com gate
   E2E green a cada extração.
3. Não fazer big-bang.

---

## Decisão MX188

**Refatoração mecânica não realizada nesta sprint.** Razões:

- **gestor** já está decomposto (R10 é "split em arquivos" — feito).
- **magic-store** tem acoplamento de animação que torna split arriscado
  sem testes visuais adequados.
- **configuracoes** é o maior valor mas o mais arriscado; merece sprint
  dedicada com E2E first.

Esta decisão segue explicitamente o trecho do sprint:

> "Se refatoracao de algum componente for muito arriscada (muitas
> interdependencias): documentar como divida e pular."

---

## Próximos passos

Ver `KNOWN_LIMITATIONS.md` — nova KL adicionada cobrindo god components.

Sprint pós-dogfood deveria:

1. Adicionar 10 testes E2E para configuracoes (1 por tab).
2. Refatorar configuracoes incrementalmente (1 tab por commit).
3. Re-avaliar magic-store split após refatoração de configuracoes
   estabelecer padrão de E2E-first.
