import { useState } from "react";

export interface Tab {
  label: string;
  content: React.ReactNode; 
}

interface TabsProps {
  tabs: Tab[];
  defaultIndex?: number;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, defaultIndex = 0, className }) => {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  return (
    <div className={`w-full flex flex-col ${className || ""}`}>
      <div className="flex border-b border-gray-300">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
              activeIndex === index
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveIndex(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto px-6">
        {tabs[activeIndex].content}
      </div>
    </div>
  );
};

