import { Sparkles, Plus, LayoutGrid } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs'
import { Button } from '../../../components/ui/button'
import { CrmProvider } from '../../../crm/store'
import { SalesCommandCenter } from '../../../crm/sales/SalesCommandCenter'
import { PipelineBoard as LegacyPipelineBoard } from './PipelineBoard'

export function CrmWorkspaceTabs({ vendorId, leads = [], orders = [], onRefresh, onError }) {
  return (
    <section className="tw-flex tw-h-full tw-min-h-0 tw-flex-col tw-gap-3">
      <header className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-rounded-xl tw-border tw-border-border tw-bg-card/40 tw-p-3">
        <div className="tw-flex tw-items-center tw-gap-2">
          <span className="tw-inline-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-lg tw-bg-primary tw-text-primary-foreground">
            <LayoutGrid className="tw-h-4 tw-w-4" />
          </span>
          <div>
            <p className="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-muted-foreground">Pharma CRM</p>
            <h2 className="tw-text-xl tw-font-bold tw-leading-tight">Unified Sales Workspace</h2>
          </div>
        </div>

        <div className="tw-flex tw-items-center tw-gap-2">
          <Button variant="outline" size="sm"><Sparkles className="tw-h-3.5 tw-w-3.5" />AI Insights</Button>
          <Button size="sm"><Plus className="tw-h-3.5 tw-w-3.5" />New Record</Button>
        </div>
      </header>

      <Tabs defaultValue="sales-command" className="tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-gap-2">
        <TabsList className="tw-grid tw-h-10 tw-w-full tw-max-w-[420px] tw-grid-cols-2 tw-rounded-lg tw-bg-muted">
          <TabsTrigger value="sales-command" className="tw-text-sm">Sales Command</TabsTrigger>
          <TabsTrigger value="pipeline-board" className="tw-text-sm">Pipeline Board</TabsTrigger>
        </TabsList>

        <TabsContent value="sales-command" className="tw-mt-0 tw-min-h-0 tw-flex-1">
          <CrmProvider>
            <SalesCommandCenter />
          </CrmProvider>
        </TabsContent>

        <TabsContent value="pipeline-board" className="tw-mt-0 tw-min-h-0 tw-flex-1 tw-overflow-hidden">
          <div className="tw-flex tw-h-full tw-min-h-0 tw-flex-col">
            <LegacyPipelineBoard
              vendorId={vendorId}
              leads={leads}
              orders={orders}
              onRefresh={onRefresh}
              onError={onError}
            />
          </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}
