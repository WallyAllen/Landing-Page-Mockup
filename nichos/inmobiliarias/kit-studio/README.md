# Kit Studio inmobiliario

Panel de carga de propiedades para Sanity Studio, reutilizable entre inmobiliarias. Mismo principio
que los moldes de landing: **personalizar para un cliente = tocar solo su `inmobiliaria.config.mjs`**.
Si para personalizar hace falta editar el kit, falta un campo en la configuración: se agrega acá y
se vuelve a sincronizar.

## Qué trae

| Ruta | Qué es |
|---|---|
| `kit/studio/esquema.ts` | Esquema de Propiedad (`tiposPropiedad`) con listas y valores iniciales de la configuración |
| `kit/studio/PropertyStages.tsx` + `PropertyWizardInput.tsx` + `property-workflow.mjs` | Asistente por etapas: guarda borradores, valida por etapa, lleva al campo con error. La revisión muestra un resumen de lo cargado con «Editar» en cada dato. El slug se genera solo (calle y número + barrio) al pasar de la primera etapa o al guardar, y queda en el grupo colapsado «Datos internos» con fuentes y notas |
| `kit/studio/requisitos.mjs` | Obligatorios para publicar, como en ZonaProp: superficie total y cubierta, antigüedad, y ambientes, dormitorios y baños en viviendas (`tiposVivienda`, `tiposSinCubierta` en la configuración). Los usan el botón Continuar y la validación de publicación |
| `kit/studio/OpcionesInput.tsx` + `BotonesOpcion.tsx` + `opciones.mjs` | Operación, tipo, moneda y estado como botones grandes de una sola elección, como en ZonaProp. Los tipos de `tiposPrincipales` quedan a la vista y el resto en «Ver más». Sanity enfoca el primer botón cuando una validación pide el campo |
| `kit/studio/CaracteristicasInput.tsx` | Casillas, servicios, facilidades y antigüedad como botones para tocar, igual que en los portales. Los datos guardados no cambian |
| `kit/studio/DireccionSugerida.tsx` + `UbicacionInput.tsx` | Ubicación en el orden de ZonaProp (calle y número, zona, ciudad o partido, barrio). Combobox de dirección: Georef (todo el país) + Photon para barrio y tildes. La provincia se completa sola y va al final, más chica |
| `kit/studio/marca.tsx` | Nombre y símbolo del cliente para `defineConfig` |
| `kit/direccion/` | JS sin dependencias: Georef, Photon y las 24 provincias. Lo usa también el sitio (formulario de tasación) |
| `kit/tests/` | Pruebas unitarias y de interfaz; corren dentro del cliente |

Todo usa `@sanity/ui` y los tokens del tema: funciona en claro y en oscuro. La marca va en el nombre,
el símbolo y la tipografía de títulos. **No** en los colores: `buildLegacyTheme`, el único tema de
Sanity 6 que acepta un color propio, fija el Studio en claro.

## Usarlo en un cliente

1. Copiar `ejemplo.config.mjs` a la raíz del cliente como `inmobiliaria.config.mjs` y completarlo.
2. Desde esta carpeta: `node sincronizar.mjs ../../../../clientes/<cliente>` → deja la copia en
   `<cliente>/studio/kit/`.
3. En el Studio del cliente:
   ```ts
   // sanity.config.ts
   import { marcaStudio } from './kit/studio/marca';
   export default defineConfig({ ...marcaStudio, /* projectId, dataset, plugins */ schema: { types: schemaTypes } });
   // schemaTypes/index.ts
   import { tiposPropiedad } from '../kit/studio/esquema';
   export const schemaTypes = [...tiposPropiedad /* , tipos propios del cliente */];
   ```
4. Scripts del Studio: `"test": "node --test kit/tests/*.test.mjs tests/*.test.mjs"` y
   `"test:ui": "node --test --test-concurrency=1 kit/tests/ui/*.test.mjs"`.

El Studio necesita `sanity`, `@sanity/ui`, `react` y, para las pruebas de interfaz, `vite` y `playwright`.

## Actualizar un cliente

Cambiar el molde acá, probarlo en un cliente y volver a correr `sincronizar.mjs` en cada cliente que
lo use. El script se niega a pisar una copia editada a mano (compara contra `.version.json`) y
anota en ese archivo de qué commit salió la copia.

Un cambio en los **valores** de una lista (no en el título) exige migrar los documentos ya cargados.
