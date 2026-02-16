
import React from 'react';
import { Link } from 'react-router-dom';
import notFound from '../assets/not-found.png'

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <img src={notFound} alt="" />
        <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
        <p className="mb-4">The page you are looking for does not exist.</p>
        <Link to="/dashboard" className="text-sky-600 hover:underline font-semibold">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
};
