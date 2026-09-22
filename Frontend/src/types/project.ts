export type ProjectStatus = 'live' | 'in-progress' | 'completed' | 'research' | 'por-definir'

export interface Project {
  id: string
  title: string
  description: string
  problem: string
  solution: string
  technologies: string[]
  role: string
  status: ProjectStatus
  image?: string
  demoUrl?: string
  githubUrl?: string
  featured: boolean
}
