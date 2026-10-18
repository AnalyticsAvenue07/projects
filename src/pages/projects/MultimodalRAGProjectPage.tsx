import { useEffect } from 'react'
import { useNavigate } from 'react-router'

export function MultimodalRAGProjectPage() {
  const navigate = useNavigate()

  useEffect(() => {
    // Open the external Streamlit app in a new tab
    window.open('https://multimodalrag-master-qlv3gx8ntcfradnltky7qj.streamlit.app/', '_blank')
    // Navigate back to the previous page
    navigate(-1)
  }, [navigate])

  return (
    <div className="p-6 flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="mb-4 text-[18px] font-semibold text-[#475569]">
          Opening Multimodal RAG System in a new tab...
        </div>
        <p className="text-[14px] text-[#64748B] mb-6">
          If the new tab did not open, click the button below.
        </p>
        <a
          href="https://multimodalrag-master-qlv3gx8ntcfradnltky7qj.streamlit.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#0F766E] text-white rounded-lg hover:bg-[#0D5F58] transition-all font-bold text-[15px]"
        >
          Open Multimodal RAG App
        </a>
      </div>
    </div>
  )
}
