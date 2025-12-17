import React from 'react';
import Layout from '@/components/Layout';

export const Home: React.FC = () => {
  return (
    <Layout>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to Fazner AI Platform
        </h1>
        <p className="text-lg text-gray-600">
          Your enterprise AI solution for intelligent automation
        </p>
      </div>
    </Layout>
  );
};

export default Home;