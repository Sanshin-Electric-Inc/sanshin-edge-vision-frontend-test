// components/common/Footer.tsx
'use client';

import { config } from '@/lib/config/environment';

interface FooterProps {
  className?: string;
}

export function Footer({ className = '' }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`bg-white border-t border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* 著作権情報 */}
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-600">
              © {currentYear}{' '}
              <span className="font-medium">SANSHIN ELECTRONICS CO., LTD.</span>{' '}
              All rights reserved.
            </p>
          </div>

          {/* システム情報 */}
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>Version {config.app.version}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}