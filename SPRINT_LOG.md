# Sprint Log — Aethereos Bootstrap Fase 1

Início do sprint: 2026-04-29T00:00:00Z
Modelo: Claude Code (claude-sonnet-4-6, sessão N=1)

## Calibração inicial

**Ordem de construção:** Camada 0 (shell-base, local-first, BUSL v1.1) → Camada 1 (shell-commercial, proprietária, multi-tenant) → comercio.digital → logitix → kwix → autergon.

**Por que Next.js está bloqueado nos shells:** Shells são PWA/OS no navegador — apps totalmente autenticados sem necessidade de SSR. Vite 8+ + TanStack Router atendem o modelo híbrido URL+estado da Fundamentação 4.4. Next.js apenas para SaaS standalone com SEO. ADR-0014 item #1.

**Freio agêntico do primeiro ano:** Autonomia 0-1 (sugerir, humano executa). Ações irreversíveis sempre exigem aprovação humana explícita. As 8 operações invariantes nunca executam autonomamente em circunstância alguma.

**8 operações invariantes que agentes NUNCA executam (Fundamentação 12.4):**

1. Demissão de colaborador
2. Alteração estrutural de cadastro de fornecedores/clientes (bloqueio, remoção)
3. Alteração de plano de contas
4. Transferência financeira acima de limite configurado
5. Alteração de políticas de governança
6. Concessão ou revogação de acesso privilegiado
7. Exclusão de dados
8. Alteração de informações fiscais (regime tributário, cadastros SEFAZ)

---

## Histórico de milestones

<!-- Preenchido conforme milestones são concluídas -->

---

## Decisões menores tomadas durante o sprint

<!-- Justificativas que não viram ADR mas precisam ser rastreáveis -->

---

## Bloqueios encontrados

<!-- Preenchido se houver bloqueios -->
