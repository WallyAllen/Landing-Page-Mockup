import { set, type StringInputProps } from 'sanity';
import config from '../../../inmobiliaria.config.mjs';
import { BotonesOpcion } from './BotonesOpcion';
import { normalizarOpciones } from './opciones.mjs';

/** Campo de texto con lista (operación, tipo…) como botones de una sola elección. El valor guardado no cambia. */
export function OpcionesInput(props: StringInputProps & { principales?: readonly string[] }) {
  const { elementProps } = props;
  return <BotonesOpcion etiqueta={props.schemaType.title ?? props.schemaType.name}
    opciones={normalizarOpciones(props.schemaType.options?.list as never)} principales={props.principales}
    valor={props.value} readOnly={props.readOnly} alElegir={(valor) => props.onChange(set(valor))}
    describedBy={elementProps['aria-describedby']}
    // Sanity enfoca este ref cuando se pide el campo (enlace de error, validación de publicación).
    primero={{ ref: elementProps.ref }} eventos={{ onFocus: elementProps.onFocus, onBlur: elementProps.onBlur }} />;
}

/** Tipo de propiedad: `tiposPrincipales` de la configuración a la vista y el resto en «Ver más». */
export const TipoInput = (props: StringInputProps) => <OpcionesInput {...props} principales={config.tiposPrincipales} />;
