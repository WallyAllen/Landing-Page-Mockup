# landings/ — proyectos de un cliente puntual

Acá van los bocetos hechos **para un prospecto concreto**, con su marca y sus
datos: no son moldes reutilizables del nicho (eso es `mockup/`).

## La regla de corte

Un proyecto vive acá **mientras no haya plata puesta**. En cuanto el cliente
paga la seña, se muda a su propio repositorio, fuera de esta biblioteca:

```
.LandingPage/
  Landing/     <- vitrina y bocetos: esto
  clientes/    <- proyectos con seña pagada, un repo cada uno
```

Por qué se muda:

- **URL limpia.** Acá la dirección es
  `…/nichos/<rubro>/landings/<cliente>/archivo.html`. Con repo propio es
  `<cliente>.pages.dev/` y después el dominio del cliente, sin mover nada.
- **Este repositorio es público.** Los datos reales del cliente (teléfonos,
  direcciones, propiedades) no tienen por qué estar acá.
- **Es entregable.** Un repo propio se transfiere, se le da acceso al cliente
  y tiene un historial que se entiende solo.
- **El deploy no arrastra la galería entera.**

Excepción técnica: un proyecto que **no sea un HTML autocontenido** (Astro,
Next.js, cualquier cosa con `node_modules` y build propio) va a `clientes/`
desde el día uno, aunque todavía no haya seña. No entra en una biblioteca de
archivos únicos.

## Cuándo aparece en la galería (`index.html`)

Cuando el cliente **ya está publicado** y acordó que se puede mostrar. La card
apunta a su URL real, nunca a un archivo de este repo. Un boceto en curso no
se linkea desde la galería pública.
