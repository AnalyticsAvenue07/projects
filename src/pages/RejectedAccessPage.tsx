import { Link } from 'react-router'
import { EnterpriseEmpty } from '@/components/empty-states/EnterpriseEmpty'

export function RejectedAccessPage() {
  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border-[1.5px] border-[#CBD5E1] rounded-xl p-10 shadow-sm">
        <EnterpriseEmpty
          title="Access declined"
          description="Your registration was not approved for this workspace. Contact your administrator if you believe this is an error."
          action={
            <Link
              to="/login"
              className="inline-flex px-6 py-2.5 bg-[#0F766E] text-white rounded-lg font-bold text-[15px] hover:bg-[#0D5F58] transition-colors"
            >
              Return to login
            </Link>
          }
        />
      </div>
    </div>
  )
}
