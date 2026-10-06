import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import config from '../../../../inmobiliaria.config.mjs';

// Lo que espera la prueba sale de la configuración del cliente que tiene el kit.
const zonaCapital = config.zonas.find((zona) => zona.capital)?.nombre ?? '';
const zonaSanIsidro = config.zonas.find((zona) => zona.partidos?.includes('San Isidro'))?.nombre ?? '';

// Respuestas simuladas con datos ficticios: la prueba no sale a Georef ni a Photon.
const direccion = (provincia, departamento, localidad, lat) => ({
  nomenclatura: `CALLE FICTICIA 2335, ${departamento}`, provincia: { id: provincia }, calle: { nombre: 'CALLE FICTICIA' },
  altura: { valor: 2335 }, departamento: { nombre: departamento }, localidad_censal: { nombre: localidad }, ubicacion: { lat, lon: -58.4 },
});
const georef = { direcciones: [direccion('02', 'Comuna 2', 'Ciudad Autónoma de Buenos Aires', -34.59), direccion('06', 'San Isidro', 'Martínez', -34.49)] };
const photon = { features: [{ geometry: { coordinates: [-58.4, -34.59] }, properties: { countrycode: 'AR', city: 'Buenos Aires', district: 'Barrio Ficticio', postcode: 'C1000', type: 'house', street: 'Calle Fictícia', housenumber: '2331' } }] };

test('Calle y número sugiere direcciones, completa la ubicación y tolera la caída de Georef', async () => {
  const server = await createServer({ configFile: false, root: fileURLToPath(new URL('../../../', import.meta.url)),
    cacheDir: '.test-cache/vite', server: { host: '127.0.0.1', port: 0, fs: { allow: [fileURLToPath(new URL('../../../../', import.meta.url))] } },
    optimizeDeps: { include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] } });
  await server.listen();
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = []; page.on('pageerror', (error) => errors.push(error.message));
      let georefCaido = false;
      await page.route('https://apis.datos.gob.ar/**', (route) => georefCaido ? route.fulfill({ status: 503, body: '' })
        : route.fulfill({ json: georef, headers: { 'access-control-allow-origin': '*' } }));
      await page.route('https://photon.komoot.io/**', (route) => route.fulfill({ json: photon, headers: { 'access-control-allow-origin': '*' } }));
      await page.goto(`${server.resolvedUrls.local[0]}kit/tests/ui/ubicacion.html`);
      const calle = page.getByRole('combobox', { name: 'Calle y número' });
      await calle.fill('Ficticia 2335');
      await page.getByRole('listbox', { name: 'Direcciones sugeridas' }).waitFor();
      assert.equal(await page.getByRole('option').count(), 2);
      assert.equal(await calle.getAttribute('aria-expanded'), 'true');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

      // Teclado: la primera es de Capital; la localidad llega después desde Photon.
      await calle.press('ArrowDown');
      await calle.press('Enter');
      await page.waitForFunction(() => document.querySelector('[aria-label="Localidad o barrio"]').value === 'Barrio Ficticio');
      assert.equal(await calle.inputValue(), 'Calle Fictícia 2335'); // tildes de OSM
      assert.equal(await page.getByLabel('Ciudad o partido').inputValue(), 'CABA');
      assert.equal(await page.getByLabel('Provincia', { exact: true }).inputValue(), 'Ciudad Autónoma de Buenos Aires');
      assert.equal(await page.getByLabel('Zona', { exact: true }).inputValue(), zonaCapital);
      assert.equal(await page.getByRole('listbox').count(), 0);

      // Clic en la de provincia y corrección manual de los campos completados.
      await calle.fill('Ficticia 2335 ');
      await page.getByRole('option', { name: /San Isidro/ }).click();
      await page.waitForFunction(() => document.querySelector('[aria-label="Ciudad o partido"]').value === 'San Isidro');
      assert.equal(await page.getByLabel('Localidad o barrio').inputValue(), 'Martínez');
      assert.equal(await page.getByLabel('Provincia', { exact: true }).inputValue(), 'Buenos Aires');
      assert.equal(await page.getByLabel('Zona', { exact: true }).inputValue(), zonaSanIsidro);
      await page.getByLabel('Localidad o barrio').fill('Corregida a mano');
      await calle.fill('CALLE FICTICIA 2337');
      assert.match(await page.locator('pre').textContent(), /"calle_y_numero":"CALLE FICTICIA 2337".*"localidad":"Corregida a mano"/);

      // Sin Georef el campo sigue siendo texto libre.
      georefCaido = true;
      await calle.fill('Otra Ficticia 100');
      await page.getByText('No pudimos buscar direcciones. Completá los campos a mano.').waitFor();
      assert.equal(await page.getByRole('listbox').count(), 0);
      assert.equal(await calle.inputValue(), 'Otra Ficticia 100');
      assert.equal(await page.getByLabel('Ciudad o partido').inputValue(), 'San Isidro');
      await page.screenshot({ path: fileURLToPath(new URL(`../../../.test-cache/ubicacion-${width}.png`, import.meta.url)), fullPage: true });
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); await server.close(); }
});
