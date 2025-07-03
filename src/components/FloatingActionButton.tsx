'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { User, Plus, LogOut, LogIn } from 'lucide-react';
import { User as UserType } from '@/types';
import { motion } from 'framer-motion';

interface FloatingActionButtonProps {
  user: UserType | null;
  onLogout: () => void;
}

export default function FloatingActionButton({ user, onLogout }: FloatingActionButtonProps) {
  const router = useRouter();
  const [isFloatingMenuOpen, setIsFloatingMenuOpen] = useState(false);

  const handleClick = () => {
    if (user) {
      router.push('/write');
    } else {
      router.push('/login');
    }
  };

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-6 right-6 z-50"
    >
      {/* 플로팅 메뉴 아이템들 */}
      {isFloatingMenuOpen && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="absolute bottom-16 right-0"
          >
            <Button
              onClick={(e) => handleButtonClick(e, () => router.push('/write'))}
              className="h-10 px-4 rounded-full bg-deepgreen-600 hover:bg-deepgreen-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">일기 작성</span>
            </Button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, delay: 0.2 }}
            className="absolute bottom-28 right-0"
          >
            <Button
              onClick={(e) => handleButtonClick(e, () => router.push('/profile'))}
              className="h-10 px-4 rounded-full bg-deepnavy-600 hover:bg-deepnavy-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">내 정보</span>
            </Button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, delay: 0.3 }}
            className="absolute bottom-40 right-0"
          >
            <Button
              onClick={(e) => handleButtonClick(e, onLogout)}
              className="h-10 px-4 rounded-full bg-beige-600 hover:bg-beige-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">로그아웃</span>
            </Button>
          </motion.div>
        </>
      )}

      {/* 메인 플로팅 버튼 */}
      <Button
        onClick={(e) => handleButtonClick(e, () => setIsFloatingMenuOpen(!isFloatingMenuOpen))}
        className={`w-14 h-14 rounded-full ${
          isFloatingMenuOpen 
            ? 'bg-deepnavy-700 text-white' 
            : 'bg-deepgreen-600 hover:bg-deepgreen-700 text-white'
        } shadow-lg hover:shadow-xl transition-all duration-200`}
      >
        <div className={`transition-transform duration-200 ${isFloatingMenuOpen ? 'rotate-45' : 'rotate-0'}`}>
          <Plus className="w-6 h-6" />
        </div>
      </Button>
    </motion.div>
  );
} 