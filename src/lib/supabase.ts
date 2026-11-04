import { createClient } from "@supabase/supabase-js";
import { fetchConMemoria } from "./memoria";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en el entorno."
  );
}

/* Todo lo que la app le pide a Supabase pasa por la memoria de
   consultas: junta lo repetido, recuerda un rato lo que está en su
   tabla y lo olvida en cuanto algo cambia (ver lib/memoria.ts). */
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  global: { fetch: fetchConMemoria },
});