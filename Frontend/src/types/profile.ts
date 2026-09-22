export interface Profile {
  fullName: string
  shortName: string
  displayName: string
  heroSubtitle: string
  tagline: string
  role: string
  location: string
  bio: string[]
  languages: { name: string; level: string }[]
  /** Los 3 ejes que definen su perfil — editables */
  pillars: { label: string; detail: string }[]
  education: { degree: string; institution: string; detail: string }
  /** Cifras que cuentan hacia arriba en la sección YO — todas deben ser verificables */
  stats: { value: number; suffix?: string; label: string }[]
  /** "Así trabajo": puntos concretos, en lista con checks */
  highlights: string[]
}
