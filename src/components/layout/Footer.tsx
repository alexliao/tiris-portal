import React from 'react';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ 
  className = ''
}) => {
  return (
    <footer className={`bg-white py-8 border-t border-gray-200 ${className}`}>
      <div className="max-w-6xl mx-auto px-6 text-center">
        <div className="mb-4">
          <a 
            href="mailto:biganiseed@gmail.com" 
            className="inline-flex items-center text-[#080404] hover:opacity-70 transition-opacity"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
            </svg>
            biganiseed@gmail.com
          </a>
        </div>
        <div className="text-sm text-[#080404] font-['Nunito']">
          © 2025 Tiris.ai
        </div>
      </div>
    </footer>
  );
};

export default Footer;