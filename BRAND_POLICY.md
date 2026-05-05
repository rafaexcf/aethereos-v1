# Brand Policy — Aethereos

Política de uso da marca, nome, logotipo e identidade visual do Aethereos.

---

## 1. Propriedade

O nome **"Aethereos"**, o logotipo, marcas associadas (B2B AI OS Brazil,
Comércio Digital, Logitix, Kwix, Autergon) e a identidade visual são de
propriedade da Aethereos Inc. (ou entidade legal sucessora).

---

## 2. Identidade visual oficial

### Cores primárias

| Token       | Hex       | Uso                                         |
| ----------- | --------- | ------------------------------------------- |
| Primary 500 | `#6366F1` | Cor de marca principal (CTA, links, ícones) |
| Primary 400 | `#818CF8` | Hover, gradientes, estados ativos           |

### Cores estruturais (shell OS)

| Token              | Hex       | Uso                               |
| ------------------ | --------- | --------------------------------- |
| Sidebar background | `#11161C` | Sidebars do shell e apps internos |
| App background     | `#191D21` | Fundo padrão de apps em janela    |

### Tipografia

- **Stack padrão**: `system-ui`, `-apple-system`, `Segoe UI`, `Roboto`,
  `sans-serif`.
- Tamanhos canônicos no shell: 10px (auxiliar) e 13px (primário). Cores
  via CSS vars `--text-tertiary` / `--text-secondary` / `--text-primary`.

### Logotipo

- Logotipo oficial em `apps/sites/aethereos-org/public/brand/` (em
  publicação). Não modifique cores, proporções ou aplique efeitos.
- Espaço mínimo livre ao redor do logo: 16 px.

---

## 3. Uso permitido (sem autorização prévia)

Você **pode**:

- Mencionar "Aethereos" em texto editorial, notícias, posts de blog,
  reviews e análises técnicas, com referência factualmente correta.
- Usar capturas de tela do produto em conteúdo educacional, tutorial ou
  comparativo, desde que não sugira endosso oficial.
- Linkar para `https://aethereos.io` ou `https://aethereos.org` com nome
  e logo oficiais sem distorções.
- Usar o nome em currículo, perfil profissional, palestras e papers
  acadêmicos para descrever experiência.
- **Distribuições baseadas na Camada 0 (BUSL-1.1)**: manter o aviso
  "Powered by Aethereos" no rodapé e na tela "Sobre" (requisito BUSL).

---

## 4. Uso restrito (requer autorização escrita)

Você **NÃO pode**:

- Usar "Aethereos" no nome do seu produto, empresa, domínio ou serviço
  comercial sem licença.
- Vender, sublicenciar ou redistribuir Camada 1 (`apps/shell-commercial/`,
  drivers cloud) sob qualquer forma.
- Usar o logotipo oficial em material de marketing próprio sem aprovação.
- Sugerir parceria, endosso ou patrocínio oficial sem acordo escrito.
- Modificar o logo (cor, proporção, adicionar elementos) ou criar variações.
- Registrar domínios contendo "aethereos" como string parcial sem
  autorização (`aethereos-cloud.com`, `aethereos-host.io`, etc.).

Para autorização: `brand@aethereos.io`.

---

## 5. Distribuições verticais e parceiros

Distribuições autorizadas que bundlam a Camada 1 (ex: B2B AI OS Brazil em
`b2baios.com.br`) seguem acordo comercial específico. Co-branding requer
aprovação do time de marca.

---

## 6. Domínios oficiais

| Domínio             | Uso                                         |
| ------------------- | ------------------------------------------- |
| `aethereos.org`     | Site institucional + Camada 0 (open source) |
| `aethereos.io`      | Camada 1 multi-tenant comercial             |
| `b2baios.com.br`    | Distribuição vertical Brasil                |
| `idp.aethereos.com` | IdP central (Supabase Auth)                 |
| `comercio.digital`  | SaaS standalone (vertical comércio)         |
| `logitix.com.br`    | SaaS standalone (vertical logística)        |
| `kwix.com.br`       | SaaS standalone (vertical financeira)       |
| `autergon.com.br`   | SaaS standalone (vertical operações)        |

Outros domínios contendo "aethereos" não são oficiais.

---

## 7. Reclamações e violações

Se você identificar uso indevido da marca, escreva para
`brand@aethereos.io` com evidências (URL, screenshot, descrição). Casos de
phishing ou fraude usando nossa marca também devem ser encaminhados
imediatamente para `security@aethereos.io`.

Versão: 1.0.0
Última revisão: 2026-05-05
