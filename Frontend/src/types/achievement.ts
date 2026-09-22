export type AchievementCategory = 'hackathon' | 'research' | 'leadership' | 'academic'

export interface Achievement {
  id: string
  title: string
  description: string
  date: string
  category: AchievementCategory
  place?: string
  link?: string
}
