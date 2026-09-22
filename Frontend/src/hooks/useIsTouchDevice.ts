import { useMediaQuery } from '@/hooks/useMediaQuery'

export function useIsTouchDevice(): boolean {
  return useMediaQuery('(hover: none), (pointer: coarse)')
}
