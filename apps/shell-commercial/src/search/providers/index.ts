import type { SearchProvider } from "../types";
import { actionsProvider } from "./actions";
import { appsProvider } from "./apps";
import { notesProvider } from "./notes";
import { tasksProvider } from "./tasks";
import { contactsProvider } from "./contacts";
import { filesProvider } from "./files";
import { pollsProvider } from "./polls";
import { kanbanProvider } from "./kanban";
import { chatProvider } from "./chat";
import { voiceProvider } from "./voice";
import { mediaProvider } from "./media";

/**
 * Ordered list of search providers.
 * To register a new provider for a future app, import it and append it here.
 * Each provider must be safe (return [] on any error, never throw).
 */
export const SEARCH_PROVIDERS: SearchProvider[] = [
  actionsProvider,
  appsProvider,
  notesProvider,
  tasksProvider,
  contactsProvider,
  filesProvider,
  pollsProvider,
  kanbanProvider,
  chatProvider,
  voiceProvider,
  mediaProvider,
];
