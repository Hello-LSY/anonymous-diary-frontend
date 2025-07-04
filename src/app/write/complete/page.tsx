'use client';

// 동적 렌더링 강제
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Heart, ArrowRight, CheckCircle } from 'lucide-react';

export default function WriteCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const diaryId = searchParams.get('id');
  const [showMessage, setShowMessage] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!diaryId) {
      router.push('/');
      return;
    }

    // 애니메이션 순서대로 실행
    const timer1 = setTimeout(() => setShowMessage(true), 500);
    const timer2 = setTimeout(() => setShowButton(true), 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [diaryId, router]);

  // showButton이 true가 되면 카운트다운 5초 시작
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let interval: NodeJS.Timeout | null = null;

    if (showButton) {
      setCountdown(5);
      timer = setTimeout(() => {
        interval = setInterval(() => {
          setCountdown(prev => {
            if (prev !== null && prev > 1) {
              return prev - 1;
            }
            if (interval) clearInterval(interval);
            return 0;
          });
        }, 1000);
      }, 100);

      return () => {
        if (timer) clearTimeout(timer);
        if (interval) clearInterval(interval);
      };
    } else {
      setCountdown(null);
    }
  }, [showButton]);

  useEffect(() => {
    if (showButton && countdown === 0) {
      router.push('/');
    }
  }, [countdown, router, showButton]);

  const handleViewAll = () => {
    router.push('/');
  };

  const handleWriteMore = () => {
    router.push('/write');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream to-apricot flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-mint to-apricot rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-gray-700" />
              </div>
            </motion.div>

            {/* 제목 */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-2xl font-bold text-gray-800 mb-4"
            >
              일기 작성 완료
            </motion.h1>

            {/* 감성적 메시지 */}
            <AnimatePresence>
              {showMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="mb-8"
                >
                  <div className="p-6 bg-gradient-to-br from-mint/20 to-apricot/20 rounded-xl border border-mint/30">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1, delay: 0.8 }}
                      className="flex items-center justify-center mb-3"
                    >
                      <Sparkles className="w-5 h-5 text-mint mr-2" />
                      <Heart className="w-5 h-5 text-apricot" />
                    </motion.div>
                    <p className="text-lg text-gray-700 italic leading-relaxed">
                      "무명의 기록이 누군가의 하루에<br />
                      조용히 스며듭니다."
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 버튼들 */}
            <AnimatePresence>
              {showButton && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="space-y-3"
                >
                  <Button
                    onClick={handleViewAll}
                    className="w-full h-12 bg-gradient-to-r from-mint to-apricot hover:from-apricot hover:to-mint text-gray-800 font-medium"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    전체글 보기
                  </Button>
                  <Button
                    onClick={handleWriteMore}
                    variant="outline"
                    className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    또 다른 일기 작성하기
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 자동 이동 카운트다운 */}
            <AnimatePresence>
              {showButton && countdown !== null && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="mt-4"
                >
                  <p className="text-sm text-gray-500">
                    {countdown}초 후 자동으로 전체글 보기로 이동합니다
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* 배경 애니메이션 효과 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ duration: 2, delay: 1 }}
        className="fixed inset-0 pointer-events-none"
      >
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-mint/20 rounded-full blur-xl" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-apricot/20 rounded-full blur-xl" />
      </motion.div>
    </div>
  );
} 