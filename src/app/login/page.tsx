'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Loader2 } from 'lucide-react';
import { fetchWithAuth, handleApiResponse } from '@/lib/api';

/* 타입 정의 */
interface RequestLinkResponse {
  message: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const emailInputRef = useRef<HTMLInputElement>(null);

  // 이메일 유효성 검사 (RFC-5322)
  const isValidEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidEmail(email)) {
      setError('올바른 이메일 주소를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetchWithAuth('/api/auth/request-link', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      await handleApiResponse<RequestLinkResponse>(response);
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 링크 요청에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream to-apricot flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-mint to-apricot rounded-full flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-gray-700" />
              </div>
            </motion.div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              무명일기
            </CardTitle>
            <CardDescription className="text-gray-600">
              조용히, 당신의 하루를 기록해 보세요.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.2 }}
              >
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.2 }}
              >
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">
                    메일을 확인해 주세요. 로그인 링크가 발송되었습니다.
                  </AlertDescription>
                </Alert>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">
                    이메일 주소
                  </label>
                  <Input
                    ref={emailInputRef}
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="h-12 text-base"
                    disabled={isLoading}
                    required
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-mint to-apricot hover:from-apricot hover:to-mint text-gray-800 font-medium transition-all duration-200"
                  disabled={isLoading || !email.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      발송 중...
                    </>
                  ) : (
                    '로그인 링크 받기'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
} 