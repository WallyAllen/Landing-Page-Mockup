import { useEffect, useRef, useState } from 'react';
import { TextInput } from '@sanity/ui';
import { set, setIfMissing, unset, type ObjectInputProps } from 'sanity';
import './caracteristicas.css';

// Botones para tocar, como en los portales: cada casilla es un botón que se prende y se apaga,
// en vez de una lista de interruptores. Los datos guardados no cambian (booleanos y opciones).
type Campo = { name: string; type: { jsonType?: string; title?: string; options?: { list?: unknown[] } } };
type Opcion = { title?: string; value: string };
const opciones = (lista: unknown[] = []): Opcion[] => lista.map((item) =>
  typeof item === 'string' ? { title: item, value: item } : item as Opcion);
const enfocado = (props: ObjectInputProps) => Boolean((props as { focused?: boolean }).focused);

function useFocoInicial(props: ObjectInputProps) {
  const grupo = useRef<HTMLDivElement>(null);
  const focused = enfocado(props);
  useEffect(() => { if (focused) grupo.current?.querySelector<HTMLButtonElement>('button')?.focus(); }, [focused]);
  return grupo;
}

/** Objeto de casillas (booleanos) y opciones únicas (por ejemplo Mascotas) como botones. */
export function CasillasInput(props: ObjectInputProps) {
  const valor = (props.value ?? {}) as Record<string, unknown>;
  const grupo = useFocoInicial(props);
  const cambiar = (campo: string, nuevo: unknown) => props.onChange([setIfMissing({ _type: props.schemaType.name }),
    nuevo === undefined ? unset([campo]) : set(nuevo, [campo])]);
  const botones = (props.schemaType.fields as Campo[]).flatMap((campo) => {
    if (campo.type.jsonType === 'boolean') {
      const activo = valor[campo.name] === true;
      return [{ key: campo.name, texto: campo.type.title ?? campo.name, activo, alTocar: () => cambiar(campo.name, !activo) }];
    }
    if (campo.type.jsonType === 'string' && campo.type.options?.list) {
      return opciones(campo.type.options.list).map((opcion) => {
        const activo = valor[campo.name] === opcion.value;
        return { key: `${campo.name}-${opcion.value}`, texto: opcion.title ?? opcion.value, activo,
          alTocar: () => cambiar(campo.name, activo ? undefined : opcion.value) };
      });
    }
    return [];
  });
  return <div ref={grupo} className="kit-chips" role="group" aria-label={props.schemaType.title}>
    {botones.map((boton) => <button key={boton.key} type="button" className="kit-chip" aria-pressed={boton.activo}
      disabled={props.readOnly} onClick={boton.alTocar}>{boton.texto}{boton.activo && <span aria-hidden="true"> ✓</span>}</button>)}
  </div>;
}

type Modo = 'obra' | 'estrenar' | 'anios' | '';
const MODOS: [Exclude<Modo, ''>, string][] = [['obra', 'En construcción'], ['estrenar', 'A estrenar'], ['anios', 'Años de la propiedad']];

/** Antigüedad como en los portales: en construcción, a estrenar o años (con el número al lado). */
export function AntiguedadInput(props: ObjectInputProps) {
  const valor = (props.value ?? {}) as { en_construccion?: boolean; a_estrenar?: boolean; anios?: number };
  const guardado: Modo = valor.en_construccion ? 'obra' : valor.a_estrenar ? 'estrenar' : typeof valor.anios === 'number' ? 'anios' : '';
  const [elegido, setElegido] = useState<Modo>(guardado);
  const modo = guardado || elegido;
  const grupo = useFocoInicial(props);
  const anios = useRef<HTMLInputElement>(null);
  const base = setIfMissing({ _type: props.schemaType.name });

  function elegir(nuevo: Exclude<Modo, ''>) {
    setElegido(nuevo);
    props.onChange([base, set(nuevo === 'obra', ['en_construccion']), set(nuevo === 'estrenar', ['a_estrenar']),
      ...(nuevo === 'anios' ? [] : [unset(['anios'])])]);
    if (nuevo === 'anios') requestAnimationFrame(() => anios.current?.focus());
  }
  return <div ref={grupo} className="kit-chips" role="group" aria-label={props.schemaType.title}>
    {MODOS.map(([clave, texto]) => <button key={clave} type="button" className="kit-chip" aria-pressed={modo === clave}
      disabled={props.readOnly} onClick={() => elegir(clave)}>{texto}{modo === clave && <span aria-hidden="true"> ✓</span>}</button>)}
    {modo === 'anios' && <div className="kit-chips__numero">
      <TextInput ref={anios} type="number" inputMode="numeric" min={0} aria-label="Años de la propiedad" readOnly={props.readOnly}
        value={typeof valor.anios === 'number' ? String(valor.anios) : ''}
        onChange={(event) => {
          const texto = event.currentTarget.value.trim();
          const numero = Number(texto);
          props.onChange([base, texto === '' || !Number.isFinite(numero) ? unset(['anios']) : set(numero, ['anios'])]);
        }} />
    </div>}
  </div>;
}
