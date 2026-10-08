import { useEffect, useRef } from 'react';
import { useToast } from '@sanity/ui/toast';
import { set, useClient, useDocumentOperation, useSyncState, useValidationStatus, type ObjectInputProps } from 'sanity';
import { useDocumentPane } from 'sanity/structure';
import { PropertyStages } from './PropertyStages';
import { confirmSaved, documentContent, errorsForStage, miembroEnEtapa, resumenRevision, sameContent, slugPendiente } from './property-workflow.mjs';

export function PropertyWizardInput(props: ObjectInputProps) {
  const pane = useDocumentPane();
  // Se utiliza el mismo destino que está editando el Studio, incluidas sus versiones.
  const operations = useDocumentOperation(pane.documentId, pane.documentType, pane.selectedReleaseId);
  const sync = useSyncState(pane.documentId, pane.documentType, pane.selectedReleaseId);
  const validation = useValidationStatus(pane.documentIdRaw, pane.documentType, true);
  const client = useClient({ apiVersion: '2026-03-01' }).withConfig({ useCdn: false, perspective: 'raw' });
  const toast = useToast();
  const latest = useRef({ sync, value: props.value, connection: pane.connectionState });
  latest.current = { sync, value: props.value, connection: pane.connectionState };
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); }, [pane.documentId]);

  // El slug no se pide en la carga: se arma con calle y número + barrio la primera vez que se avanza o se guarda.
  function asignarSlug() {
    const slug = props.readOnly ? '' : slugPendiente(latest.current.value);
    if (slug) props.onChange(set({ _type: 'slug', current: slug }, ['slug']));
    return slug;
  }

  async function saveAndExit() {
    if (pane.connectionState !== 'connected' || !navigator.onLine) throw new Error('Sin conexión con Sanity. No cerramos el editor: reconectate y reintentá.');
    if (operations.commit.disabled) throw new Error('Sanity todavía no está listo para guardar. Esperá y reintentá.');
    const slug = asignarSlug();
    const expected = structuredClone({ ...(props.value ?? {}), ...(slug ? { slug: { _type: 'slug', current: slug } } : {}) });
    // Crear el primer borrador también cuando sólo se aceptaron los valores iniciales.
    if (!pane.editState?.draft && !pane.editState?.published && !pane.editState?.version) {
      if (operations.patch.disabled) throw new Error('No tenés acceso para crear este borrador.');
      operations.patch.execute([], documentContent(expected));
    }
    const id = pane.editState?.version?._id ?? pane.editState?.draft?._id ?? pane.editState?.published?._id ??
      (pane.documentIdRaw.startsWith('versions.') ? pane.documentIdRaw : `drafts.${pane.documentId}`);
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      operations.commit.execute();
      await confirmSaved({
        expected, id, signal: controller.signal,
        isSyncing: () => latest.current.sync.isSyncing || latest.current.connection !== 'connected',
        read: (targetId: string, signal: AbortSignal) => client.fetch('*[_id == $id][0]', { id: targetId }, { signal, perspective: 'raw' }),
      });
      // No se cierra sobre una edición más reciente, aunque la anterior haya llegado.
      if (!sameContent(expected, latest.current.value)) throw new Error('El documento cambió durante el guardado. Revisalo y volvé a guardar.');
      toast.push({ status: 'success', title: 'Guardado confirmado en Sanity', description: 'El aviso no se publicó.' });
      pane.onPaneClose();
    } catch (error) {
      if (controller.signal.aborted) throw new Error('No pudimos confirmar el guardado a tiempo. El editor sigue abierto; revisá la conexión y reintentá.');
      if (error instanceof Error && (error.message.startsWith('El documento cambió') || error.message.startsWith('No pudimos confirmar'))) throw error;
      throw new Error('No pudimos confirmar el guardado en Sanity. El editor sigue abierto; revisá la conexión y tus permisos, y reintentá.');
    } finally { clearTimeout(timeout); request.current = null; }
  }

  const status = pane.syncState === 'stalled' ? 'Sanity no pudo guardar los cambios. Conservá el editor abierto, revisá la conexión y reintentá.' :
    pane.syncState === 'recovering' ? 'Sanity está intentando recuperar el guardado. Todavía no está confirmado.' :
    pane.connectionState !== 'connected' ? 'Sin conexión confirmada. Los cambios pueden estar pendientes de guardar.' :
    sync.isSyncing ? 'Sanity está sincronizando cambios…' : 'Autoguardado de Sanity activo. Guardar y salir verifica los datos en el servidor.';

  return <PropertyStages documentId={pane.documentId} status={status} onSave={saveAndExit}
    focusedPath={props.focusPath}
    disabled={props.readOnly || Boolean(operations.commit.disabled)} validationPending={validation.isValidating}
    reviewErrors={validation.validation.filter((item) => item.level === 'error')}
    getErrors={(stage) => errorsForStage(stage, props.value, validation.validation)}
    onFocusField={props.onPathFocus} onAvanzar={asignarSlug} resumen={resumenRevision(props.value)}
    renderFields={(stage, saving) => props.renderDefault({
      ...props, readOnly: props.readOnly || saving,
      members: props.members.filter((member) => miembroEnEtapa(member, stage)),
    })} />;
}
