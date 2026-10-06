import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DireccionSugerida, type Ubicacion } from '../../studio/DireccionSugerida';

const campos = [['ciudad', 'Ciudad o partido'], ['localidad', 'Localidad o barrio'], ['provincia', 'Provincia'], ['zona', 'Zona']] as const;

function Fixture() {
  const [value, setValue] = useState<Ubicacion>({ provincia: 'Buenos Aires', zona: '' });
  const cambiar = (campo: keyof Ubicacion, valor: string) => setValue((actual) => ({ ...actual, [campo]: valor }));
  const estilo = { display: 'block', minHeight: 44, width: '100%', boxSizing: 'border-box' } as const;
  return <>
    <label style={{ display: 'block', margin: '16px 0' }}>Calle y número
      <DireccionSugerida ubicacion={value} eventos={{ onChange: (e) => cambiar('calle_y_numero', e.currentTarget.value), onFocus: () => {}, onBlur: () => {} }}
        aplicar={(nuevos) => setValue((actual) => ({ ...actual, ...nuevos }))}
        renderInput={(extra) => <input style={estilo} value={value.calle_y_numero ?? ''} {...extra} />} />
    </label>
    {campos.map(([campo, etiqueta]) => <label key={campo} style={{ display: 'block', margin: '16px 0' }}>{etiqueta}
      <input aria-label={etiqueta} style={estilo} value={value[campo] ?? ''} onChange={(e) => cambiar(campo, e.target.value)} /></label>)}
    <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(value)}</pre>
  </>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
