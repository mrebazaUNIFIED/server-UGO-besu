import {type  ReactNode } from "react";

interface InputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  icon?: ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`
            w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 
            shadow-sm placeholder-gray-400 
            focus:outline-none focus:ring-2 focus:ring-[var(--rojo)] focus:border-[var(--rojo-oscuro)]
            transition-all duration-200
          `}
        />
      </div>
    </div>
  );
};
