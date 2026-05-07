/**
 * Super Sprint A / MX203 — Templates de policy hardcoded.
 *
 * R14: templates são constantes — NÃO criar tabela separada.
 * Cada template tem nome, descrição curta, e função buildJson(opts) que
 * retorna o policy_json. UI no Studio pre-preenche o form com isso.
 */

import type { PolicyJson } from "@aethereos/kernel";

export interface PolicyTemplate {
  id: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  appliesTo: PolicyJson["applies_to"];
  /**
   * Constrói o policy_json do template. Pode receber opções
   * (ex: auto_approval_limit no template financeiro).
   */
  buildJson(options?: Record<string, unknown>): PolicyJson;
  /** Original_intent_text default que vai para o campo de intenção. */
  intentText: string;
}

export const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: "conservador",
    name: "Padrão Conservador",
    shortDescription:
      "Agentes precisam aprovação para tudo, exceto leitura ao Copilot.",
    longDescription:
      "Estado padrão recomendado. Bloqueia operações destrutivas (remover usuário, alterar role, exportar dados, alterar políticas) automaticamente. Toda outra ação de agente requer aprovação humana.",
    appliesTo: { actor_type: "agent" },
    intentText:
      "Agentes só podem ler/perguntar. Tudo que escreve precisa de revisão humana.",
    buildJson() {
      return {
        applies_to: { actor_type: "agent" },
        rules: [
          {
            type: "deny",
            intents: [
              "kernel.user.remove",
              "kernel.user.suspend",
              "kernel.user.change_role",
              "kernel.export.data",
              "kernel.policy.update",
            ],
            reason:
              "Operações de alta criticidade nunca podem ser executadas por agente sem revisão humana.",
          },
          {
            type: "allow",
            intents: ["kernel.ai.query"],
          },
          {
            // Tudo que sobrar do agente: requer aprovação.
            type: "require_approval_if",
            reason: "Padrão conservador — toda escrita precisa revisão.",
          },
        ],
      };
    },
  },
  {
    id: "moderado",
    name: "Moderado",
    shortDescription:
      "Agentes podem criar contatos, tarefas e mensagens. Aprovação para deletar e mudanças em massa.",
    longDescription:
      "Permite que o Copilot execute ações de baixo risco automaticamente: criar contatos, tarefas, mensagens, canais, completar tarefas. Pede aprovação para deleções, instalação/desinstalação de apps e mudanças de configuração. Bloqueia operações de alta criticidade.",
    appliesTo: { actor_type: "agent" },
    intentText:
      "Confio no Copilot para criação rotineira. Quero ser ouvido antes de deletar ou mudar config.",
    buildJson() {
      return {
        applies_to: { actor_type: "agent" },
        rules: [
          {
            type: "deny",
            intents: [
              "kernel.user.remove",
              "kernel.user.change_role",
              "kernel.export.data",
            ],
            reason:
              "Operações irreversíveis ou de alta criticidade requerem decisão humana explícita.",
          },
          {
            type: "allow",
            intents: [
              "kernel.contact.create",
              "kernel.task.create",
              "kernel.task.complete",
              "kernel.message.send",
              "kernel.channel.create",
              "kernel.notification.send",
              "kernel.ai.query",
            ],
          },
          {
            type: "require_approval_if",
            intents: [
              "kernel.contact.delete",
              "kernel.file.delete",
              "kernel.task.delete",
              "kernel.app.install",
              "kernel.app.uninstall",
              "kernel.settings.update",
              "kernel.user.invite",
              "kernel.user.suspend",
            ],
            reason: "Operação de risco médio — confirmação humana solicitada.",
          },
        ],
      };
    },
  },
  {
    id: "financeiro",
    name: "Operações Financeiras",
    shortDescription:
      "Aprovação obrigatória acima de threshold configurável. Bloqueia ações de risco alto.",
    longDescription:
      "Voltado a empresas que usam Copilot em fluxos financeiros. Permite ações de baixo valor automaticamente; escala para humano acima do limite configurado. Bloqueia operações de risco alto (remover usuário, exportar dados, alterar política).",
    appliesTo: { actor_type: "agent" },
    intentText:
      "Copilot pode aprovar ações pequenas. Acima do limite, eu aprovo manualmente.",
    buildJson(options) {
      const limit =
        typeof options?.["auto_approval_limit"] === "number"
          ? (options["auto_approval_limit"] as number)
          : 10000;
      return {
        applies_to: { actor_type: "agent" },
        rules: [
          {
            type: "deny",
            when: { risk_class: { in: ["C"] } },
            reason:
              "Risk class C (alta criticidade) sempre requer decisão humana explícita.",
          },
          {
            type: "allow",
            when: { amount: { max: limit } },
          },
          {
            type: "require_approval_if",
            when: { amount: { above: limit } },
            reason: `Operação acima do limite de auto-aprovação (R$ ${limit.toLocaleString("pt-BR")}).`,
          },
        ],
      };
    },
  },
];

export function getTemplate(id: string): PolicyTemplate | null {
  return POLICY_TEMPLATES.find((t) => t.id === id) ?? null;
}
