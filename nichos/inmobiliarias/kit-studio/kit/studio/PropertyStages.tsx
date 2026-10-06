import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Path } from 'sanity';
import { Badge, Box, Button, Card, Flex, Stack, Text } from '@sanity/ui';
import config from '../../../inmobiliaria.config.mjs';
import { stages, stageForField } from './property-workflow.mjs';
import './property-stages.css';

export type StageError = { message: string; path: Path };

export function PropertyStages({ documentId, renderFields, getErrors, onSave, status, disabled, validationPending,
  reviewErrors = [], onFocusField, focusedPath }: {
  documentId: string;
  renderFields: (stage: number, saving: boolean) => ReactNode;
  getErrors: (stage: number) => StageError[];
  onSave: () => Promise<void>;
  status: string;
  disabled?: boolean;
  validationPending?: boolean;
  reviewErrors?: StageError[];
  focusedPath?: Path;
  onFocusField: (path: StageError['path']) => void;
}) {
  const ultima = stages.length - 1; // la última etapa es la de revisión
  const [stage, setStage] = useState(0);
  const [errors, setErrors] = useState<StageError[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const errorBox = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const saveLock = useRef(false);
  const mounted = useRef(true);
  const pendingFocus = useRef<Path | null>(null);
  const currentStage = useRef(stage);
  currentStage.current = stage;
  const focusCallback = useRef(onFocusField);
  focusCallback.current = onFocusField;
  const focusPath = useRef(focusedPath);
  focusPath.current = focusedPath;
  const focusKey = JSON.stringify(focusedPath ?? []);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { pendingFocus.current = null; setStage(0); setErrors([]); setSaveError(''); }, [documentId]);
  // Sólo una petición nueva cambia la etapa: Volver/Continuar no reactivan el foco anterior.
  useEffect(() => {
    const path = focusPath.current;
    if (!path?.length) return;
    const target = stageForField(String(path[0]));
    if (target !== currentStage.current) {
      pendingFocus.current = [...path]; setErrors([]); setStage(target);
    }
  }, [focusKey, documentId]);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const path = pendingFocus.current;
    pendingFocus.current = null;
    if (!path) { heading.current?.focus(); return; }
    // Esperar al montaje y conservar también la ruta de campos anidados.
    const frame = requestAnimationFrame(() => focusCallback.current(path));
    return () => cancelAnimationFrame(frame);
  }, [stage]);
  useEffect(() => { if (errors.length || saveError) errorBox.current?.focus(); }, [errors, saveError]);

  function focusField(path: Path) {
    const target = stageForField(String(path[0]));
    if (target === currentStage.current) focusCallback.current(path);
    else { pendingFocus.current = [...path]; setErrors([]); setStage(target); }
  }

  function goNext() {
    pendingFocus.current = null;
    const nextErrors = getErrors(stage);
    setErrors(nextErrors);
    if (!nextErrors.length) setStage((current) => Math.min(ultima, current + 1));
  }
  async function save() {
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true); setSaveError('');
    try { await onSave(); }
    catch (error) { if (mounted.current) setSaveError(error instanceof Error ? error.message : 'No pudimos confirmar el guardado. Reintentá.'); }
    finally { saveLock.current = false; if (mounted.current) setSaving(false); }
  }

  const go = (next: number) => { pendingFocus.current = null; setErrors([]); setStage(next); };
  return <Card as="section" className="kit-etapas" border radius={3} overflow="hidden"
    style={{ '--kit-tipografia-titulos': config.marca.tipografiaTitulos } as CSSProperties} aria-label="Carga guiada de propiedades" aria-busy={saving}>
    <Card as="header" padding={4} borderBottom>
      <Stack gap={4}>
        <Text size={0} muted weight="semibold" className="kit-etapas__brand">{config.marca.nombre} · {config.marca.panel}</Text>
        <h2 ref={heading} tabIndex={-1} className="kit-etapas__title">
          <Text as="span" size={1} muted className="kit-etapas__count">Etapa {stage + 1} de {stages.length}<span className="kit-etapas__sr"> · </span></Text>
          {stages[stage].title}
        </h2>
        <ol className="kit-etapas__steps" aria-label="Etapas de carga">
          {stages.map((item, index) => <li key={item.title} aria-current={stage === index ? 'step' : undefined}
            data-estado={index < stage ? 'hecha' : index === stage ? 'actual' : 'pendiente'}>
            <span className="kit-etapas__bar" aria-hidden="true" />
            <Flex gap={2} align="flex-start" className="kit-etapas__step">
              <Badge tone={index <= stage ? 'primary' : 'default'} aria-hidden="true">
                {index < stage ? '✓' : index + 1}</Badge>
              <Text size={1} weight={index === stage ? 'semibold' : 'regular'} muted={index !== stage}>
                {item.title}{index < stage && <span className="kit-etapas__sr"> (completa)</span>}</Text>
            </Flex>
          </li>)}
        </ol>
        <progress className="kit-etapas__sr" max={stages.length} value={stage + 1} aria-label={`Avance: etapa ${stage + 1} de ${stages.length}`} />
        <Card tone="primary" padding={3} radius={2} border>
          <Text as="p" size={1}>Podés guardar un borrador incompleto. Cambiar de etapa no publica el aviso. Sanity sincroniza los cambios mientras trabajás.</Text>
        </Card>
      </Stack>
    </Card>
    {(errors.length > 0 || saveError) && <Card ref={errorBox} tone="critical" border radius={2} padding={4} margin={4}
      className="kit-etapas__errors" role="alert" tabIndex={-1}>
      <Stack gap={3}>
        {saveError && <Text as="p" size={1}>{saveError}</Text>}
        {errors.length > 0 && <><Text as="p" size={1} weight="semibold">Revisá estos campos para continuar:</Text><ul>{errors.map((error, i) =>
          <li key={i}><button type="button" className="kit-etapas__link" onClick={() => focusField(error.path)}>{error.message}</button></li>)}</ul></>}
      </Stack>
    </Card>}
    <Box as="fieldset" padding={4} className="kit-etapas__fields" disabled={saving} aria-label={stages[stage].title}>{renderFields(stage, saving)}</Box>
    {stage === ultima && <Card as="aside" padding={4} borderTop aria-label="Revisión para publicar">
      <Stack gap={3}>
        <h3 className="kit-etapas__subtitle">Antes de publicar</h3>
        <Text as="p" size={1}>Revisá la ubicación, el precio, las características, las fotos y la descripción. Publicá con la acción de Sanity al pie del editor.</Text>
        {validationPending ? <Text as="p" size={1} muted>Sanity está revisando el documento…</Text> : reviewErrors.length ?
          <Card tone="caution" padding={3} radius={2} border><Stack gap={3}>
            <Text as="p" size={1}>Falta resolver lo siguiente para publicar (podés guardar igualmente):</Text><ul>{reviewErrors.map((error, i) =>
            <li key={i}><button type="button" className="kit-etapas__link" onClick={() => {
              setErrors([]); focusField(error.path);
            }}>{error.message}</button></li>)}</ul></Stack></Card> :
          <Text as="p" size={1}>Sin errores de validación actuales. Guardar y salir conserva el borrador; publicar es una acción aparte.</Text>}
      </Stack>
    </Card>}
    <Card as="footer" padding={4} borderTop tone="transparent">
      <Stack gap={3}>
        <Text as="p" size={1} muted role="status" aria-live="polite">{saving ? 'Confirmando el guardado con Sanity…' : status}</Text>
        <Flex gap={2} wrap="wrap" className="kit-etapas__actions">
          <Button mode="ghost" padding={3} text="Volver" disabled={saving || stage === 0} onClick={() => go(stage - 1)} />
          <Button mode="ghost" padding={3} text="Guardar y salir" disabled={saving || disabled} onClick={save} />
          {stage < ultima && <Button tone="primary" padding={3} text="Continuar" className="kit-etapas__next"
            disabled={saving || validationPending} onClick={goNext} />}
        </Flex>
      </Stack>
    </Card>
  </Card>;
}
