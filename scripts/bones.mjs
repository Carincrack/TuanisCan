import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

/* ─────────────────────────────────────────────────────────────
   GENERAR LOS HUESOS

   Envoltorio de `npx boneyard-js build`. Existe por una razón muy
   concreta: Playwright guarda el navegador que descarga en
   `%LOCALAPPDATA%\\ms-playwright`, o sea en C:, y en esta máquina C:
   está al 99 % —2 GB libres de 119—. Chromium pesa unos 150 MB y el
   resto de las cachés de este equipo ya viven en F:.

   `PLAYWRIGHT_BROWSERS_PATH` solo se lee del entorno, así que hay que
   ponerlo antes de invocar. Meterlo en un script de npm con `set` o
   `export` ataría el proyecto a un sistema operativo; desde Node
   funciona igual en los tres.

   Uso:
     npm run bones                 · captura contra el servidor de dev
     npm run bones -- --force      · rehace todos, no solo los nuevos
     npm run bones -- http://…     · origen explícito
   ───────────────────────────────────────────────────────────── */

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const navegadores = join(raiz, ".cache", "playwright");

mkdirSync(navegadores, { recursive: true });

const entorno = {
  ...process.env,
  PLAYWRIGHT_BROWSERS_PATH: navegadores,
};

/* La captura entra por la página de captura y no por la raíz. El
   rastreador de boneyard descubre páginas siguiendo enlaces, y todas
   las pantallas de este sistema están detrás del login de Supabase:
   saliendo de "/" solo llegaría a la portada. */
const argumentos = process.argv.slice(2);
const traeOrigen = argumentos.some((a) => a.startsWith("http"));
const finales = traeOrigen ? argumentos : ["http://localhost:5173/esqueletos", ...argumentos];

const npx = process.platform === "win32" ? "npx.cmd" : "npx";

const correr = (comando, args) =>
  new Promise((cumplir, fallar) => {
    const hijo = spawn(comando, args, {
      cwd: raiz,
      env: entorno,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    hijo.on("error", fallar);
    hijo.on("close", (codigo) =>
      codigo === 0 ? cumplir() : fallar(new Error(`${comando} salió con ${codigo}`)),
    );
  });

console.log(`Navegadores de Playwright en: ${navegadores}\n`);

await correr(npx, ["playwright", "install", "chromium"]);
await correr(npx, ["boneyard-js", "build", ...finales]);
