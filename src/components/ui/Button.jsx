import React from 'react'

export default function Button({ children, onClick, className = '', ...props }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-bold transition ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
