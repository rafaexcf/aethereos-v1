# ADR-0023 — framer-motion como exceção arquitetural para paradigma OS

**Status:** Aceito  
**Data:** 2026-04-30  
**Sprint:** 10 — Foundation visual: paradigma OS V2 → V1  
**Escopo:** `apps/shell-commercial` exclusivamente

---

## Contexto

Sprint 10 porta o paradigma visual do V2 para V1. O V2 é construído inteiramente sobre `framer-motion` para três funcionalidades críticas do OS shell:

1. **Dock magnification** — efeito macOS-like onde ícones crescem proporcionalmente com base na distância do cursor. Requer `useMotionValue` (posição X do mouse) + `useTransform` (mapeamento distance→scale) + `useSpring` (spring physics: `mass: 0.1, stiffness: 150, damping: 12`). Impossível com CSS puro porque CSS transitions não permitem interpolação baseada em posição de cursor em tempo real.

2. **AnimatePresence** — transições de entrada/saída para tooltips do Dock, dropdowns da TopBar e tabs da TabBar. Padrão idiomático para animações condicionais em React.

3. **TabBar drag transitions** — feedback visual durante drag-drop das tabs (opacity + transform via CSS.Transform do @dnd-kit, mas animações de settle via motion).

---

## Decisão

`framer-motion` entra como **exceção controlada** a R5 do CLAUDE.md (`apps/shell-commercial` apenas).

**Alternativas consideradas:**

| Alternativa                   | Razão para rejeição                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| CSS puro                      | Não suporta `mousemove`-based interpolation para magnification                       |
| Motion One (`@motionone/dom`) | API diferente, comunidade menor, não tem `useSpring` equivalente com mesmo ergonomia |
| Web Animations API manual     | Verboso, sem spring physics nativo, alto custo de manutenção                         |
| Sem magnification             | Viola R10 (fidelidade visual ao V2) — o efeito é marca registrada do OS              |

---

## Consequências

**Positivo:**

- Dock magnification idêntica ao V2 (spring physics)
- AnimatePresence para tooltips/dropdowns com zero boilerplate
- Biblioteca madura, >20M downloads/semana, API estável

**Negativo:**

- ~50KB gzipped adicionados ao bundle do shell-commercial
- Dependência externa nova (mitigada pelo escopo limitado)

**Guardrails:**

- `framer-motion` NÃO deve ser importado em `apps/shell-base/`, `packages/drivers/`, `packages/kernel/` ou outros pacotes
- CI deve ser configurado para alertar se `framer-motion` aparecer fora de `apps/shell-commercial/`
- Revisão em Sprint 14+ se bundle size > 500KB gzipped

---

## Referências

- R5 do CLAUDE.md: "Bloqueios mantidos: sem `next` em shells, sem `inngest`, sem `@clerk/*`, sem `prisma`. EXCEÇÃO: `framer-motion` permitido neste sprint, registrar via ADR-0023."
- V2 Dock: `~/Projetos/aethereos-v2/artifacts/aethereos/src/components/os/Dock.tsx`
