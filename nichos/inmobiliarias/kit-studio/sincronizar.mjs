// Copia kit/ a <cliente>/studio/kit/. Uso: node sincronizar.mjs <carpeta-del-cliente> [--forzar]
// La copia del cliente no se edita: si cambió a mano, se aborta y se listan los archivos (--forzar los pisa).
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const origen = fileURLToPath(new URL('./kit', import.meta.url));
const [carpeta, ...opciones] = process.argv.slice(2);
if (!carpeta) throw new Error('Uso: node sincronizar.mjs <carpeta-del-cliente> [--forzar]');
const cliente = resolve(carpeta);
const destino = join(cliente, 'studio', 'kit');
const registro = join(destino, '.version.json');

const archivos = (dir) => readdirSync(dir).flatMap((nombre) => {
  const ruta = join(dir, nombre);
  return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
});
const hashes = (dir) => Object.fromEntries(archivos(dir).filter((ruta) => ruta !== registro)
  .map((ruta) => [relative(dir, ruta).replaceAll('\\', '/'), createHash('sha256').update(readFileSync(ruta)).digest('hex')]));

if (!existsSync(join(cliente, 'studio'))) throw new Error(`${cliente} no tiene studio/`);
if (!existsSync(join(cliente, 'inmobiliaria.config.mjs')))
  throw new Error(`Falta ${join(cliente, 'inmobiliaria.config.mjs')}: copiá ejemplo.config.mjs y completalo.`);

if (existsSync(destino) && !opciones.includes('--forzar')) {
  const anterior = existsSync(registro) ? JSON.parse(readFileSync(registro, 'utf8')).archivos : {};
  const actual = hashes(destino);
  const tocados = [...new Set([...Object.keys(anterior), ...Object.keys(actual)])].filter((ruta) => anterior[ruta] !== actual[ruta]);
  if (tocados.length) throw new Error(`La copia del kit cambió a mano; llevá el cambio al molde o usá --forzar:\n  ${tocados.join('\n  ')}`);
}

rmSync(destino, { recursive: true, force: true });
cpSync(origen, destino, { recursive: true });
let version = 'sin git';
try { version = execFileSync('git', ['-C', origen, 'log', '-1', '--format=%h %cs'], { encoding: 'utf8' }).trim(); } catch {}
writeFileSync(registro, JSON.stringify({ origen: 'Landing/nichos/inmobiliarias/kit-studio', version, archivos: hashes(destino) }, null, 2) + '\n');
console.log(`Kit copiado a ${destino} (${version}).`);
