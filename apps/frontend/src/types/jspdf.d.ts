import 'jspdf'

declare module 'jspdf' {
  interface jsPDF {
    getNumberOfPages(): number
    lastAutoTable?: {
      finalY: number
    }
    putTotalPages?(placeholder: string): void
  }
}
