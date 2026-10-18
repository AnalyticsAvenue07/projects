import { Link } from 'react-router'
import { EnterpriseEmpty } from '@/components/empty-states/EnterpriseEmpty'

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border-[1.5px] border-[#CBD5E1] rounded-xl p-10 shadow-sm">
        <EnterpriseEmpty
          title="Unauthorized"
          description="You do not have permission to view this area. If you need elevated access, contact your workspace administrator."
          action={
            <Link
              to="/dashboard"
              className="inline-flex px-6 py-2.5 bg-[#0F766E] text-white rounded-lg font-bold text-[15px] hover:bg-[#0D5F58] transition-colors"
            >
              Go to dashboard
            </Link>
          }
        />
      </div>
    </div>
  )
}
