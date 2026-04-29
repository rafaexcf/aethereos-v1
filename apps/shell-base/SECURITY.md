# Política de Segurança — Aethereos shell-base

## Reporte de vulnerabilidades

Para relatar uma vulnerabilidade de segurança, envie e-mail para:

**rafacostafranco@gmail.com**

Inclua:

- Descrição da vulnerabilidade
- Passos para reproduzir
- Impacto potencial
- Versão afetada

Responderemos em até 72 horas. Não divulgue publicamente antes de coordenar a correção.

## Escopo

Este repositório cobre o código da Camada 0 (shell-base, drivers-local, kernel, ui-shell, scp-registry). Todo o processamento ocorre localmente no navegador do usuário — não há servidor, banco de dados cloud, ou API de terceiros no caminho crítico desta camada.

## Primitivas de segurança em uso

- **Armazenamento:** OPFS (Origin Private File System) — isolado por origem pelo navegador.
- **Criptografia:** Web Crypto API nativa (AES-GCM, Ed25519, PBKDF2 com 600.000 iterações).
- **Chaves privadas:** nunca saem do dispositivo; armazenadas criptografadas com chave derivada da passphrase do usuário.
- **Sem tracking, sem analytics, sem cookies de terceiros.**
