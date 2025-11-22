import { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

// Minimal root layout - [locale] layout provides <html> and <body>
export default function RootLayout({ children }: Props) {
  return children
}
