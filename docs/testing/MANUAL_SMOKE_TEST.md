# Manual Smoke Test — Camada 1

**Tempo estimado:** 30-45 minutos  
**Pré-requisitos:** Stack rodando + seed populado (ver `QUICK_START.md`)  
**Limitações conhecidas:** ver `KNOWN_LIMITATIONS.md` antes de começar

Cada passo tem: `Faça:` → `Esperado:` → `Observado: [ ]`

---

## A. Setup (5 min)

### A1. Suba a stack

```bash
pnpm dev:db && pnpm seed:dev && pnpm --filter @aethereos/shell-commercial dev
```

**Esperado:** Terminal mostra "VITE ready". Sem erros no console.  
**Observado:** [ ]

### A2. Abra o app

Acesse `http://localhost:5174`  
**Esperado:** Tela de login do Aethereos aparece com campos Email e Senha.  
**Observado:** [ ]

---

## B. Login e Seleção de Company (5 min)

### B1. Login válido — company Meridian

**Faça:** Digite `ana.lima@meridian.test` / `Aethereos@2026!` e clique em "Entrar"  
**Esperado:** Redireciona para tela de seleção de company. Card "Meridian Tecnologia" aparece.  
**Observado:** [ ]

### B2. Selecionar company

**Faça:** Clique no card "Meridian Tecnologia"  
**Esperado:** Desktop do OS abre. Dock à esquerda com ícones de apps. Nome da company visível.  
**Observado:** [ ]

### B3. Login inválido

**Faça:** Logout → tente login com senha errada (qualquer texto)  
**Esperado:** Mensagem de erro de autenticação. NÃO vai para o app.  
**Observado:** [ ]

---

## C. Drive (7 min)

### C1. Abrir o Drive

**Faça:** No dock, clique no ícone do Drive  
**Esperado:** Janela do Drive abre. Lista arquivos e pastas seed: Documentos, Financeiro, Projetos, RH.  
**Observado:** [ ]

### C2. Navegar em pasta

**Faça:** Clique duas vezes em "Documentos"  
**Esperado:** Lista arquivos dentro de Documentos: "Contrato Social.pdf", "Proposta Comercial Q1.docx", etc.  
**Observado:** [ ]

### C3. Criar nova pasta

**Faça:** Clique em "Nova pasta", nome "Testes Q2 2026"  
**Esperado:** Pasta aparece na lista. Sem erro.  
**Observado:** [ ]

### C4. Upload simulado

**Faça:** Selecione um arquivo qualquer do seu computador via botão de upload  
**Esperado:** Arquivo aparece na lista com nome e tamanho. (Arquivo vai para Supabase Storage local.)  
**Observado:** [ ]

### C5. Deletar arquivo

**Faça:** Clique direito ou hover → ícone de deletar no arquivo uploadado → confirmar  
**Esperado:** Arquivo desaparece da lista.  
**Observado:** [ ]

### C6. Isolamento RLS do Drive — confirmar depois do passo M1

---

## D. Pessoas (7 min)

### D1. Abrir Pessoas

**Faça:** No dock, clique no ícone de Pessoas  
**Esperado:** Janela abre. Lista ~20 pessoas seed (Bruno Almeida, Camila Torres, etc.). Filtros por departamento visíveis.  
**Observado:** [ ]

### D2. Filtrar por departamento

**Faça:** Clique em "Engenharia" no filtro  
**Esperado:** Lista reduz para Bruno Almeida, Camila Torres, Diego Fonseca, Elisa Monteiro, Vinicius Siqueira.  
**Observado:** [ ]

### D3. Ver detalhe

**Faça:** Clique em qualquer pessoa  
**Esperado:** Painel lateral ou modal com nome, email, telefone, cargo, departamento.  
**Observado:** [ ]

### D4. Criar nova pessoa

**Faça:** Botão "Nova pessoa" → preenche nome e email → salvar  
**Esperado:** Pessoa aparece na lista. Mensagem de sucesso.  
**Observado:** [ ]

### D5. Editar pessoa

**Faça:** Abra a pessoa criada → edite o cargo → salvar  
**Esperado:** Cargo atualizado na lista/detalhe.  
**Observado:** [ ]

### D6. Desativar pessoa

**Faça:** Clique em "Desativar" na pessoa criada  
**Esperado:** Status da pessoa muda para "inativo". Pessoa sai da lista ativa (se houver filtro por status).  
**Observado:** [ ]

---

## E. Chat (5 min)

### E1. Abrir Chat

**Faça:** No dock, clique no ícone de Chat  
**Esperado:** Janela abre com 3 canais: geral, engenharia, avisos. Canal "geral" selecionado.  
**Observado:** [ ]

### E2. Ver mensagens históricas

**Faça:** Observe o histórico no canal "geral"  
**Esperado:** 7 mensagens seed aparecem (ex: "Pessoal, vamos alinhar o roadmap...").  
**Observado:** [ ]

### E3. Trocar de canal

**Faça:** Clique em "engenharia"  
**Esperado:** Histórico muda para mensagens do canal "engenharia".  
**Observado:** [ ]

### E4. Enviar mensagem

**Faça:** Digite "Teste smoke test Sprint 9" e pressione Enter  
**Esperado:** Mensagem aparece no chat com seu nome.  
**Observado:** [ ]

### E5. Realtime (se houver segundo browser)

**Faça:** Abra `http://localhost:5174` em aba privada → login com `carlos.mendes@meridian.test` → abra o mesmo canal  
**Esperado:** Mensagem do passo E4 já aparece (Realtime via Supabase).  
**Observado:** [ ] (pule se não tiver segundo browser)

---

## F. Configurações (5 min)

### F1. Abrir Configurações

**Faça:** No dock, clique no ícone de Configurações ou ícone de engrenagem  
**Esperado:** Painel de configurações abre com seções: Perfil, Aparência, Company.  
**Observado:** [ ]

### F2. Mudar tema

**Faça:** Em Aparência, altere o tema (claro/escuro ou variação disponível)  
**Esperado:** App muda de aparência imediatamente.  
**Observado:** [ ]

### F3. Editar nome de exibição

**Faça:** Em Perfil, altere o display name → salvar  
**Esperado:** Nome muda (pode precisar recarregar para ver em outros locais).  
**Observado:** [ ]

### F4. Configuração de company (apenas owner)

**Faça:** Em Company, edite o nome da company → salvar  
**Esperado:** Nome atualizado.  
**Observado:** [ ] (apenas com conta owner)

---

## G. AI Copilot (7 min)

> **Atenção:** Copilot está em **modo degenerado** (sem LLM real). Ver `KNOWN_LIMITATIONS.md`.

### G1. Abrir Copilot

**Faça:** Clique no botão "Copilot" (robô) no topo da UI  
**Esperado:** Drawer lateral abre. Banner "modo degenerado" visível (se LiteLLM não configurado). Histórico de conversa seed pode aparecer.  
**Observado:** [ ]

### G2. Enviar mensagem simples

**Faça:** Digite "Olá, o que você pode fazer?" e pressione Enter  
**Esperado:** Resposta aparece. Em modo degenerado: mensagem de fallback sobre Copilot offline. Em modo normal: resposta do LLM.  
**Observado:** [ ]

### G3. Detectar intent — criar pessoa

**Faça:** Digite "Criar uma nova pessoa no sistema"  
**Esperado:** Resposta aparece + painel "Shadow Mode" com proposta de ação "Criar pessoa" no status "pendente".  
**Observado:** [ ]

### G4. Aprovar proposta

**Faça:** Clique em "Aprovar" na proposta de G3  
**Esperado:** Proposta muda para "aprovado". Botão some.  
**Observado:** [ ]

### G5. Rejeitar proposta

**Faça:** Digite "Criar um canal novo" → proposta aparece → clique "Rejeitar"  
**Esperado:** Proposta muda para "rejeitado".  
**Observado:** [ ]

### G6. Histórico persiste (teste crítico)

**Faça:** Feche o drawer do Copilot → reabra  
**Esperado:** Mensagens anteriores reaparecem (carregadas do banco, não localStorage).  
**Observado:** [ ]

### G7. Proposta bloqueada (invariante)

**Faça:** Digite "Demitir funcionário"  
**Esperado:** Mensagem de bloqueio citando Fundamentação 12.4. NÃO gera proposta.  
**Observado:** [ ]

---

## H. Painel Staff

> **Atenção:** Requer claim `is_staff:true`. Ver `KNOWN_LIMITATIONS.md`.

### H1. Tentar acessar Staff

**Faça:** Navegue para `/staff` (adicione na URL)  
**Esperado:** Se sem claim de staff: mensagem de acesso negado ou redirect. Se com claim: painel exibe dados de todas as companies.  
**Observado:** [ ]

---

## I. RLS Cross-Tenant (teste crítico — 5 min)

### I1. Logout da Meridian

**Faça:** Clique em logout → confirmar  
**Esperado:** Volta para tela de login.  
**Observado:** [ ]

### I2. Login com conta Atalaia

**Faça:** Login com `rafael.costa@atalaia.test` / `Aethereos@2026!` → seleciona "Atalaia Consultoria"  
**Esperado:** Desktop da Atalaia. Nome da company é "Atalaia Consultoria".  
**Observado:** [ ]

### I3. Verificar isolamento no Drive

**Faça:** Abra o Drive  
**Esperado:** Pastas/arquivos da Atalaia (mesma estrutura, mas da Atalaia). NÃO vê arquivos da Meridian.  
**Observado:** [ ]

### I4. Verificar isolamento em Pessoas

**Faça:** Abra Pessoas  
**Esperado:** Pessoas da Atalaia com sufixo de ID diferente. NÃO vê "Ana Lima" ou "Carlos Mendes" (Meridian).  
**Observado:** [ ]

### I5. Verificar isolamento no Chat

**Faça:** Abra Chat  
**Esperado:** Canais da Atalaia. Mensagens seed da Atalaia. NÃO vê mensagens da Meridian do passo E4.  
**Observado:** [ ]

---

## J. Auditoria (2 min)

### J1. Abrir Auditoria (se disponível no dock)

**Faça:** Clique no ícone de auditoria (se existir)  
**Esperado:** Lista de eventos SCP recentes: logins, arquivos criados, mensagens, proposals.  
**Observado:** [ ]

---

## K. Governança (2 min)

### K1. Abrir Governança

**Faça:** Clique no ícone de Governança (escudo) no dock  
**Esperado:** Lista de agentes (Copilot) e invariantes de operação.  
**Observado:** [ ]

---

## Resultado Final

| Seção               | Passou? | Observações |
| ------------------- | ------- | ----------- |
| A. Setup            | [ ]     |             |
| B. Login            | [ ]     |             |
| C. Drive            | [ ]     |             |
| D. Pessoas          | [ ]     |             |
| E. Chat             | [ ]     |             |
| F. Configurações    | [ ]     |             |
| G. Copilot          | [ ]     |             |
| H. Staff            | [ ]     |             |
| I. RLS Cross-Tenant | [ ]     |             |
| J. Auditoria        | [ ]     |             |
| K. Governança       | [ ]     |             |

**Tester:**  
**Data:**  
**Versão:** Sprint 9 — Camada 1 testável  
**Issues encontradas:** (liste aqui e abra no repositório)
