import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { formatDateOnlySafe } from '@/utils/dateHelpers'
import { InstitutionalHeader, SignatureFooter } from '@/components/print'
import type { Vaccination } from '@/hooks/useVaccinations'

interface VaccinationPrintViewProps {
  residentId: string
  vaccinations: Vaccination[]
}

export function VaccinationPrintView({ residentId, vaccinations }: VaccinationPrintViewProps) {
  // Buscar dados do residente
  const { data: residentData } = useQuery({
    queryKey: ['resident', residentId],
    queryFn: async () => {
      const response = await api.get(`/residents/${residentId}`)
      return response.data
    },
    enabled: !!residentId,
  })

  if (!residentData) return null

  return (
    <div className="print-only">
      {/* Cabeçalho Institucional */}
      <InstitutionalHeader
        documentTitle="REGISTRO DE VACINAÇÕES"
        documentSubtitle={
          <div className="space-y-1">
            <p className="text-sm">
              <strong>Residente:</strong> {residentData.fullName}
            </p>
            <p className="text-sm">
              <strong>CPF:</strong> {residentData.cpf || 'Não informado'}
            </p>
            <p className="text-sm">
              <strong>Data de Nascimento:</strong>{' '}
              {residentData.birthDate ? formatDateOnlySafe(residentData.birthDate) : 'Não informado'}
            </p>
          </div>
        }
      />

      {/* Tabela de Vacinações */}
      <table className="print-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Vacina</th>
            <th>Dose</th>
            <th>Lote</th>
            <th>Fabricante</th>
            <th>Estabelecimento</th>
            <th>Município/UF</th>
          </tr>
        </thead>
        <tbody>
          {vaccinations.map((vaccination) => (
            <tr key={vaccination.id}>
              <td>{formatDateOnlySafe(vaccination.date)}</td>
              <td>{vaccination.vaccine}</td>
              <td>{vaccination.dose}</td>
              <td>{vaccination.batch}</td>
              <td>{vaccination.manufacturer}</td>
              <td>
                {vaccination.healthUnit}
                <br />
                <span className="text-xs">CNES: {vaccination.cnes}</span>
              </td>
              <td>
                {vaccination.municipality}/{vaccination.state}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Observações importantes */}
      <div className="mt-6 text-xs">
        <p className="font-semibold mb-2">OBSERVAÇÕES IMPORTANTES:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            Este registro atende aos requisitos da RDC 502/2021 da ANVISA para
            Instituições de Longa Permanência para Idosos (ILPI)
          </li>
          <li>
            Todos os registros de vacinação devem ser mantidos no prontuário do
            residente
          </li>
          <li>
            Em caso de dúvidas sobre o esquema vacinal, consulte o Calendário
            Nacional de Vacinação
          </li>
        </ul>
      </div>

      {/* Rodapé com Assinatura */}
      <SignatureFooter
        signatureTitle="RESPONSÁVEL TÉCNICO"
        includeDate={true}
      />

      {/* Estilos de impressão */}
      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .print-only {
            display: block !important;
          }

          /* Estilos da tabela impressa */
          .print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-bottom: 20px;
          }

          .print-table th,
          .print-table td {
            border: 1px solid #000;
            padding: 6px 8px;
            text-align: left;
            vertical-align: top;
          }

          .print-table th {
            background-color: #f5f5f5;
            font-weight: bold;
            text-align: center;
            font-size: 10px;
          }

          .print-table tbody tr:nth-child(even) {
            background-color: #fafafa;
          }

          @page {
            margin: 2cm;
            size: A4 landscape;
          }
        }

        @media screen {
          .print-only {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
