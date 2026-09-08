import React from 'react'

export default function Loading() {
  return (
    <div className="content-page" style={{ display: 'grid', placeItems: 'center' }}>
      <div style={{ color: 'var(--muted)', textAlign: 'center' }}>
        <div className="loading-mark" />
        <p>Loading your roadmap...</p>
      </div>
    </div>
  )
}
