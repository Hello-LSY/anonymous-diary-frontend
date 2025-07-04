'use client';

// 동적 렌더링 강제
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, BookOpen, Wand2, ArrowLeft, Copy, X, Maximize2, Feather } from 'lucide-react';
import { fetchWithAuth, handleApiResponse } from '@/lib/api';
import { CreateDiaryRequest, RefineRequest, RefineResponse, RefineUsageResponse } from '@/types';

export default function WritePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visible, setVisible] = useState(true);
  const [allowComment, setAllowComment] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // AI 다듬기 관련 상태
  const [refineType, setRefineType] = useState<'NATURAL' | 'EMOTIONAL' | 'SIMPLIFY' | 'EXPAND'>('NATURAL');
  const [isRefining, setIsRefining] = useState(false);
  const [animatedRefinedText, setAnimatedRefinedText] = useState('');
  const [fullRefinedText, setFullRefinedText] = useState(''); // 전체 다듬기 결과
  const [modalAnimatedText, setModalAnimatedText] = useState(''); // 모달용 애니메이션 텍스트
  const [isModalOpen, setIsModalOpen] = useState(false);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const modalAnimationRef = useRef<NodeJS.Timeout | null>(null);
  const [refineUsage, setRefineUsage] = useState<RefineUsageResponse | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [aiPanelVisible, setAiPanelVisible] = useState(true);

  // 로그인 상태 확인
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  // AI 다듬기 사용량 로드
  const loadRefineUsage = async () => {
    setIsLoadingUsage(true);
    try {
      const response = await fetchWithAuth('/api/ai/refine/usage');
      const usageData = await handleApiResponse<RefineUsageResponse>(response);
      setRefineUsage(usageData);
    } catch (err) {
      console.error('사용량 로드 실패:', err);
    } finally {
      setIsLoadingUsage(false);
    }
  };

  // 초기 로딩 시 사용량 가져오기
  useEffect(() => {
    loadRefineUsage();
  }, []);

  // 수정 모드일 때 기존 일기 데이터 로드
  useEffect(() => {
    if (editId) {
      setIsEditMode(true);
      setIsLoading(true);
      loadExistingDiary();
    }
  }, [editId]);

  // 기존 일기 데이터 로드
  const loadExistingDiary = async () => {
    try {
      const response = await fetchWithAuth(`/api/diaries/${editId}`);
      const diaryData = await handleApiResponse<any>(response);
      
      setTitle(diaryData.title || '');
      setContent(diaryData.content);
      setVisible(diaryData.visible);
      setAllowComment(diaryData.allowComment);
    } catch (err) {
      console.error('기존 일기 로드 실패:', err);
      setError('기존 일기를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 일기 저장
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('일기 내용을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (isEditMode && editId) {
        // 수정 모드: PATCH 요청
        const updateData = {
          title: title.trim() || '', // 빈 문자열로 보내서 백엔드에서 처리
          content: content.trim(),
          visible,
          allowComment,
        };

        const response = await fetchWithAuth(`/api/diaries/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(updateData),
        });

        if (response.status === 204) {
          // 수정 성공 시 일기 상세 페이지로 이동
          router.push(`/diaries/${editId}`);
        } else {
          throw new Error('일기 수정에 실패했습니다.');
        }
      } else {
        // 새로 작성 모드: POST 요청
        const diaryData: CreateDiaryRequest = {
          title: title.trim() || '', // 빈 문자열로 보내서 백엔드에서 처리
          content: content.trim(),
          visible,
          allowComment,
        };

        const response = await fetchWithAuth('/api/diaries', {
          method: 'POST',
          body: JSON.stringify(diaryData),
        });

        const result = await handleApiResponse<{ id: string }>(response);
        
        // 완료 페이지로 이동
        router.push(`/write/complete?id=${result.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (isEditMode ? '일기 수정에 실패했습니다.' : '일기 저장에 실패했습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // AI 다듬기 실행
  const handleRefine = async () => {
    if (!content.trim()) {
      setError('일기 내용을 입력해주세요.');
      return;
    }
    
    setIsRefining(true);
    setError('');
    setAnimatedRefinedText('');
    setFullRefinedText('');
    
    try {
      const refineData: RefineRequest = {
        content: content.trim(),
        refineType,
      };
      
      // 새로운 AI 정제 API 호출
      const response = await fetchWithAuth('/api/ai/refine', {
        method: 'POST',
        body: JSON.stringify(refineData),
      });
      
      const result = await handleApiResponse<RefineResponse>(response);
      
      // 전체 결과 저장
      setFullRefinedText(result.refinedContent);
      
      // 사용량 새로고침
      await loadRefineUsage();
      
      // 타이핑 애니메이션 시작
      let i = 0;
      if (animationRef.current) clearInterval(animationRef.current);
      animationRef.current = setInterval(() => {
        setAnimatedRefinedText(result.refinedContent.slice(0, i + 1));
        i++;
        if (i >= result.refinedContent.length) {
          if (animationRef.current) clearInterval(animationRef.current);
        }
      }, 20);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 다듬기에 실패했습니다.');
    } finally {
      setIsRefining(false);
    }
  };

  // 다듬기 결과 복사
  const handleCopyRefine = async () => {
    try {
      await navigator.clipboard.writeText(fullRefinedText);
      // 복사 성공 피드백 (선택사항)
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  // 다듬기 결과 지우기
  const handleClearRefine = () => {
    setAnimatedRefinedText('');
    setFullRefinedText('');
    if (animationRef.current) clearInterval(animationRef.current);
  };

  // 다듬기 결과 적용
  const handleApplyRefine = () => {
    setContent(fullRefinedText);
    setAnimatedRefinedText('');
    setFullRefinedText('');
  };

  // 모달 열기
  const handleOpenModal = () => {
    setIsModalOpen(true);
    // 모달에서 타이핑 애니메이션 시작
    let i = 0;
    setModalAnimatedText('');
    if (modalAnimationRef.current) clearInterval(modalAnimationRef.current);
    modalAnimationRef.current = setInterval(() => {
      setModalAnimatedText(fullRefinedText.slice(0, i + 1));
      i++;
      if (i >= fullRefinedText.length) {
        if (modalAnimationRef.current) clearInterval(modalAnimationRef.current);
      }
    }, 20);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalAnimatedText('');
    if (modalAnimationRef.current) clearInterval(modalAnimationRef.current);
  };

  // 다듬기 타입 라벨
  const getRefineTypeLabel = (type: string) => {
    switch (type) {
      case 'NATURAL': return '더 자연스럽게';
      case 'EMOTIONAL': return '감성적으로';
      case 'SIMPLIFY': return '간결하게';
      case 'EXPAND': return '더 풍부하게';
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-warm-50 via-beige-50 to-warm-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 뒤로가기 버튼 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="text-beige-600 hover:text-deepnavy-700 hover:bg-beige-100 transition-colors duration-200 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            뒤로가기
          </Button>
        </motion.div>

        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-light text-deepnavy-800 mb-4 tracking-wide font-poetic">
            {isEditMode ? '일기 수정' : '오늘의 기록'}
          </h1>
          {isEditMode && (
            <p className="text-beige-600 text-xl font-light max-w-2xl mx-auto leading-relaxed">
              기존 일기를 수정해보세요
            </p>
          )}
        </motion.div>

        {/* 에러 메시지 */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-8"
          >
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* 로딩 상태 */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-8"
          >
            <Alert className="bg-beige-50 border-beige-200">
              <AlertDescription className="flex items-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                기존 일기를 불러오는 중...
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          <div className={`grid grid-cols-1 xl:gap-8 ${aiPanelOpen ? 'xl:grid-cols-12' : ''}`}>
            {/* 일기 작성 폼 */}
            <motion.div
              layout
              transition={{ type: 'spring', duration: 0.5, bounce: 0.12 }}
              className={aiPanelOpen ? 'xl:col-span-8' : 'xl:col-span-12'}
              style={{ minWidth: 0 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm border border-beige-200 shadow-lg">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-3 text-deepnavy-800 text-2xl font-light">
                    <BookOpen className="w-6 h-6 text-deepgreen-600" />
                    {isEditMode ? '일기 수정' : '오늘의 기록'}
                  </CardTitle>
                  <CardDescription className="text-beige-600 text-base">
                    {isEditMode ? '기존 일기를 수정해보세요' : '마음을 담아 자유롭게 작성해보세요'}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-8">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-3">
                      <label htmlFor="title" className="text-base font-medium text-deepnavy-700">
                        제목 (선택사항)
                      </label>
                      <Input
                        id="title"
                        placeholder="일기의 제목을 입력해주세요..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-lg border-beige-300 focus:border-deepgreen-500 focus:ring-deepgreen-500/20 h-12"
                        disabled={isSubmitting || isLoading}
                      />
                    </div>

                    <div className="space-y-3">
                      <label htmlFor="content" className="text-base font-medium text-deepnavy-700">
                        오늘의 기록
                      </label>
                      <Textarea
                        id="content"
                        placeholder="오늘 하루는 어땠나요? 기쁜 일, 슬픈 일, 평범한 일... 어떤 것이든 마음을 담아 자유롭게 적어보세요. 여기서는 누구도 당신을 판단하지 않습니다."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="min-h-[500px] resize-none text-lg leading-relaxed border-beige-300 focus:border-deepgreen-500 focus:ring-deepgreen-500/20 p-6"
                        disabled={isSubmitting || isLoading}
                      />
                      <p className="text-sm text-beige-600 text-right">
                        {content.length}자
                      </p>
                    </div>

                    <div className="space-y-6 p-6 bg-gradient-to-r from-beige-50 to-warm-50 rounded-xl border border-beige-200">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <label className="text-base font-medium text-deepnavy-700">
                            공개 설정
                          </label>
                          <p className="text-sm text-beige-600">
                            다른 사용자들이 볼 수 있습니다
                          </p>
                        </div>
                        <Switch
                          checked={visible}
                          onCheckedChange={setVisible}
                          disabled={isSubmitting || isLoading}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <label className="text-base font-medium text-deepnavy-700">
                            댓글 허용
                          </label>
                          <p className="text-sm text-beige-600">
                            다른 사용자들의 댓글을 받습니다
                          </p>
                        </div>
                        <Switch
                          checked={allowComment}
                          onCheckedChange={setAllowComment}
                          disabled={isSubmitting || isLoading}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-14 bg-gradient-to-r from-deepgreen-600 to-deepgreen-700 hover:from-deepgreen-700 hover:to-deepgreen-800 text-white font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                      disabled={isSubmitting || isLoading || !content.trim()}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                          {isEditMode ? '수정 중...' : '저장 중...'}
                        </>
                      ) : (
                        isEditMode ? '수정 완료' : '기록 완료'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* AI 다듬기 패널 */}
            <AnimatePresence onExitComplete={() => setAiPanelOpen(false)}>
              {aiPanelVisible && (
                <motion.div
                  key="ai-panel"
                  layout
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 120 }}
                  transition={{ type: 'spring', duration: 0.5, bounce: 0.12 }}
                  className="xl:col-span-4 relative"
                  style={{ minWidth: 0 }}
                >
                  <Card className="bg-white/80 backdrop-blur-sm border border-beige-200 shadow-lg h-fit sticky top-8 min-w-[320px]">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-deepnavy-800 text-xl font-light">
                          <Wand2 className="w-5 h-5 text-deepgreen-600" />
                          AI 다듬기
                        </CardTitle>
                        <button
                          onClick={() => setAiPanelVisible(false)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-beige-700 hover:bg-mint-100 transition-colors text-sm"
                          title="AI 다듬기 닫기"
                        >
                          <Feather className="w-4 h-4" /> 닫기
                        </button>
                      </div>
                      <CardDescription className="text-beige-600 text-xs">
                        AI가 오늘의 일기에 어울리는 제목을 추천하고, 문장을 다듬어줍니다.
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4 min-h-[400px] flex flex-col">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-deepnavy-700">
                          다듬기 스타일
                        </label>
                        <Select
                          value={refineType}
                          onValueChange={(value: 'NATURAL' | 'EMOTIONAL' | 'SIMPLIFY' | 'EXPAND') => setRefineType(value)}
                          disabled={isRefining}
                        >
                          <SelectTrigger className="border-beige-300 focus:border-deepgreen-500 focus:ring-deepgreen-500/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NATURAL">더 자연스럽게</SelectItem>
                            <SelectItem value="EMOTIONAL">감성적으로</SelectItem>
                            <SelectItem value="SIMPLIFY">간결하게</SelectItem>
                            <SelectItem value="EXPAND">더 풍부하게</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        {content.length > 3000 && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm text-amber-700">
                              AI 다듬기는 3000자 이하로 지원됩니다. ({content.length}자)
                            </p>
                          </div>
                        )}
                        <Button
                          onClick={handleRefine}
                          disabled={isRefining || !content.trim() || (refineUsage?.remaining ?? 0) <= 0 || content.length > 3000}
                          className="w-full bg-deepgreen-600 hover:bg-deepgreen-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {isRefining ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              다듬는 중...
                            </>
                          ) : content.length > 3000 ? (
                            '3000자 초과로 다듬기 불가'
                          ) : (
                            '다듬기 실행'
                          )}
                        </Button>
                        
                        {/* 사용량 표시 */}
                        {refineUsage && (
                          <div className="flex items-center justify-between p-3 bg-beige-100/50 rounded-lg border border-beige-200">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-deepgreen-600" />
                              <span className="text-sm font-medium text-deepnavy-700">오늘 사용량</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-beige-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full transition-all duration-300 bg-deepgreen-500"
                                  style={{ 
                                    width: `${(refineUsage.used / refineUsage.limit) * 100}%`
                                  }}
                                />
                              </div>
                              <span className="text-xs text-beige-600">
                                {refineUsage.remaining}회 남음
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {isLoadingUsage && (
                          <div className="flex items-center justify-center p-3 bg-beige-100/50 rounded-lg border border-beige-200">
                            <Loader2 className="w-4 h-4 animate-spin text-deepgreen-600 mr-2" />
                            <span className="text-sm text-beige-600">사용량 확인 중...</span>
                          </div>
                        )}
                      </div>

                      {/* 다듬기 결과 또는 플레이스홀더 */}
                      {animatedRefinedText ? (
                        <div className="space-y-3 p-4 bg-gradient-to-br from-mint/10 to-apricot/10 rounded-lg border border-mint/20 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-700 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-deepgreen-600" />
                              다듬기 결과
                            </h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-deepgreen-100 text-deepgreen-700 border-deepgreen-200">
                                {getRefineTypeLabel(refineType)}
                              </Badge>
                              <Button
                                onClick={handleOpenModal}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-deepgreen-100"
                              >
                                <Maximize2 className="w-4 h-4 text-deepgreen-600" />
                              </Button>
                            </div>
                          </div>
                          <div className="bg-white/80 rounded-lg p-4 border border-beige-200 max-h-64 overflow-y-auto">
                            <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                              {animatedRefinedText}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleApplyRefine}
                              variant="ghost"
                              className="flex-1 bg-gradient-to-r from-mint to-apricot hover:from-apricot hover:to-mint text-gray-800 border border-mint/30 shadow-none"
                            >
                              <Wand2 className="w-4 h-4 mr-2" />
                              적용하기
                            </Button>
                            <Button
                              onClick={handleCopyRefine}
                              variant="outline"
                              size="sm"
                              className="flex-1"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              복사하기
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center p-8 text-center">
                          <div className="space-y-3 text-gray-500">
                            <Wand2 className="w-12 h-12 mx-auto opacity-50" />
                            <p className="text-sm">
                              일기 내용을 입력하고<br />
                              다듬기 스타일을 선택한 후<br />
                              "다듬기 실행" 버튼을 눌러보세요
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </AnimatePresence>
      </div>

      {/* 다듬기 결과 모달 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-deepnavy-800 text-2xl font-light">
              <Sparkles className="w-6 h-6 text-deepgreen-600" />
              AI 다듬기 결과
              <Badge variant="secondary" className="bg-deepgreen-100 text-deepgreen-700 border-deepgreen-200 ml-2">
                {getRefineTypeLabel(refineType)}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-mint/5 to-apricot/5 rounded-lg border border-mint/20">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-8 border border-beige-200 min-h-[400px]">
              <p className="text-lg leading-relaxed text-gray-700 whitespace-pre-wrap">
                {modalAnimatedText}
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-beige-200">
            <Button
              onClick={handleApplyRefine}
              variant="ghost"
              className="flex-1 bg-gradient-to-r from-mint to-apricot hover:from-apricot hover:to-mint text-gray-800 border border-mint/30 shadow-none"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              적용하기
            </Button>
            <Button
              onClick={handleCopyRefine}
              variant="outline"
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              복사하기
            </Button>
            <Button
              onClick={handleCloseModal}
              variant="outline"
            >
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI 다듬기 열기 플로팅 버튼 */}
      <AnimatePresence>
        {!aiPanelOpen && (
          <motion.button
            key="ai-open-btn"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            onClick={() => { setAiPanelOpen(true); setAiPanelVisible(true); }}
            className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-mint to-apricot text-beige-700 shadow-lg border border-mint/30 hover:from-apricot hover:to-mint transition-all text-sm"
            title="AI 다듬기 열기"
          >
            <Feather className="w-5 h-5" />
            AI 다듬기 열기
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
} 