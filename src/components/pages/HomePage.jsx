import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, Check, CircleDot, Code2, Layers3, Sparkles, Flame, Building2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabaseClient'

const quotes = [
  "The only way to do great work is to love what you do. - Steve Jobs",
  "First, solve the problem. Then, write the code. - John Johnson",
  "The best way to predict the future is to invent it. - Alan Kay",
  "Code is read much more often than it is written. - Guido van Rossum",
  "Every expert was once a beginner. - Brian Tracy",
  "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
  "You don't have to be great to start, but you have to start to be great. - Zig Ziglar"
]

const dailyInspirations = [
  {
    company: "Google HQ",
    quote: "The difference between a junior and a senior developer is just consistency.",
    message: "Focus on the user and all else will follow. Every problem you solve today brings you one step closer to the Googleplex.",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Googleplex_HQ_%28cropped%29.jpg/1024px-Googleplex_HQ_%28cropped%29.jpg"
  },
  {
    company: "Amazon Spheres",
    quote: "Don't worry about being perfect today. Worry about showing up.",
    message: "It's always Day 1. Start your day with a problem, and keep pushing your limits.",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Amazon_Spheres_exterior%2C_February_2018.jpg/1024px-Amazon_Spheres_exterior%2C_February_2018.jpg"
  },
  {
    company: "Apple Park",
    quote: "Every problem you solve builds a pattern you will use in your next interview.",
    message: "Think different. The logic you struggle with today will be the intuition you rely on tomorrow.",
    image: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Apple_Park_campus_HQ_%28cropped%29.jpg"
  },
  {
    company: "Netflix HQ",
    quote: "Push yourself because no one else is going to do it for you.",
    message: "Freedom and Responsibility. You have the freedom to choose to be great today, take the responsibility to practice.",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Netflix_headquarters_%28Los_Gatos%2C_California%29.jpg/1024px-Netflix_headquarters_%28Los_Gatos%2C_California%29.jpg"
  },
  {
    company: "Meta HQ",
    quote: "It doesn't matter how many times you get a compilation error, what matters is you fix it.",
    message: "Move fast and build things. Keep debugging, keep grinding, and keep moving forward.",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Meta_headquarters_1_Hacker_Way_Menlo_Park.jpg/1024px-Meta_headquarters_1_Hacker_Way_Menlo_Park.jpg"
  },
  {
    company: "Microsoft Campus",
    quote: "Small daily progress is the key to monumental success.",
    message: "Empower yourself by mastering the fundamentals. One algorithmic pattern at a time.",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Microsoft_Building_92_in_2021.jpg/1024px-Microsoft_Building_92_in_2021.jpg"
  }
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 12 } }
}

export default function HomePage() {
  const randomQuote = useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], [])
  const [latestProblems, setLatestProblems] = useState([])

  const dailyData = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return dailyInspirations[dayOfYear % dailyInspirations.length];
  }, []);

  useEffect(() => {
    const fetchLatestProblems = async () => {
      // First try to fetch ordered by created_at
      const { data, error } = await supabase
        .from('problems')
        .select('id, title, status')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (!error && data) {
        setLatestProblems(data)
      } else if (error) {
        // Fallback if created_at doesn't exist
        const { data: fallbackData } = await supabase
          .from('problems')
          .select('id, title, status')
          .order('id', { ascending: false })
          .limit(5)
        if (fallbackData) setLatestProblems(fallbackData)
      }
    }
    fetchLatestProblems()
  }, [])

  return (
    <motion.div 
      className="w-full flex flex-col gap-24 pb-20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <section className="relative grid lg:grid-cols-2 gap-12 lg:gap-8 items-center pt-10">
        <motion.div variants={containerVariants} className="flex flex-col gap-6 relative z-10">
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm w-fit backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-sm font-semibold text-slate-700">A calmer way to get good at DSA</span>
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            Build your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500 italic pr-2">
              problem-solving
            </span> edge.
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-lg text-slate-600 max-w-xl leading-relaxed">
            A focused workspace for learning patterns, tracking progress, and turning "I'll do it later" into solved.
          </motion.p>
          
          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4 pt-2">
            <Link to="/topics" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-all hover:shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:-translate-y-0.5 group">
              Explore the roadmap 
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#how-it-works" className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 px-6 py-3 rounded-xl font-medium transition-colors">
              See how it works
            </a>
          </motion.div>
          
          <motion.div variants={itemVariants} className="flex items-center gap-2 mt-4 text-sm text-slate-500 font-medium">
            <Sparkles size={14} className="text-amber-500" />
            <span>{randomQuote.split(' - ')[0]}</span>
          </motion.div>
        </motion.div>
        
        <motion.div 
          variants={itemVariants} 
          className="relative lg:ml-auto w-full max-w-md mx-auto aspect-square rounded-3xl bg-white/80 border border-slate-200/80 p-6 sm:p-8 shadow-xl backdrop-blur-xl flex flex-col"
          aria-label="Latest Problems List"
        >
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex justify-between items-center text-xs font-bold text-slate-400 tracking-widest uppercase mb-6 shrink-0 relative z-10">
            <span>Your Next Move</span>
            <span>Latest 5</span>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 relative z-10 custom-scrollbar">
            <div className="relative pl-6 space-y-5 before:absolute before:inset-y-2 before:left-2.5 before:w-px before:bg-gradient-to-b before:from-indigo-400 before:to-slate-200">
              {latestProblems.length > 0 ? (
                latestProblems.map((problem, i) => (
                  <Link to={`/problem/${problem.id}`} key={problem.id} className="flex items-center gap-4 relative group cursor-pointer">
                    <div className={`absolute -left-[1.6rem] w-3 h-3 rounded-full ${problem.status === 'Completed' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : problem.status === 'In Progress' ? 'bg-amber-500' : 'bg-slate-300'} border-2 border-white z-10 group-hover:scale-125 transition-transform`} />
                    <div className={`p-2.5 rounded-lg transition-colors ${problem.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                      <Code2 size={18} />
                    </div>
                    <span className={`font-semibold transition-colors line-clamp-2 ${problem.status === 'Completed' ? 'text-emerald-700' : 'text-slate-600 group-hover:text-indigo-700'}`}>
                      {problem.title}
                    </span>
                  </Link>
                ))
              ) : (
                <div className="text-sm text-slate-500 italic ml-2">Loading latest problems...</div>
              )}
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 relative z-10">
            <span className="text-sm font-medium text-slate-500">Keep up the momentum</span>
            <div className="flex items-center gap-3">
              <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-indigo-500 w-[100%] rounded-full animate-pulse" />
              </div>
              <strong className="text-sm text-slate-800 font-bold">New</strong>
            </div>
          </div>
        </motion.div>
      </section>
      
      <motion.section 
        variants={itemVariants}
        className="w-[100vw] relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] border-y border-slate-200/80 bg-white/50 overflow-hidden py-6 flex items-center"
      >
        <div className="flex animate-[marquee_20s_linear_infinite] whitespace-nowrap gap-12 px-6 text-slate-400 font-bold uppercase tracking-widest text-sm">
          {["Patterns", "Practice", "Progress", "Confidence", "Consistency", "Patterns", "Practice", "Progress", "Confidence", "Consistency"].map((text, i) => (
            <span key={i} className="flex items-center gap-12">
              <span>{text}</span>
              <span className="text-slate-300">•</span>
            </span>
          ))}
        </div>
      </motion.section>

      {/* Daily MNC Motivational Banner */}
      <motion.section variants={containerVariants} className="pt-8 max-w-6xl mx-auto px-4 w-full">
        <motion.div variants={itemVariants} className="relative rounded-[2rem] overflow-hidden shadow-2xl group border border-slate-200">
          
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
            style={{ backgroundImage: `url(${dailyData.image})` }}
          />
          
          {/* Gradients to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent mix-blend-multiply" />
          <div className="absolute inset-0 bg-indigo-950/40" />

          {/* Content */}
          <div className="relative z-10 p-10 sm:p-16 flex flex-col items-center text-center">
            
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8 text-white text-sm font-bold tracking-widest uppercase shadow-lg">
              <Building2 size={16} className="text-amber-400" />
              Daily Vision • {dailyData.company}
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-tight max-w-3xl tracking-tight">
              "{dailyData.quote}"
            </h2>
            
            <p className="text-slate-200 text-lg sm:text-xl mb-10 max-w-2xl font-medium leading-relaxed">
              {dailyData.message}
            </p>

            <Link to="/solve" className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-50 px-8 py-4 rounded-xl font-bold transition-all hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.2)] group/btn text-lg">
              Start Today's Session
              <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </motion.section>
      
      <motion.section variants={containerVariants} className="pt-10" id="how-it-works">
        <motion.div variants={itemVariants} className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-indigo-600 font-bold text-sm tracking-widest uppercase mb-3">A system that sticks</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
            Small sessions. <br />
            <span className="italic font-medium text-slate-500">Visible progress.</span>
          </h2>
        </motion.div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { num: "01", icon: Check, title: "Know what to study next", desc: "Follow a clear path from foundations to the patterns that show up in real interviews.", color: "from-rose-500/10 to-transparent", border: "hover:border-rose-300", text: "text-rose-600", bg: "bg-rose-50" },
            { num: "02", icon: BarChart3, title: "Make effort count", desc: "Keep your solved problems, current streak, and weak spots visible in one quiet dashboard.", color: "from-emerald-500/10 to-transparent", border: "hover:border-emerald-300", text: "text-emerald-600", bg: "bg-emerald-50" },
            { num: "03", icon: Code2, title: "Practice with intention", desc: "Return to the problems that matter and build fluency instead of collecting tabs.", color: "from-indigo-500/10 to-transparent", border: "hover:border-indigo-300", text: "text-indigo-600", bg: "bg-indigo-50" }
          ].map((feature, i) => (
            <motion.article 
              key={i}
              variants={itemVariants}
              whileHover={{ y: -8 }}
              className={`group relative p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl backdrop-blur-sm transition-all duration-300 ${feature.border} overflow-hidden`}
            >
              <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl ${feature.color} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="flex justify-between items-start mb-6 relative z-10">
                <span className="text-5xl font-black text-slate-100 select-none group-hover:text-slate-200 transition-colors">{feature.num}</span>
                <div className={`p-3.5 rounded-2xl ${feature.bg} ${feature.text} shadow-sm group-hover:scale-110 transition-transform`}>
                  <feature.icon size={26} />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 relative z-10">{feature.title}</h3>
              <p className="text-slate-600 font-medium leading-relaxed relative z-10">{feature.desc}</p>
            </motion.article>
          ))}
        </div>
      </motion.section>

      {/* Marquee and Custom Scrollbar animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}} />
    </motion.div>
  )
}
