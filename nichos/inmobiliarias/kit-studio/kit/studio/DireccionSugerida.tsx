import { useEffect, useId, useRef, useState, type FocusEvent, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { puedeBuscarDireccion, sugerenciasDireccion, urlDireccion } from '../direccion/georef.mjs';
import { detalleDireccion, urlDetalleDireccion } from '../direccion/detalle.mjs';
import { camposDeDetalle, camposDeSugerencia } from './ubicacion-sugerida.mjs';
import './direccion-sugerida.css';

type Opcion = ReturnType<typeof sugerenciasDireccion>[number];
type Campos = ReturnType<typeof camposDeSugerencia>;
export type Ubicacion = { calle_y_numero?: string; ciudad?: string; localidad?: string; provincia?: string; zona?: string };
type Eventos = {
  onChange: (event: FormEvent<HTMLInputElement>) => void;
  onFocus: (event: FocusEvent<HTMLInputElement>) => void;
  onBlur: (event: FocusEvent<HTMLInputElement>) => void;
  'aria-describedby'?: string;
};

const pedir = (url: string, signal: AbortSignal) => fetch(url, { signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' })
  .then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); });

/**
 * Convierte «Calle y número» en un combobox de Georef sin reemplazar el input: `renderInput`
 * recibe los eventos y atributos extra. Si Georef falla, el campo sigue siendo texto libre.
 */
export function DireccionSugerida({ eventos, ubicacion, aplicar, renderInput, readOnly }: {
  eventos: Eventos;
  ubicacion: Ubicacion | undefined;
  aplicar: (campos: Partial<Campos>) => void;
  renderInput: (extra: Record<string, unknown>) => ReactNode;
  readOnly?: boolean;
}) {
  const [consulta, setConsulta] = useState('');
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(-1);
  const [estado, setEstado] = useState('');
  const lista = useId();
  const ayuda = useId();
  const cerrado = useRef(false);
  const detalle = useRef<AbortController | null>(null);
  const ultima = useRef(ubicacion);
  ultima.current = ubicacion;
  const visible = abierto && opciones.length > 0 && !readOnly;
  useEffect(() => () => detalle.current?.abort(), []);

  // Sólo busca lo que el editor escribe: abrir un aviso existente no consulta Georef.
  useEffect(() => {
    if (!puedeBuscarDireccion(consulta)) return;
    let vigente = true;
    const controller = new AbortController();
    let limite: ReturnType<typeof setTimeout> | undefined;
    const demora = setTimeout(async () => {
      setEstado('Buscando direcciones…');
      limite = setTimeout(() => controller.abort(), 8000);
      try {
        const resultados = sugerenciasDireccion(await pedir(urlDireccion(consulta), controller.signal));
        if (!vigente) return;
        setOpciones(resultados);
        setActivo(-1);
        setAbierto(!cerrado.current);
        setEstado(resultados.length ? 'Elegí una dirección para completar la ubicación.' : 'Sin coincidencias en Georef. Completá los campos a mano.');
      } catch {
        if (vigente) setEstado('No pudimos buscar direcciones. Completá los campos a mano.');
      } finally { clearTimeout(limite); }
    }, 600);
    return () => { vigente = false; clearTimeout(demora); clearTimeout(limite); controller.abort(); };
  }, [consulta]);

  async function elegir(opcion: Opcion) {
    detalle.current?.abort();
    const campos = camposDeSugerencia(opcion);
    setOpciones([]); setAbierto(false); setActivo(-1); setConsulta('');
    aplicar(campos);
    // El formulario devuelve el valor nuevo recién en el próximo render (en Sanity, tras el patch):
    // Photon puede responder antes, así que la comparación parte de lo que acabamos de aplicar.
    ultima.current = { ...ultima.current, ...campos };
    setEstado('Ubicación completada. Revisá los campos y corregilos si hace falta.');
    const url = urlDetalleDireccion(opcion);
    if (!url) return;
    const controller = new AbortController();
    detalle.current = controller;
    const limite = setTimeout(() => controller.abort(), 8000);
    try {
      const nuevos = camposDeDetalle(ultima.current, campos, detalleDireccion(await pedir(url, controller.signal), opcion));
      if (detalle.current !== controller) return;
      if (Object.keys(nuevos).length) aplicar(nuevos);
      if (!nuevos.localidad && !campos.localidad) setEstado('Completá el barrio a mano.');
    } catch {
      if (detalle.current === controller && !campos.localidad) setEstado('Completá el barrio a mano.');
    } finally { clearTimeout(limite); }
  }

  function tecla(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape' && visible) { event.preventDefault(); event.stopPropagation(); cerrado.current = true; setAbierto(false); setActivo(-1); return; }
    if (event.key === 'Tab') { cerrado.current = true; setAbierto(false); return; }
    if (!opciones.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      cerrado.current = false;
      setAbierto(true);
      const siguiente = event.key === 'ArrowDown' ? (activo + 1) % opciones.length : (activo <= 0 ? opciones.length - 1 : activo - 1);
      setActivo(siguiente);
      document.getElementById(`${lista}-${siguiente}`)?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter' && visible && activo >= 0) {
      event.preventDefault();
      elegir(opciones[activo]);
    }
  }

  return <div className="direccion-sugerida">
    {renderInput({
      role: 'combobox', autoComplete: 'off', 'aria-autocomplete': 'list', 'aria-expanded': visible,
      'aria-controls': visible ? lista : undefined,
      'aria-activedescendant': visible && activo >= 0 ? `${lista}-${activo}` : undefined,
      'aria-describedby': [eventos['aria-describedby'], ayuda].filter(Boolean).join(' '),
      onKeyDown: tecla,
      onChange: (event: FormEvent<HTMLInputElement>) => {
        eventos.onChange(event);
        detalle.current?.abort();
        cerrado.current = false;
        setOpciones([]); setAbierto(false); setActivo(-1); setEstado('');
        setConsulta(event.currentTarget.value);
      },
      onFocus: (event: FocusEvent<HTMLInputElement>) => { eventos.onFocus(event); cerrado.current = false; setAbierto(true); },
      onBlur: (event: FocusEvent<HTMLInputElement>) => { eventos.onBlur(event); cerrado.current = true; setAbierto(false); },
    })}
    {visible && <ul id={lista} role="listbox" aria-label="Direcciones sugeridas" className="direccion-sugerida__opciones">
      {opciones.map((opcion, index) => <li key={`${opcion.zona}:${opcion.valor}`} id={`${lista}-${index}`} role="option" aria-selected={index === activo}
        onPointerDown={(event) => event.preventDefault()} onClick={() => elegir(opcion)}>{opcion.valor}</li>)}
    </ul>}
    <p className="direccion-sugerida__ayuda" id={ayuda}>
      <span role="status">{estado || 'Escribí calle y número para ver sugerencias. Todos los campos se pueden corregir.'}</span>{' '}
      Direcciones: Georef. Localidad: Photon, con datos de <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>.
    </p>
  </div>;
}
