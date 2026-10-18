import { EnterpriseEmpty } from '@/components/empty-states/EnterpriseEmpty'

export function PendingApprovalPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <EnterpriseEmpty
        title="Account under review"
        description="Your account is under admin review. Please wait until access is granted."
      />
    </div>
  )
}
