/** El icono con el que se marca cada motivo en la bandeja del gachapón */
export type ReasonSymbol = 'ai' | 'trophy' | 'research' | 'lead' | 'code' | 'spark'

export interface Reason {
  id: string
  symbol: ReasonSymbol
  /** El motivo, en corto */
  title: string
  /** El hecho que lo respalda: sin prueba no entra */
  proof: string
}

export type ContactState = 'idle' | 'sending' | 'sent' | 'error'
