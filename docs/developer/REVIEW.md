# Processo de Revisão

> O que o staff do Aethereos verifica antes de publicar seu app na Magic Store.

## Cronograma

- **Submit:** developer envia (status `submitted`).
- **Em revisão:** staff começa a analisar (status `in_review`).
- **Decisão:** dentro de 48h úteis em condições normais.
  - **Aprovado** → publicado automaticamente na Magic Store.
  - **Rejeitado** → developer recebe notificação com motivo.
  - **Mudanças solicitadas** → submission volta para `draft` com notas.

## Checklist de revisão

O staff usa este checklist no Gestor > Staff > Revisão de apps:

- [ ] **URL é HTTPS.** Apps `iframe` exigem HTTPS no `entry_url`.
- [ ] **App carrega sem erros.** Staff abre o sandbox no review screen e verifica que carrega.
- [ ] **Descrição é clara e precisa.** Não promete features que o app não tem.
- [ ] **Scopes solicitados são justificados.** Nenhum scope sensível sem justificativa convincente.
- [ ] **Não contém conteúdo ofensivo.** Texto, imagens, screenshots passam pela política de conduta.
- [ ] **Não coleta dados excessivos.** Justificativas batem com o que o app realmente faz.
- [ ] **Funciona em iframe (se entry_mode=iframe).** Headers `X-Frame-Options` / `Content-Security-Policy` permitem embed pelo domínio do shell.

## Motivos comuns de rejeição

1. **HTTPS obrigatório.** URLs `http://` ou IPs nunca são aceitos.
2. **Scopes não justificados.** Pediu `drive.delete` mas o app é só leitura? Rejeitado.
3. **Iframe quebra.** App tem `X-Frame-Options: DENY` no header, então não embeda.
4. **Manifesto inválido.** `slug` com caracteres inválidos, `version` não-semver, scopes fora do catálogo.
5. **Conteúdo enganoso.** Descrição diz uma coisa, app faz outra.
6. **Marca em conflito.** Nome muito similar a app já existente ou confunde com produtos Aethereos.
7. **Preço inconsistente.** `pricing_model='paid'` mas `price_cents=0`.

## Como corrigir e resubmeter

1. Abra Developer Console.
2. Encontre o app com status `rejected` (ou `draft` se foi `request_changes`).
3. Clique "Abrir" — o motivo aparece em destaque vermelho ou amarelo.
4. Clique "Editar" para abrir o wizard com os campos atuais.
5. Corrija o que foi apontado.
6. Volte ao dashboard, clique "Submeter" — o status volta para `submitted` e o `rejection_reason` é limpo.

## Política de remoção pós-publicação

Mesmo após aprovado, um app pode ser removido se:

- Quebrar termos de uso (e.g. spam, fraude, malware).
- Receber muitas denúncias de usuários.
- Coletar dados além do declarado.

A remoção é via UPDATE em `kernel.app_registry` SET status='removed'.
Developer recebe notificação. Pode contestar via e-mail
`developers@aethereos.io`.

## SLAs (estimativas — F2)

| Volume de submissions | Tempo médio de revisão |
| --------------------- | ---------------------- |
| 0–5 por semana        | < 24h                  |
| 5–20 por semana       | < 48h                  |
| 20+ por semana        | < 72h                  |

Em F3+ planejamos automação parcial (Zod + linter de manifesto +
checks automatizados de iframe), reduzindo o tempo médio para < 12h.
