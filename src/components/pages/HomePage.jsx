import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, Check, CircleDot, Code2, Layers3, Sparkles } from 'lucide-react'

const quotes = [
  "The only way to do great work is to love what you do. - Steve Jobs",
  "First, solve the problem. Then, write the code. - John Johnson",
  "The best way to predict the future is to invent it. - Alan Kay",
  "Code is read much more often than it is written. - Guido van Rossum",
  "Every expert was once a beginner. - Brian Tracy",
  "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
  "You don't have to be great to start, but you have to start to be great. - Zig Ziglar"
]

export default function HomePage() {
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]

  return (
    <div className="home-page">
      <section className="hero-section page-width">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> A calmer way to get good at DSA</p>
          <h1>Build your<br /><em>problem-solving</em> edge.</h1>
          <p className="hero-description">A focused workspace for learning patterns, tracking progress, and turning “I’ll do it later” into solved.</p>
          <div className="hero-actions">
            <Link to="/topics" className="primary-action">Explore the roadmap <ArrowRight size={18} /></Link>
            <a href="#how-it-works" className="text-action">See how it works</a>
          </div>
          <div className="hero-note"><Sparkles size={16} /><span>{randomQuote.split(' - ')[0]}</span></div>
        </div>
        <div className="algorithm-board" aria-label="Visual representation of a learning roadmap">
          <div className="board-topline"><span>YOUR NEXT MOVE</span><span>01 / 04</span></div>
          <div className="board-title"><span>Arrays</span><span className="board-status">in progress</span></div>
          <div className="node-map">
            <div className="map-line line-one" /><div className="map-line line-two" />
            <div className="map-node node-main"><Layers3 size={20} /><span>Arrays</span></div>
            <div className="map-node node-a"><Code2 size={17} /><span>Two pointers</span></div>
            <div className="map-node node-b"><BarChart3 size={17} /><span>Prefix sums</span></div>
            <div className="map-node node-c"><CircleDot size={17} /><span>Sliding window</span></div>
          </div>
          <div className="board-footer"><span>07 problems solved</span><span className="progress-track"><span /></span><strong>42%</strong></div>
        </div>
      </section>
      
      <section className="marquee-strip"><div>Patterns</div><div>Practice</div><div>Progress</div><div>Confidence</div><div>Consistency</div>
      </section>
      <section className="feature-section page-width" id="how-it-works">
        <div className="section-intro"><p className="eyebrow">A system that sticks</p><h2>Small sessions.<br /><em>Visible progress.</em></h2></div>
        <div className="feature-grid">
          <article className="feature-card coral-card"><span className="feature-number">01</span><Check size={22} /><h3>Know what to study next</h3><p>Follow a clear path from foundations to the patterns that show up in real interviews.</p></article>
          <article className="feature-card mint-card"><span className="feature-number">02</span><BarChart3 size={22} /><h3>Make effort count</h3><p>Keep your solved problems, current streak, and weak spots visible in one quiet dashboard.</p></article>
          <article className="feature-card ink-card"><span className="feature-number">03</span><Code2 size={22} /><h3>Practice with intention</h3><p>Return to the problems that matter and build fluency instead of collecting tabs.</p></article>
        </div>
      </section>
    </div>
  )
}
