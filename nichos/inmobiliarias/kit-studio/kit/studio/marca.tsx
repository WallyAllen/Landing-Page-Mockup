// Marca del cliente en el Studio: nombre y símbolo. Los colores quedan los del tema de Sanity a propósito:
// buildLegacyTheme (único que acepta un color propio) fija el Studio en claro y rompe el modo oscuro.
import config from '../../../inmobiliaria.config.mjs';

const Simbolo = () => <img src={config.marca.simbolo} alt="" width={24} height={24} style={{ objectFit: 'contain' }} />;

/** Para defineConfig: `...marcaStudio`. */
export const marcaStudio = {
  title: config.marca.nombre,
  ...(config.marca.simbolo ? { icon: Simbolo } : {}),
};
