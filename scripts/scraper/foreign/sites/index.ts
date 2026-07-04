// Registo de adaptadores de marketplaces estrangeiros. Para acrescentar um
// site novo: implementa a interface ForeignAdapter, regista aqui e cria a
// fonte (linha ImportSource) no painel de admin com adapter = name.

import { autoscout24 } from "./autoscout24";
import { demo } from "./demo";
import type { ForeignAdapter } from "../types";

export const FOREIGN_ADAPTERS: Record<string, ForeignAdapter> = {
  [autoscout24.name]: autoscout24,
  [demo.name]: demo,
};
