

export default function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`content-card ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
