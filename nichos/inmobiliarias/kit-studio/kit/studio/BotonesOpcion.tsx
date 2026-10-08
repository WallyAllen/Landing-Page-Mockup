import { useId, useState } from 'react';
import { repartirOpciones } from './opciones.mjs';
import './caracteristicas.css';

type Opcion = { title: string; value: string };

/**
 * Una sola elección como botones grandes (ZonaProp), sin Sanity: lo adapta OpcionesInput.
 * Botones nativos: se recorren con Tab y se eligen con Enter o espacio. `primero` va al primer
 * botón del grupo; ahí Sanity pone el foco cuando una validación pide el campo.
 */
export function BotonesOpcion({ etiqueta, opciones, principales, valor, alElegir, readOnly, primero, eventos, describedBy, compacto }: {
  etiqueta: string;
  opciones: Opcion[];
  principales?: readonly string[];
  valor?: string;
  alElegir: (valor: string) => void;
  readOnly?: boolean;
  primero?: Record<string, unknown>;
  eventos?: Record<string, unknown>;
  describedBy?: string;
  compacto?: boolean;
}) {
  const { visibles, resto, valorEnResto } = repartirOpciones(opciones, principales, valor);
  const [abierto, setAbierto] = useState(false);
  const mostrarResto = abierto || valorEnResto;
  const idResto = useId();
  const boton = (opcion: Opcion, indice: number) => <button key={opcion.value} type="button" className={compacto ? 'kit-chip' : 'kit-chip kit-chip--grande'}
    aria-pressed={valor === opcion.value} disabled={readOnly} onClick={() => { if (valor !== opcion.value) alElegir(opcion.value); }}
    {...eventos} {...(indice === 0 ? primero : {})}>
    {opcion.title}{valor === opcion.value && <span aria-hidden="true">{' ✓'}</span>}</button>;

  return <div className="kit-opciones" role="group" aria-label={etiqueta} aria-describedby={describedBy}>
    <div className={compacto ? 'kit-chips kit-chips--compactos' : 'kit-chips kit-chips--grandes'}>{visibles.map(boton)}</div>
    {resto.length > 0 && <>
      <div id={idResto} className="kit-chips kit-chips--grandes" hidden={!mostrarResto}>{resto.map((o, i) => boton(o, visibles.length + i))}</div>
      {/* Con el valor guardado en el resto, el resto queda abierto: no se puede esconder la elección. */}
      {!valorEnResto && <button type="button" className="kit-opciones__mas" aria-expanded={mostrarResto} aria-controls={idResto}
        onClick={() => setAbierto(!abierto)}>{mostrarResto ? 'Ver menos' : `Ver más (${resto.length})`}</button>}
    </>}
  </div>;
}
