import React from 'react';
import Navigation from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { StaticMarkdownDocument } from '../../components/legal/StaticMarkdownDocument';

const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <main className="pt-32 pb-16 px-6 sm:px-10 lg:px-12">
        <div className="max-w-4xl mx-auto">
          <StaticMarkdownDocument slug="legal/privacy" />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPage;
