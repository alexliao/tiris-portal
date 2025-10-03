import React from 'react';

export const UnderConstruction: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="relative mb-6">
        <img
          src="/under-construction.png"
          alt="Under Construction"
          className="w-24 h-24 object-contain"
        />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        Under Construction
      </h3>
      <p className="text-gray-600 max-w-md">
        This feature is currently being built and will be available soon.
      </p>
    </div>
  );
};

export default UnderConstruction;
