import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileForm } from './ProfileForm'
import { DocumentsTab } from './DocumentsTab'
import { ComplianceTab } from './ComplianceTab'
import { Page, PageHeader } from '@/design-system/components'

export default function InstitutionalProfile() {
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')

  // Mapear query param para valor da aba
  const getInitialTab = () => {
    if (tabParam === 'documentos' || tabParam === 'documents') return 'documents'
    if (tabParam === 'compliance') return 'compliance'
    return 'profile'
  }

  const [activeTab, setActiveTab] = useState(getInitialTab())

  // Atualizar aba quando query param mudar
  useEffect(() => {
    const newTab = getInitialTab()
    if (newTab !== activeTab) {
      setActiveTab(newTab)
    }
  }, [tabParam])

  return (
    <Page>
      <PageHeader
        title="Perfil Institucional"
        subtitle="Gerencie informações institucionais, documentos e compliance"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-full md:grid md:grid-cols-3 min-w-max">
            <TabsTrigger value="profile" className="whitespace-nowrap">Dados Básicos</TabsTrigger>
            <TabsTrigger value="documents" className="whitespace-nowrap">Documentos</TabsTrigger>
            <TabsTrigger value="compliance" className="whitespace-nowrap">Compliance</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="space-y-4">
          <ProfileForm />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <DocumentsTab />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <ComplianceTab />
        </TabsContent>
      </Tabs>
    </Page>
  )
}
