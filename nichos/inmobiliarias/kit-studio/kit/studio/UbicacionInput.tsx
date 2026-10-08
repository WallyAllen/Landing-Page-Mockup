import { set, setIfMissing, unset, type ObjectInputProps, type RenderFieldCallback, type RenderInputCallback, type StringInputProps } from 'sanity';
import { DireccionSugerida, type Ubicacion } from './DireccionSugerida';

/** Los campos siguen siendo los nativos de Sanity; «Calle y número» suma sugerencias y la provincia va más chica. */
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
  const renderField: RenderFieldCallback = (fieldProps) => fieldProps.name === 'provincia'
    ? <div className="kit-ubicacion__provincia">{props.renderField(fieldProps)}</div> : props.renderField(fieldProps);
  return props.renderDefault({ ...props, renderInput, renderField });
}
