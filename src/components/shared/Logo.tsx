import React from 'react'
import { cn } from '@/lib/utils'

interface LogoProps {
  language?: 'ar' | 'en'
  variant?: 'light' | 'medium' | 'bold'
  color?: 'primary' | 'white' | 'black'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const Logo: React.FC<LogoProps> = ({
  language = 'ar',
  variant = 'medium',
  color = 'primary',
  size = 'md',
  className,
}) => {
  const text = language === 'ar' ? 'انجزنا' : 'Engezna'
  
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-5xl',
    xl: 'text-6xl',
  }
  
  const weightClasses = {
    light: 'font-light',
    medium: 'font-medium',
    bold: 'font-bold',
  }
  
  const colorClasses = {
    primary: 'text-primary',
    white: 'text-white',
    black: 'text-black',
  }
  
  const fontFamily = language === 'ar' ? 'font-arabic' : 'font-sans'
  
  return (
    <div
      className={cn(
        'select-none tracking-tight',
        sizeClasses[size],
        weightClasses[variant],
        colorClasses[color],
        fontFamily,
        className
      )}
    >
      {text}
    </div>
  )
}

export default Logo
