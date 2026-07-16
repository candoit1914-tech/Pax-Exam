import React, { useMemo } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, Users, BookOpen, Edit3, FileText, Settings, UserCog, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const navItems = (isAdmin: boolean) => isAdmin
  ? [
      { path: '/dashboard', icon: Home, label: 'Dashboard' },
      { path: '/students', icon: Users, label: 'Students' },
      { path: '/classes', icon: BookOpen, label: 'Classes' },
      { path: '/scores', icon: Edit3, label: 'Scores' },
      { path: '/reports', icon: FileText, label: 'Reports' },
    ]
  : [
      { path: '/scores', icon: Edit3, label: 'Scores' },
    ];

export const Layout: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');
  const role = currentUser?.role || 'teacher';
  const isAdmin = role === 'super_admin' || role === 'school_admin';
  const items = navItems(isAdmin);

  const userInitials = useMemo(() => {
    const name = currentUser?.name || currentUser?.email || '';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  }, [currentUser]);

  const roleLabel = useMemo(() => {
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'school_admin') return 'School Admin';
    return 'Teacher';
  }, [role]);

  const isUnprotectedRoute = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/student-portal' || location.pathname === '/student-login';
  const isStudentRoute = location.pathname === '/student-dashboard';

  if (isUnprotectedRoute) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="w-full"
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    );
  }

  // For student dashboard, render without sidebar/nav — full screen scrollable
  if (isStudentRoute) {
    return (
      <div className="w-full h-screen overflow-y-auto no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
        <Outlet />
      </div>
    );
  }

  const currentItem = items.find(item => location.pathname.startsWith(item.path));
  const pageTitle = currentItem?.label || 'Settings';

  return (
    <>
      {/* Desktop layout */}
      <div className="hidden md:flex w-full h-screen bg-gradient-to-br from-slate-50/80 to-white/40 backdrop-blur-sm">
        <aside className="w-64 bg-white/80 backdrop-blur-xl border-r border-white/30 shadow-lg flex flex-col shrink-0">
          <div className="p-6 border-b border-white/30">
            <h1 className="text-2xl font-black bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-600 bg-clip-text text-transparent leading-none">Ok20</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">School Exam Management</p>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {items.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all group",
                    isActive
                      ? "bg-blue-500/10 text-blue-700 shadow-sm border border-blue-200/50"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
                  )}
                >
                  <Icon size={18} className={cn("shrink-0 transition-colors", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight size={14} className="ml-auto text-blue-400" />}
                </NavLink>
              );
            })}
            {isAdmin && (
              <NavLink
                to="/teachers"
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all group mt-3 pt-3 border-t border-white/20",
                  isActive ? "bg-blue-500/10 text-blue-700 border border-blue-200/50" : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
                )}
              >
                <UserCog size={18} className={cn("shrink-0", location.pathname === '/teachers' ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                <span>Teachers</span>
                {location.pathname === '/teachers' && <ChevronRight size={14} className="ml-auto text-blue-400" />}
              </NavLink>
            )}
            <NavLink
              to="/settings"
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all group",
                isActive ? "bg-blue-500/10 text-blue-700 border border-blue-200/50" : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
              )}
            >
              <Settings size={18} className={cn("shrink-0", location.pathname === '/settings' ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
              <span>Settings</span>
              {location.pathname === '/settings' && <ChevronRight size={14} className="ml-auto text-blue-400" />}
            </NavLink>
          </nav>
          <div className="p-4 border-t border-white/30 bg-white/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800 truncate">{currentUser?.name || 'User'}</p>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{roleLabel}</p>
              </div>
            </div>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-5xl xl:max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl lg:text-3xl font-black text-slate-900">{pageTitle}</h1>
            </div>
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
          </div>
        </main>
      </div>

      {/* Mobile layout (unchanged) */}
      <div className="md:hidden mobile-container flex flex-col">
        <div className="sticky top-0 z-40 bg-white/40 backdrop-blur-3xl border-b border-white/40 shadow-sm p-4 px-6 mb-4 flex justify-between items-center transition-all shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
          <div>
             <h1 className="text-2xl font-black tracking-tight text-slate-900 transition-all duration-300">{pageTitle}</h1>
             <p className="text-blue-600 font-bold uppercase tracking-widest text-[9px] drop-shadow-sm">{currentItem?.subtitle || 'System & Profile Configuration'}</p>
          </div>
          <div className="flex items-center gap-1">
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
            {items.map((item) => {
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
                  <div className="group-hover:scale-110 transition-transform duration-200">
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
    </>
  );
};
