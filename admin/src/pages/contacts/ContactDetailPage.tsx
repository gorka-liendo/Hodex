import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { contactKeys, contactRoleLabel, contactsApi, type Contact } from '../../api/contacts'
import { Eyebrow } from '../../components/brand'
import { Button, LinkButton } from '../../components/Button'
import { QueryStatus } from '../../components/lists'
import { Notice } from '../../components/Notice'
import { PageHeader } from '../../components/PageHeader'
import { countryName } from '../../lib/countries'
import { formatDateTime } from '../../lib/format'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-hodex-line py-5 sm:flex-row sm:items-baseline sm:gap-8">
      <dt className="w-48 shrink-0 text-small text-hodex-gray">{label}</dt>
      <dd className="min-w-0 break-words text-hodex-black">
        {children ?? <span className="text-hodex-gray-light">—</span>}
      </dd>
    </div>
  )
}

function address(contact: Contact): string | null {
  const cityLine = [contact.postalCode, contact.city].filter(Boolean).join(' ')
  const parts = [contact.addressLine, cityLine, contact.province, countryName(contact.country)]
  return parts.filter(Boolean).join(', ') || null
}

export function ContactDetailPage() {
  const { id = '' } = useParams()
  const query = useQuery({ queryKey: contactKeys.detail(id), queryFn: () => contactsApi.get(id) })

  if (query.isPending) return <QueryStatus />
  if (query.isError) return <QueryStatus error={query.error} onRetry={() => void query.refetch()} />
  return <ContactDetail contact={query.data} />
}

function ContactDetail({ contact }: { contact: Contact }) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const archived = contact.archivedAt !== null

  const toggleArchive = useMutation({
    mutationFn: () => (archived ? contactsApi.restore(contact.id) : contactsApi.archive(contact.id)),
    onSuccess: (saved) => {
      queryClient.setQueryData(contactKeys.detail(saved.id), saved)
      void queryClient.invalidateQueries({ queryKey: contactKeys.all })
      setConfirming(false)
    },
  })

  return (
    <div className="flex flex-col gap-14">
      <PageHeader
        eyebrow={archived ? 'Archivado' : contactRoleLabel(contact)}
        title={contact.legalName}
        description={contact.tradeName ?? undefined}
        actions={
          !archived && (
            <LinkButton to={`/clientes/${contact.id}/editar`} variant="dark">
              Editar
            </LinkButton>
          )
        }
      />

      {archived && (
        <Notice tone="info">
          Contacto archivado el {formatDateTime(contact.archivedAt!)}. No aparece en los listados ni
          se puede usar en facturas nuevas.
        </Notice>
      )}

      <section className="flex flex-col gap-6">
        <Eyebrow>Datos fiscales</Eyebrow>
        <dl className="border-t border-hodex-line">
          <Row label="Razón social">{contact.legalName}</Row>
          <Row label="NIF / CIF">
            {contact.taxId && <span className="tabular-nums">{contact.taxId}</span>}
          </Row>
          <Row label="Dirección fiscal">{address(contact)}</Row>
        </dl>
      </section>

      <section className="flex flex-col gap-6">
        <Eyebrow>Contacto</Eyebrow>
        <dl className="border-t border-hodex-line">
          <Row label="Email">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="underline-offset-4 hover:underline">
                {contact.email}
              </a>
            )}
          </Row>
          <Row label="Teléfono">
            {contact.phone && (
              <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="underline-offset-4 hover:underline">
                {contact.phone}
              </a>
            )}
          </Row>
          <Row label="Notas">
            {contact.notes && <span className="whitespace-pre-line">{contact.notes}</span>}
          </Row>
        </dl>
      </section>

      <section className="flex flex-col gap-6">
        <Eyebrow>{archived ? 'Restaurar' : 'Archivar'}</Eyebrow>
        <div className="flex flex-col items-start gap-5">
          <p className="max-w-[640px] text-hodex-gray">
            {archived
              ? 'Vuelve a mostrar el contacto en los listados.'
              : 'Los contactos no se borran para conservar el historial de facturas y gastos: se archivan y dejan de aparecer en los listados.'}
          </p>
          {confirming || archived ? (
            <div className="flex flex-wrap items-center gap-6">
              <Button
                variant="outline"
                loading={toggleArchive.isPending}
                loadingLabel={archived ? 'Restaurando…' : 'Archivando…'}
                onClick={() => toggleArchive.mutate()}
              >
                {archived ? 'Restaurar contacto' : 'Sí, archivar'}
              </Button>
              {!archived && (
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="text-small text-hodex-gray underline-offset-4 hover:text-hodex-black hover:underline"
                >
                  Cancelar
                </button>
              )}
            </div>
          ) : (
            <Button variant="outline" onClick={() => setConfirming(true)}>
              Archivar contacto
            </Button>
          )}
          {toggleArchive.error && (
            <Notice>
              {toggleArchive.error instanceof ApiError
                ? toggleArchive.error.message
                : 'No se pudo completar la acción.'}
            </Notice>
          )}
        </div>
      </section>

      <p className="text-small text-hodex-gray-light">
        Alta: {formatDateTime(contact.createdAt)} · Última modificación: {formatDateTime(contact.updatedAt)}
      </p>
    </div>
  )
}
