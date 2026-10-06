import { useState } from 'react';
import type { Path } from 'sanity';
import { createRoot } from 'react-dom/client';
import { Card, ThemeProvider, studioTheme } from '@sanity/ui';
import '@sanity/ui/styles.css';
import { PropertyStages } from '../../studio/PropertyStages';
import { confirmSaved, errorsForStage } from '../../studio/property-workflow.mjs';

const initial = { _id: 'drafts.qa', _type: 'propiedad', campo_antiguo: 'conservar', operacion: '', tipo: '', ubicacion: { calle_y_numero: '', ciudad: '', localidad: '', provincia: '', zona: '' }, ambientes: { banos: '' }, descripcion: '' };
let remote: any = null;
let networkError = false;
let reads = 0;
let snapshot: any = null;
(window as any).qa = {
  ack: () => { remote = { ...snapshot, _rev: 'confirmada' }; },
  fail: () => { networkError = true; },
  readCount: () => reads,
};

function Fixture() {
  const [value, setValue] = useState(initial);
  const [closed, setClosed] = useState(false);
  const [focusedPath, setFocusedPath] = useState<Path>();
  (window as any).qa.focus = (path: Path) => setFocusedPath(path);
  snapshot = value;
  const input = (label: string, key: string, nested?: string) => <label style={{ display: 'block', margin: '16px 0' }}>{label}
    <input aria-label={label} data-focus-path={JSON.stringify(nested ? [nested, key] : [key])} style={{ display: 'block', minHeight: 44, width: '100%', boxSizing: 'border-box' }}
      value={nested ? (value as any)[nested][key] : (value as any)[key]}
      onChange={(event) => setValue((current) => ({ ...current, ...(nested ? { [nested]: { ...(current as any)[nested], [key]: event.target.value } } : { [key]: event.target.value }) }))} />
  </label>;
  if (closed) return <><p role="status">Cierre confirmado (sólo prueba aislada)</p><button onClick={() => { setClosed(false); setFocusedPath(undefined); }}>Retomar en la prueba</button><pre>{JSON.stringify(value)}</pre></>;
  return <PropertyStages documentId={value._id} status="Prueba aislada: no hay autoguardado remoto" focusedPath={focusedPath}
    getErrors={(stage) => errorsForStage(stage, value)} onFocusField={(path) => {
      setFocusedPath(path);
      const target = [...document.querySelectorAll<HTMLInputElement>('[data-focus-path]')].find((el) => el.dataset.focusPath === JSON.stringify(path));
      target?.focus();
    }}
    onSave={async () => {
      const expected = structuredClone(value);
      await confirmSaved({ id: value._id, expected, timeoutMs: 2000, intervalMs: 30, isSyncing: () => false,
        read: async () => { reads++; if (networkError) throw new Error('Error de red (prueba aislada). El editor sigue abierto.'); return remote; } });
      setClosed(true);
    }} renderFields={(stage) => <>
      {stage === 0 && <>{input('Operación', 'operacion')}{input('Tipo de propiedad', 'tipo')}{input('Calle y número', 'calle_y_numero', 'ubicacion')}{input('Ciudad o partido', 'ciudad', 'ubicacion')}{input('Localidad o barrio', 'localidad', 'ubicacion')}{input('Provincia', 'provincia', 'ubicacion')}{input('Zona', 'zona', 'ubicacion')}</>}
      {stage === 1 && input('Baños', 'banos', 'ambientes')}
      {stage === 2 && input('Descripción', 'descripcion')}
    </>} />;
}
// El panel usa @sanity/ui: en el Studio el tema lo pone Sanity; acá se elige con ?scheme=light|dark.
const scheme = new URLSearchParams(location.search).get('scheme') === 'dark' ? 'dark' : 'light';
createRoot(document.getElementById('root')!).render(<ThemeProvider theme={studioTheme} scheme={scheme}>
  <Card padding={0}><Fixture /></Card></ThemeProvider>);
