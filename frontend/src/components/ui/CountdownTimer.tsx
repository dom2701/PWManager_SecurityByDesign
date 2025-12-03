import { on } from 'events'
import React, { useState, useEffect } from 'react'

interface CountdownTimerProps {
  initialSeconds: number
  onExpire: () => void
}

export default function CountdownTimer({ initialSeconds, onExpire }: CountdownTimerProps) {
    const [secondsLeft, setSecondsLeft] = useState(initialSeconds)

    useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(interval)
          onExpire?.()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [onExpire])

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <span className="mr-1 md:mr-2 text-sm font-medium text-gray-700 dark:text-gray-300 tabular-nums">
      Logout: {formatTime(secondsLeft)}
    </span>
  )
}