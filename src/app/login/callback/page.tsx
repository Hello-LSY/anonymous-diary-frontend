// app/login/callback/page.tsx
'use client';

// 동적 렌더링 강제
export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function LoginCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const accessToken = searchParams.get('accessToken');
        const id = searchParams.get('id');
        const nickname = searchParams.get('nickname');

        if (!accessToken || !id) {
          throw new Error('필수 인증 정보가 누락되었습니다.');
        }

        // 토큰을 localStorage에 저장
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('userId', id);
        if (nickname) {
          localStorage.setItem('userNickname', decodeURIComponent(nickname));
        }

        setStatus('success');
        
        // 2초 후 홈페이지로 리다이렉트
        setTimeout(() => {
          router.push('/');
        }, 2000);

      } catch (err) {
        console.error('Login callback error:', err);
        setError(err instanceof Error ? err.message : '로그인 처리 중 오류가 발생했습니다.');
        setStatus('error');
        
        // 3초 후 로그인 페이지로 리다이렉트
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream to-apricot flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardContent className="p-8 text-center">
            {status === 'loading' && (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-gray-600 mx-auto" />
                <h2 className="text-xl font-semibold text-gray-800">
                  로그인 처리 중...
                </h2>
                <p className="text-gray-600">
                  잠시만 기다려주세요.
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-mint to-apricot rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-gray-700" />
                  </div>
                </motion.div>
                <h2 className="text-2xl font-semibold text-deepgreen-700">로그인 완료</h2>
                <h2 className="text-xl font-semibold text-deepgreen-700">
                  오늘도 조용히, 당신의 하루를 기록해 보세요.
                </h2>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <XCircle className="w-12 h-12 text-red-500 mx-auto" />
                <h2 className="text-xl font-semibold text-gray-800">
                  로그인 실패
                </h2>
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                <p className="text-gray-600">
                  로그인 페이지로 이동합니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
