import { useProfile } from '@/hooks/useInstitutionalProfile'
import { PhotoViewer } from '@/components/form/PhotoViewer'

interface InstitutionalHeaderProps {
  /**
   * Título do documento (ex: "FICHA DE PRESCRIÇÃO", "PRONTUÁRIO DO RESIDENTE")
   */
  documentTitle?: string
  /**
   * Informações adicionais abaixo do título (ex: nome do residente)
   */
  documentSubtitle?: string | React.ReactNode
  /**
   * Classe CSS adicional para o container
   */
  className?: string
}

/**
 * Componente de cabeçalho institucional para documentos impressos
 *
 * Exibe logo, dados da instituição (CNPJ, CNES, contatos, endereço)
 * e informações do documento.
 *
 * @example
 * ```tsx
 * <InstitutionalHeader
 *   documentTitle="FICHA DE PRESCRIÇÃO"
 *   documentSubtitle={<p>Residente: {residentName}</p>}
 * />
 * ```
 */
export function InstitutionalHeader({
  documentTitle,
  documentSubtitle,
  className = '',
}: InstitutionalHeaderProps) {
  const { data: profileData } = useProfile()

  return (
    <>
      {/* Cabeçalho Institucional */}
      <div className={`mb-6 border-b-2 border-gray-800 pb-4 ${className}`}>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            {/* Logo Institucional */}
            {profileData?.profile?.logoUrl ? (
              <PhotoViewer
                photoUrl={profileData.profile.logoUrl}
                altText="Logo da Instituição"
                size="xl"
                rounded={false}
                className="!h-20 !w-20 !rounded-md print:shadow-none"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                LOGO
              </div>
            )}

            {/* Dados da Instituição */}
            <div>
              <h1 className="text-2xl font-semibold uppercase">
                {profileData?.tenant?.name || 'CASA DE REPOUSO'}
              </h1>
              {/* CNPJ | CNES */}
              {(profileData?.tenant?.cnpj || profileData?.profile?.cnesCode) && (
                <p className="text-sm">
                  {profileData.tenant.cnpj && `CNPJ ${profileData.tenant.cnpj}`}
                  {profileData.tenant.cnpj && profileData.profile?.cnesCode && ' | '}
                  {profileData.profile?.cnesCode && `CNES ${profileData.profile.cnesCode}`}
                </p>
              )}
              {/* Telefone | E-mail */}
              {(profileData?.tenant?.phone || profileData?.tenant?.email) && (
                <p className="text-sm">
                  {profileData.tenant.phone && `Tel. ${profileData.tenant.phone}`}
                  {profileData.tenant.phone && profileData.tenant.email && ' | '}
                  {profileData.tenant.email && `E-mail: ${profileData.tenant.email}`}
                </p>
              )}
              {/* Endereço - rua, número, bairro */}
              {profileData?.tenant?.addressStreet && (
                <p className="text-sm">
                  {profileData.tenant.addressStreet}
                  {profileData.tenant.addressNumber && `, ${profileData.tenant.addressNumber}`}
                  {profileData.tenant.addressDistrict && ` – ${profileData.tenant.addressDistrict}`}
                </p>
              )}
              {/* Cidade/Estado/CEP */}
              {profileData?.tenant?.addressCity && (
                <p className="text-sm">
                  {profileData.tenant.addressCity}/{profileData.tenant.addressState}
                  {profileData.tenant.addressZipCode && ` – CEP ${profileData.tenant.addressZipCode}`}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Título e subtítulo do documento */}
      {(documentTitle || documentSubtitle) && (
        <div className="mb-4">
          {documentTitle && (
            <h2 className="text-xl font-bold mb-2">{documentTitle}</h2>
          )}
          {documentSubtitle && (
            typeof documentSubtitle === 'string' ? (
              <p className="text-sm">{documentSubtitle}</p>
            ) : (
              documentSubtitle
            )
          )}
        </div>
      )}
    </>
  )
}
