/**
 * As 8 operações invariantes que agentes NUNCA executam autonomamente.
 * Ref: Fundamentação 12.4 [INV]
 *
 * Esta constante é a fonte de verdade no código para as operações invariantes.
 * Motor de runtime futuro usará esta lista para bloquear ações agênticas.
 */
export interface InvariantOperation {
  readonly id: string;
  readonly description: string;
  readonly category: string;
  /** Referência na Fundamentação */
  readonly ref: string;
}

export const INVARIANT_OPERATIONS: readonly InvariantOperation[] = [
  {
    id: "employee.termination",
    description: "Demissão de colaborador",
    category: "hr",
    ref: "Fundamentação 12.4 [INV]",
  },
  {
    id: "entity.structural_change",
    description:
      "Alteração estrutural de cadastro de fornecedores/clientes (bloqueio, remoção)",
    category: "erp",
    ref: "Fundamentação 12.4 [INV]",
  },
  {
    id: "accounting.chart_of_accounts_change",
    description: "Alteração de plano de contas",
    category: "finance",
    ref: "Fundamentação 12.4 [INV]",
  },
  {
    id: "financial.transfer_above_limit",
    description: "Transferência financeira acima de limite configurado",
    category: "finance",
    ref: "Fundamentação 12.4 [INV]",
  },
  {
    id: "governance.policy_change",
    description: "Alteração de políticas de governança",
    category: "governance",
    ref: "Fundamentação 12.4 [INV]",
  },
  {
    id: "access.privileged_change",
    description: "Concessão ou revogação de acesso privilegiado",
    category: "iam",
    ref: "Fundamentação 12.4 [INV]",
  },
  {
    id: "data.deletion",
    description: "Exclusão de dados",
    category: "data",
    ref: "Fundamentação 12.4 [INV]",
  },
  {
    id: "fiscal.tax_config_change",
    description:
      "Alteração de informações fiscais (regime tributário, cadastros SEFAZ)",
    category: "fiscal",
    ref: "Fundamentação 12.4 [INV]",
  },
] as const;

/** Verifica se uma operação é invariante (nunca executável por agente) */
export function isInvariantOperation(operationId: string): boolean {
  return INVARIANT_OPERATIONS.some((op) => op.id === operationId);
}

/** Retorna metadados de uma operação invariante ou undefined se não encontrada */
export function getInvariantOperation(
  operationId: string,
): InvariantOperation | undefined {
  return INVARIANT_OPERATIONS.find((op) => op.id === operationId);
}
