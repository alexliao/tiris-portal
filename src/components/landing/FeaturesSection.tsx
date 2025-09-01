import React from 'react';

interface FeaturesSectionProps {
  className?: string;
}

interface Feature {
  title: string;
  description: string;
  bgColor: string;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ 
  className = ''
}) => {
  const features: Feature[] = [
    {
      title: 'Profitable',
      description: 'Our trading strategy, developed based on the cutting edge AI technology and validated by extensive historical data backtesting, has earned a 140% return on ETH/USDT trading throughout 2024.',
      bgColor: 'bg-[#C8A882]'
    },
    {
      title: 'Secure',
      description: 'We only provide trading strategies and do not hold user funds in custody like traditional hedge funds. Your funds are safely held in your own account in exchanges.',
      bgColor: 'bg-[#C8969C]'
    },
    {
      title: 'Automatic',
      description: 'Our smart strategies are encapsulated in trading robots. The robot can work 24/7 without any breaks and is not affected by emotions.',
      bgColor: 'bg-[#8FA4C8]'
    },
    {
      title: 'Simple',
      description: 'We have hidden all the technical details so that users can turn on automated quantitative trading with a single click in an extremely simple and easy-to-use interface.',
      bgColor: 'bg-[#82B894]'
    }
  ];

  return (
    <section 
      id="features"
      className={`bg-white ${className}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, index) => (
          <div
            key={index}
            className={`${feature.bgColor} p-8 text-center min-h-[300px] flex flex-col justify-start`}
          >
            <h3 className="font-['Raleway'] font-bold text-xl text-white mb-6 mt-4">
              {feature.title}
            </h3>
            <p className="font-['Nunito'] text-sm text-white leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;