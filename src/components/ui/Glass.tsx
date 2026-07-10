import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../../lib/utils';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  droplet?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className, droplet, ...props }) => {
  return (
    <motion.div
      className={cn(
        "bg-white/30 backdrop-blur-xl border border-white/40 shadow-xl hover:shadow-lg transition-shadow",
        droplet ? "rounded-tl-[40px] rounded-br-[40px] rounded-tr-[10px] rounded-bl-[10px]" : "rounded-3xl",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  sizing?: 'sm' | 'md' | 'lg';
}

export const GlassInput: React.FC<GlassInputProps> = ({ className, label, sizing = 'md', ...props }) => {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm rounded-xl",
    md: "px-4 py-3 text-base rounded-2xl",
    lg: "px-5 py-4 text-lg rounded-2xl"
  };

  return (
    <div className="flex flex-col gap-1 w-full relative">
      {label && <label className="text-slate-700 text-xs ml-2 font-bold uppercase tracking-wider">{label}</label>}
      <input
        className={cn(
          "bg-white/40 border border-white/50 text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-md transition-all duration-200 shadow-sm",
          sizeClasses[sizing],
          className
        )}
        {...props}
      />
    </div>
  );
};

interface GlassSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  sizing?: 'sm' | 'md' | 'lg';
  options: { value: string | number; label: string }[];
}

export const GlassSelect: React.FC<GlassSelectProps> = ({ className, label, sizing = 'md', options, ...props }) => {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm rounded-xl",
    md: "px-4 py-3 text-base rounded-2xl",
    lg: "px-5 py-4 text-lg rounded-2xl"
  };

  return (
    <div className="flex flex-col gap-1 w-full relative z-10">
      {label && <label className="text-slate-700 text-xs ml-2 font-bold uppercase tracking-wider">{label}</label>}
      <select
        className={cn(
          "bg-white/40 border border-white/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-md transition-all appearance-none cursor-pointer shadow-sm",
          sizeClasses[sizing],
          "[&>option]:bg-white [&>option]:text-slate-800", 
          className
        )}
        {...props}
      >
        <option value="" disabled className="text-slate-400">Select an option</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className={`absolute right-3 ${sizing === 'sm' ? 'top-[26px]' : 'top-[36px]'} pointer-events-none`}>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className={`${sizing === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} text-slate-500`}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

interface GlassButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'danger';
  sizing?: 'sm' | 'md' | 'lg';
}

export const GlassButton: React.FC<GlassButtonProps> = ({ children, className, variant = 'primary', sizing = 'md', ...props }) => {
  const baseStyle = "font-semibold backdrop-blur-md border transition-all flex items-center justify-center gap-2";
  const sizeClasses = {
    sm: "px-4 py-2 rounded-xl text-sm",
    md: "px-6 py-3 rounded-2xl text-base",
    lg: "px-8 py-4 rounded-2xl text-lg"
  };
  const variants = {
    primary: "bg-blue-600 border-blue-500 text-white hover:bg-blue-700 shadow-lg",
    secondary: "bg-white/40 border-white/60 text-slate-800 hover:bg-white/50 shadow-sm",
    danger: "bg-red-500/80 border-red-500/50 text-white hover:bg-red-600 shadow-sm",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(baseStyle, sizeClasses[sizing], variants[variant], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export const GlassBadge: React.FC<{ children: React.ReactNode; variant?: 'success' | 'warning' | 'danger' | 'info'; className?: string }> = ({ children, variant = 'info', className }) => {
  const variants = {
    success: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-700 border-amber-500/30',
    danger: 'bg-red-500/20 text-red-700 border-red-500/30',
    info: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border backdrop-blur-sm",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};
