import { Loader2 } from 'lucide-react'

export default function CallbackLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 text-[#009DE0] animate-spin" />
    </div>
  )
}
