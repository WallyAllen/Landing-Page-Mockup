// Funciones de Sanity que el panel no usa, apagadas: el Studio arranca más liviano y los campos
// responden más rápido (docs/rendimiento-studio-2026-10.md de Monte: −19 a −31 % en pestañas y clics).
// Se prenden una por una con `funcionesSanity` en inmobiliaria.config.mjs.
import config from '../../../inmobiliaria.config.mjs';

const CLAVES = ['comentarios', 'lanzamientos', 'tareas', 'publicacionProgramada', 'mediaLibrary'];

/** Fragmento para defineConfig. `elegidas`: { comentarios, lanzamientos, tareas, publicacionProgramada, mediaLibrary }, todas false por defecto. */
export function funcionesDeSanity(elegidas = {}) {
  const desconocidas = Object.keys(elegidas).filter((clave) => !CLAVES.includes(clave));
  if (desconocidas.length) throw new Error(`funcionesSanity no conoce: ${desconocidas.join(', ')}. Válidas: ${CLAVES.join(', ')}`);
  const si = (clave) => ({ enabled: elegidas[clave] === true });
  return {
    releases: si('lanzamientos'), tasks: si('tareas'), mediaLibrary: si('mediaLibrary'),
    scheduledPublishing: si('publicacionProgramada'), scheduledDrafts: si('publicacionProgramada'),
    document: { comments: si('comentarios') },
  };
}

/** Para defineConfig: `...funcionesStudio`. */
export const funcionesStudio = funcionesDeSanity(config.funcionesSanity);
