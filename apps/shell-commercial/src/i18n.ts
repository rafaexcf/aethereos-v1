/**
 * Super Sprint C / MX214 — i18n setup.
 *
 * react-i18next + i18next-browser-languagedetector.
 * Resources carregados estaticamente via import (Vite os bundla como JSON).
 *
 * Detecção: localStorage 'aethereos-language' → navegador → fallback pt-BR.
 *
 * Adicionar nova lingua:
 *   1. Criar locales/<lang>/<ns>.json em paralelo a pt-BR/
 *   2. Importar abaixo e adicionar ao bloco resources.
 *   3. Adicionar option em components/LanguageSwitcher.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// PT-BR namespaces
import commonPtBR from "./locales/pt-BR/common.json";
import shellPtBR from "./locales/pt-BR/shell.json";
import gestorPtBR from "./locales/pt-BR/gestor.json";
import configuracoesPtBR from "./locales/pt-BR/configuracoes.json";
import drivePtBR from "./locales/pt-BR/drive.json";
import pessoasPtBR from "./locales/pt-BR/pessoas.json";
import chatPtBR from "./locales/pt-BR/chat.json";
import tarefasPtBR from "./locales/pt-BR/tarefas.json";
import kanbanPtBR from "./locales/pt-BR/kanban.json";
import notasPtBR from "./locales/pt-BR/notas.json";
import calendarioPtBR from "./locales/pt-BR/calendario.json";
import magicStorePtBR from "./locales/pt-BR/magic-store.json";
import copilotPtBR from "./locales/pt-BR/copilot.json";
import governancaPtBR from "./locales/pt-BR/governanca.json";
import auditoriaPtBR from "./locales/pt-BR/auditoria.json";
import lixeiraPtBR from "./locales/pt-BR/lixeira.json";
import enquetesPtBR from "./locales/pt-BR/enquetes.json";
import segurancaPtBR from "./locales/pt-BR/seguranca.json";
import rhPtBR from "./locales/pt-BR/rh.json";
import calculadoraPtBR from "./locales/pt-BR/calculadora.json";
import relogioPtBR from "./locales/pt-BR/relogio.json";
import weatherPtBR from "./locales/pt-BR/weather.json";
import cameraPtBR from "./locales/pt-BR/camera.json";
import gravadorPtBR from "./locales/pt-BR/gravador.json";
import agendaPtBR from "./locales/pt-BR/agenda.json";
import pdfPtBR from "./locales/pt-BR/pdf.json";
import navegadorPtBR from "./locales/pt-BR/navegador.json";
import automacoesPtBR from "./locales/pt-BR/automacoes.json";
import reuniaoPtBR from "./locales/pt-BR/reuniao.json";
import notificationsPtBR from "./locales/pt-BR/notifications.json";

// EN namespaces
import commonEn from "./locales/en/common.json";
import shellEn from "./locales/en/shell.json";
import gestorEn from "./locales/en/gestor.json";
import configuracoesEn from "./locales/en/configuracoes.json";
import driveEn from "./locales/en/drive.json";
import pessoasEn from "./locales/en/pessoas.json";
import chatEn from "./locales/en/chat.json";
import tarefasEn from "./locales/en/tarefas.json";
import kanbanEn from "./locales/en/kanban.json";
import notasEn from "./locales/en/notas.json";
import calendarioEn from "./locales/en/calendario.json";
import magicStoreEn from "./locales/en/magic-store.json";
import copilotEn from "./locales/en/copilot.json";
import governancaEn from "./locales/en/governanca.json";
import auditoriaEn from "./locales/en/auditoria.json";
import lixeiraEn from "./locales/en/lixeira.json";
import enquetesEn from "./locales/en/enquetes.json";
import segurancaEn from "./locales/en/seguranca.json";
import rhEn from "./locales/en/rh.json";
import calculadoraEn from "./locales/en/calculadora.json";
import relogioEn from "./locales/en/relogio.json";
import weatherEn from "./locales/en/weather.json";
import cameraEn from "./locales/en/camera.json";
import gravadorEn from "./locales/en/gravador.json";
import agendaEn from "./locales/en/agenda.json";
import pdfEn from "./locales/en/pdf.json";
import navegadorEn from "./locales/en/navegador.json";
import automacoesEn from "./locales/en/automacoes.json";
import reuniaoEn from "./locales/en/reuniao.json";
import notificationsEn from "./locales/en/notifications.json";

const RESOURCES = {
  "pt-BR": {
    common: commonPtBR,
    shell: shellPtBR,
    gestor: gestorPtBR,
    configuracoes: configuracoesPtBR,
    drive: drivePtBR,
    pessoas: pessoasPtBR,
    chat: chatPtBR,
    tarefas: tarefasPtBR,
    kanban: kanbanPtBR,
    notas: notasPtBR,
    calendario: calendarioPtBR,
    "magic-store": magicStorePtBR,
    copilot: copilotPtBR,
    governanca: governancaPtBR,
    auditoria: auditoriaPtBR,
    lixeira: lixeiraPtBR,
    enquetes: enquetesPtBR,
    seguranca: segurancaPtBR,
    rh: rhPtBR,
    calculadora: calculadoraPtBR,
    relogio: relogioPtBR,
    weather: weatherPtBR,
    camera: cameraPtBR,
    gravador: gravadorPtBR,
    agenda: agendaPtBR,
    pdf: pdfPtBR,
    navegador: navegadorPtBR,
    automacoes: automacoesPtBR,
    reuniao: reuniaoPtBR,
    notifications: notificationsPtBR,
  },
  en: {
    common: commonEn,
    shell: shellEn,
    gestor: gestorEn,
    configuracoes: configuracoesEn,
    drive: driveEn,
    pessoas: pessoasEn,
    chat: chatEn,
    tarefas: tarefasEn,
    kanban: kanbanEn,
    notas: notasEn,
    calendario: calendarioEn,
    "magic-store": magicStoreEn,
    copilot: copilotEn,
    governanca: governancaEn,
    auditoria: auditoriaEn,
    lixeira: lixeiraEn,
    enquetes: enquetesEn,
    seguranca: segurancaEn,
    rh: rhEn,
    calculadora: calculadoraEn,
    relogio: relogioEn,
    weather: weatherEn,
    camera: cameraEn,
    gravador: gravadorEn,
    agenda: agendaEn,
    pdf: pdfEn,
    navegador: navegadorEn,
    automacoes: automacoesEn,
    reuniao: reuniaoEn,
    notifications: notificationsEn,
  },
};

// HOTFIX — main.tsx aguarda esta promise antes de createRoot.
// Sem isso, a primeira render de componentes que usam t()
// (ex: CommandCenter, login, LockScreen) acontecia ANTES do
// sinal "ready" do i18next, e t() retornava a chave literal
// (ex: botão logout exibia "topbar.menu_sign_out").
export const i18nReady: Promise<unknown> = i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: RESOURCES,
    fallbackLng: "pt-BR",
    supportedLngs: ["pt-BR", "en"],
    nonExplicitSupportedLngs: true, // 'pt' falls back to 'pt-BR'
    defaultNS: "common",
    interpolation: { escapeValue: false }, // React já escapa
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "aethereos-language",
    },
    react: {
      useSuspense: false, // resources são síncronos (estáticos)
    },
  });

export default i18n;
