import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

test('Interfaz por etapas a 390 y 1440 px: navegación, foco, confirmación, error y retoma aislados', async () => {
  const server = await createServer({ configFile: false, root: fileURLToPath(new URL('../../../', import.meta.url)),
    cacheDir: '.test-cache/vite', server: { host: '127.0.0.1', port: 0, fs: { allow: [fileURLToPath(new URL('../../../../', import.meta.url))] } },
    optimizeDeps: { include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] } });
  await server.listen();
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = []; page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${server.resolvedUrls.local[0]}kit/tests/ui/index.html`);
      await page.getByRole('heading', { name: /Etapa 1 de 3/ }).waitFor();
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.getByRole('alert').waitFor();
      assert.match(await page.getByRole('heading', { level: 2 }).textContent(), /Etapa 1/);
      for (const [label, value] of [['Operación', 'venta'], ['Tipo de propiedad', 'departamento'], ['Calle y número', 'Dirección de prueba'], ['Ciudad o partido', 'Partido de prueba'], ['Localidad o barrio', 'Barrio de prueba'], ['Provincia', 'Buenos Aires'], ['Zona', 'GBA Norte']]) await page.getByLabel(label, { exact: true }).fill(value);
      await page.getByRole('button', { name: 'Continuar' }).click();
      // Como en ZonaProp: sin baños no se pasa de Características.
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.getByRole('alert').waitFor();
      assert.match(await page.getByRole('alert').textContent(), /baños/);
      await page.getByLabel('Baños', { exact: true }).fill('2');
      await page.getByRole('button', { name: 'Volver', exact: true }).click();
      assert.equal(await page.getByLabel('Calle y número', { exact: true }).inputValue(), 'Dirección de prueba');
      // Petición externa equivalente a un enlace de validación de Sanity a un campo anidado.
      await page.evaluate(() => window.qa.focus(['ambientes', 'banos']));
      await page.getByLabel('Baños', { exact: true }).waitFor();
      await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Baños');
      assert.equal(await page.getByLabel('Baños', { exact: true }).inputValue(), '2');
      // La petición anterior no debe impedir la navegación voluntaria.
      await page.getByRole('button', { name: 'Volver', exact: true }).click();
      assert.match(await page.getByRole('heading', { level: 2 }).textContent(), /Etapa 1/);
      await page.getByRole('button', { name: 'Continuar' }).click();
      assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'H2');
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.getByLabel('Descripción', { exact: true }).fill('Contenido de prueba');
      assert.equal(await page.locator('progress').getAttribute('value'), '3');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.getByRole('button', { name: 'Guardar y salir' }).click();
      await page.waitForFunction(() => window.qa.readCount() > 0);
      assert.equal(await page.getByText('Cierre confirmado (sólo prueba aislada)').count(), 0);
      assert.ok(await page.getByRole('button', { name: 'Guardar y salir' }).isDisabled());
      await page.evaluate(() => window.qa.ack());
      await page.getByText('Cierre confirmado (sólo prueba aislada)').waitFor();
      assert.match(await page.locator('pre').textContent(), /"campo_antiguo":"conservar"/);
      await page.getByRole('button', { name: 'Retomar en la prueba' }).click();
      assert.equal(await page.getByLabel('Calle y número', { exact: true }).inputValue(), 'Dirección de prueba');
      await page.getByLabel('Calle y número', { exact: true }).fill('Cambio posterior');
      await page.evaluate(() => window.qa.fail());
      await page.getByRole('button', { name: 'Guardar y salir' }).click();
      await page.getByRole('alert').waitFor();
      assert.match(await page.getByRole('alert').textContent(), /Error de red/);
      assert.equal(await page.getByLabel('Calle y número', { exact: true }).inputValue(), 'Cambio posterior');
      assert.ok(await page.getByRole('button', { name: 'Guardar y salir' }).isEnabled());
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('role')), 'alert');
      await page.screenshot({ path: fileURLToPath(new URL(`../../../.test-cache/panel-${width}.png`, import.meta.url)), fullPage: true });
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); await server.close(); }
});
