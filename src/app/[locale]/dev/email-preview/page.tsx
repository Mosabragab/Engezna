import { merchantWelcomeTemplate } from '@/lib/email/templates/merchant-welcome'
import { storeApprovedTemplate } from '@/lib/email/templates/store-approved'
import { settlementTemplate } from '@/lib/email/templates/settlement'

// Preview page for email templates (development only)
export default function EmailPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>
}) {
  return <EmailPreview searchParamsPromise={searchParams} />
}

async function EmailPreview({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ template?: string }>
}) {
  const searchParams = await searchParamsPromise
  const template = searchParams.template || 'welcome'

  // Sample data for previews
  const welcomeData = {
    to: 'merchant@example.com',
    merchantName: 'أحمد محمد',
    storeName: 'مطاعم',
    dashboardUrl: 'https://www.engezna.com/ar/provider/dashboard',
  }

  const approvedData = {
    to: 'merchant@example.com',
    merchantName: 'أحمد محمد',
    storeName: 'مطعم الشرق',
    storeUrl: 'https://www.engezna.com/ar/store/el-sharq',
    dashboardUrl: 'https://www.engezna.com/ar/provider/dashboard',
  }

  const settlementData = {
    to: 'merchant@example.com',
    merchantName: 'أحمد محمد',
    storeName: 'مطعم الشرق',
    amount: 15750.5,
    settlementId: 'STL-2024-001234',
    settlementDate: new Date().toISOString(),
    ordersCount: 47,
    period: '1 - 15 يناير 2024',
    dashboardUrl: 'https://www.engezna.com/ar/provider/dashboard/settlements',
  }

  let html = ''
  let title = ''

  switch (template) {
    case 'welcome':
      html = merchantWelcomeTemplate(welcomeData)
      title = 'ترحيب بالتاجر الجديد'
      break
    case 'approved':
      html = storeApprovedTemplate(approvedData)
      title = 'تفعيل المتجر'
      break
    case 'settlement':
      html = settlementTemplate(settlementData)
      title = 'إشعار التسوية'
      break
    default:
      html = merchantWelcomeTemplate(welcomeData)
      title = 'ترحيب بالتاجر الجديد'
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Navigation */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-slate-900 mb-3">معاينة تمبلتات الإيميل</h1>
          <div className="flex gap-2 flex-wrap">
            <a
              href="?template=welcome"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                template === 'welcome'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              🎉 ترحيب
            </a>
            <a
              href="?template=approved"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                template === 'approved'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ✅ تفعيل المتجر
            </a>
            <a
              href="?template=settlement"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                template === 'settlement'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              💰 التسوية
            </a>
          </div>
        </div>
      </div>

      {/* Template Info */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-800">
            <strong>📧 التمبلت الحالي:</strong> {title}
          </p>
        </div>
      </div>

      {/* Email Preview */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <iframe
            srcDoc={html}
            className="w-full border-0"
            style={{ height: '800px' }}
            title={`Preview: ${title}`}
          />
        </div>
      </div>
    </div>
  )
}
