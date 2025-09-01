import React from 'react';

interface AboutSectionProps {
  className?: string;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ 
  className = ''
}) => {
  return (
    <section 
      id="about"
      className={`bg-white py-16 ${className}`}
    >
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-['Bebas_Neue'] font-bold text-[#080404] leading-none mb-6">
          WHAT WE DO
        </h2>
        <div className="max-w-3xl mx-auto">
          <p className="text-lg font-['Nunito'] text-[#080404] leading-relaxed">
            Tiris is committed to utilizing artificial intelligence technology to implement quantitative trading strategies that can be consistently profitable. And to make the benefits of quantitative trading available to every trader, even if they are completely technically illiterate.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;