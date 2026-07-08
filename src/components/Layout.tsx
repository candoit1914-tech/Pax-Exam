import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, Users, BookOpen, Edit3, FileText, Settings, UserCog, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export const Layout: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const role = user?.role || JSON.parse(localStorage.getItem('user') || '{}').role;
  const isAdmin = role === 'super_admin' || role === 'school_admin';

  const navItems = isAdmin
    ? [
        { path: '/dashboard', icon: Home, label: 'Dashboard', subtitle: 'Overview & Analytics' },
        { path: '/students', icon: Users, label: 'Students', subtitle: 'Manage Enrolments & Data' },
        { path: '/classes', icon: BookOpen, label: 'Classes', subtitle: 'Manage Classes & Subjects' },
        { path: '/scores', icon: Edit3, label: 'Scores', subtitle: 'Record Academic Performance' },
        { path: '/reports', icon: FileText, label: 'Reports', subtitle: 'Generate Formal Report Cards' },
      ]
    : [
        { path: '/scores', icon: Edit3, label: 'Scores', subtitle: 'Record Academic Performance' },
        { path: '/reports', icon: FileText, label: 'Reports', subtitle: 'View Reports' },
      ];

  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/student-portal') {
    return (
      <AnimatePresence mode="wait">
        <motion.div 
          key={location.pathname}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    );
  }

  const currentItem = navItems.find(item => location.pathname.startsWith(item.path));
  const pageTitle = currentItem?.label || 'Settings';
  const pageSubtitle = currentItem?.subtitle || 'System & Profile Configuration';

  return (
    <div className="mobile-container flex flex-col">
      <div className="sticky top-0 z-40 bg-white/40 backdrop-blur-3xl border-b border-white/40 shadow-sm p-4 px-6 mb-4 flex justify-between items-center transition-all shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div>
           <h1 className="text-2xl font-black tracking-tight text-slate-900">{pageTitle}</h1>
           <p className="text-blue-600 font-bold uppercase tracking-widest text-[9px] drop-shadow-sm">{pageSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <NavLink to="/teachers" className={({ isActive }) => cn(
              "p-2 rounded-full flex items-center justify-center backdrop-blur-md border shadow-sm transition-all",
              isActive ? "bg-white border-white/60 text-blue-600" : "bg-white/40 border-white/50 text-slate-700 hover:bg-white/60"
            )}>
              <UserCog size={20} />
            </NavLink>
          )}
          <NavLink 
            to="/settings" 
            className={({ isActive }) => cn(
              "p-2 rounded-full flex items-center justify-center backdrop-blur-md border shadow-sm transition-all",
              isActive ? "bg-white border-white/60 text-blue-600" : "bg-white/40 border-white/50 text-slate-700 hover:bg-white/60"
            )}
          >
            <Settings size={20} className={location.pathname === '/settings' ? "animate-[spin_4s_linear_infinite]" : ""} />
          </NavLink>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full max-w-[480px] bg-white/30 backdrop-blur-3xl border-t border-white/50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-3 pb-8 z-50 overflow-hidden" style={{ clipPath: 'polygon(0 10px, 100% 0, 100% 100%, 0 100%)' }}>
        <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent"></div>
        <nav className="flex justify-around items-center relative z-10 px-2 mt-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            
            return (
              <NavLink 
                key={item.path} 
                to={item.path}
                className="flex flex-col items-center gap-1 relative w-16 group"
              >
                {isActive && (
                  <motion.div 
                    layoutId="nav-bubble"
                    className="absolute -inset-3 bg-blue-400/20 rounded-full blur-md -z-10"
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  />
                )}
                <div className="relative">
                  <Icon size={24} className={cn("transition-all duration-300", isActive ? "text-blue-700 scale-110 drop-shadow-md" : "text-slate-600 group-hover:scale-105")} />
                  {isActive && (
                    <motion.div
                      layoutId="water-bubble"
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-sky-300 rounded-full border-2 border-white/50 shadow-[0_0_10px_rgba(125,211,252,0.8)]"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    />
                  )}
                </div>
                <span className={cn("text-[9px] font-black uppercase tracking-widest transition-all duration-300", isActive ? "text-blue-800 drop-shadow-sm mt-1" : "text-slate-500 opacity-80 mt-1")}>
                  {item.label}
                </span>
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  );
};

