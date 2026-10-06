import { set, setIfMissing, unset, type ObjectInputProps, type RenderInputCallback, type StringInputProps } from 'sanity';
import { DireccionSugerida, type Ubicacion } from './DireccionSugerida';

/** Los cuatro campos siguen siendo los nativos de Sanity; sólo «Calle y número» suma sugerencias. */
export function UbicacionInput(props: ObjectInputProps<Ubicacion>) {
  const renderInput: RenderInputCallback = (inputProps) => {
    if (inputProps.path.at(-1) !== 'calle_y_numero') return props.renderInput(inputProps);
    const input = inputProps as StringInputProps;
    return <DireccionSugerida eventos={input.elementProps} ubicacion={props.value} readOnly={input.readOnly}
      aplicar={(campos) => props.onChange([setIfMissing({ _type: props.schemaType.name }),
        ...Object.entries(campos).map(([campo, valor]) => valor ? set(valor, [campo]) : unset([campo]))])}
      // Las props de este callback no traen renderDefault: el input nativo se dibuja con el renderInput del objeto.
      renderInput={(extra) => props.renderInput({ ...input, elementProps: { ...input.elementProps, ...extra } })} />;
  };
  return props.renderDefault({ ...props, renderInput });
}
