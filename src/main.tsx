import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from './router'
import { useAuthStore } from './stores/authStore'
import './styles/index.css'

// Mount React immediately for instantaneous initial paint, initializing auth in parallel
void useAuthStore.getState().init()
createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />)
