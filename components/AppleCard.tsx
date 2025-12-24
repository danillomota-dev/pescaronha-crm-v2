import React from 'react';

interface AppleCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'solid';
}

export const AppleCard: React.FC<AppleCardProps> = ({ children, className = '', onClick, variant = 'default' }) => {
  const baseStyles = "rounded-[24px] border border-gray-200/60 transition-all duration-300";
  
  const variants = {
    default: "bg-white shadow-[0_4px_20px_rgba(15,52,67,0.05)] hover:shadow-[0_8px_30px_rgba(255,132,43,0.15)] hover:border-[#FF842B]/30",
    solid: "bg-[#0F3443] text-white hover:bg-[#154255]"
  };

  return (
    <div 
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${className} ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''}`}
    >
      {children}
    </div>
  );
};