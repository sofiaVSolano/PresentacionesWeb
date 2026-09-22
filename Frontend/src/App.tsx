import { useState } from 'react'
import { CustomCursor } from '@/components/CustomCursor/CustomCursor'
import { AvatarReaction } from '@/components/AvatarReaction/AvatarReaction'
import { Preloader } from '@/components/Preloader/Preloader'
import { SmoothScrollProvider } from '@/components/SmoothScroll/SmoothScrollProvider'
import { Navigation } from '@/components/Navigation/Navigation'
import { SoundToggle } from '@/components/SoundToggle/SoundToggle'
import { SoundProvider } from '@/hooks/useSound'
import { Hero } from '@/sections/Hero/Hero'
import { Transformation } from '@/sections/Transformation/Transformation'
import { About } from '@/sections/About/About'
import { Mind } from '@/sections/Mind/Mind'
import { Dna } from '@/sections/Dna/Dna'
import { Works } from '@/sections/Works/Works'
import { Lab } from '@/sections/Lab/Lab'
import { History } from '@/sections/History/History'
import { Closing } from '@/sections/Closing/Closing'
import { Footer } from '@/sections/Footer/Footer'

function App() {
  const [loading, setLoading] = useState(true)

  return (
    <SoundProvider>
      <SmoothScrollProvider>
        {loading && <Preloader onComplete={() => setLoading(false)} />}
        <CustomCursor />
        <Navigation />
        <SoundToggle />
        <AvatarReaction />

        <Hero ready={!loading} />
        <Transformation />

        <About />
        <Mind />
        <Dna />
        <Works />
        <Lab />
        <History />
        <Closing />
        <Footer />
      </SmoothScrollProvider>
    </SoundProvider>
  )
}

export default App
