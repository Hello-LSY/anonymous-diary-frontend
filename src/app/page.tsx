'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart, Sparkles, Loader2, RefreshCw, Plus, User, LogOut, Settings, Bookmark, MessageSquare } from 'lucide-react';
import { fetchWithAuth, handleApiResponse } from '@/lib/api';
import { Diary, PaginatedResponse, CreateReactionRequest, User as UserType, SliceResponse, VisibleDiarySummaryDto, UserDiarySummaryDto, BookmarkToggleResponse, BookmarkedDiaryDto } from '@/types';
import FloatingActionButton from '@/components/FloatingActionButton';

/* 타입 정의 */
interface DiaryCardProps {
  diary: Diary;
  onReaction: (diaryId: string, type: 'CHEER' | 'SAD' | 'LIKE') => void;
  onBookmarkToggle: (diaryId: string) => void;
  isBookmarked: boolean;
  isBookmarking: boolean;
  index: number;
}

export default function HomePage() {
  const router = useRouter();
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [reactingDiaries, setReactingDiaries] = useState<Set<string>>(new Set());
  const [bookmarkingDiaries, setBookmarkingDiaries] = useState<Set<string>>(new Set());
  const [bookmarkedDiaries, setBookmarkedDiaries] = useState<Set<string>>(new Set());
  const [viewedDiaries, setViewedDiaries] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<UserType | null>(null);
  const [activeTab, setActiveTab] = useState<'public' | 'my' | 'bookmarks'>('public');
  const [shouldAnimate, setShouldAnimate] = useState(true);
  const [hasAnimated, setHasAnimated] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastDiaryRef = useRef<HTMLDivElement | null>(null);

  // 상대 시간 계산
  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return '방금 전';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  // 일기 목록 가져오기
  const fetchDiaries = useCallback(async (pageNum: number, append = false) => {
    try {
      let endpoint = '';
      switch (activeTab) {
        case 'public':
          endpoint = '/api/diaries/public';
          break;
        case 'my':
          endpoint = '/api/diaries/me';
          break;
        case 'bookmarks':
          endpoint = '/api/bookmarks/me';
          break;
      }
      
      const response = await fetchWithAuth(`${endpoint}?page=${pageNum - 1}&size=10`);
      const responseData = await handleApiResponse<any>(response);
      
      console.log('API Response:', responseData); // 디버깅용 로그
      
      // Slice 기반 페이지네이션 응답 처리
      let diaries: Diary[] = [];
      let hasMorePages = false;
      
      if (responseData.content && Array.isArray(responseData.content)) {
        if (activeTab === 'my') {
          // 내 일기: Slice<UserDiarySummaryDto> 구조
          diaries = responseData.content.map((diary: UserDiarySummaryDto) => ({
            ...diary,
            reactions: diary.reactions || [],
            _count: {
              reactions: diary.totalReactionCount,
              comments: diary.commentCount
            },
            // Diary 타입과의 호환성을 위한 필드들
            isPublic: diary.visible,
            allowComments: diary.allowComment,
            isRefined: diary.aiRefined,
            totalReactionCount: diary.totalReactionCount,
            commentCount: diary.commentCount
          }));
        } else if (activeTab === 'bookmarks') {
          // 북마크한 일기: Slice<BookmarkedDiaryDto> 구조
          diaries = responseData.content.map((diary: BookmarkedDiaryDto) => ({
            ...diary,
            visible: true,
            reactions: [],
            _count: {
              reactions: diary.totalReactionCount,
              comments: diary.commentCount
            },
            // Diary 타입과의 호환성을 위한 필드들
            isPublic: true,
            allowComments: diary.allowComment,
            isRefined: diary.aiRefined,
            totalReactionCount: diary.totalReactionCount,
            commentCount: diary.commentCount
          }));
        } else {
          // 전체 일기: Slice<VisibleDiarySummaryDto> 구조
          diaries = responseData.content.map((diary: VisibleDiarySummaryDto) => ({
            ...diary,
            visible: true, // 전체 일기는 모두 공개
            reactions: [],
            _count: {
              reactions: diary.totalReactionCount,
              comments: diary.commentCount
            },
            // Diary 타입과의 호환성을 위한 필드들
            isPublic: true,
            allowComments: diary.allowComment,
            isRefined: diary.aiRefined,
            totalReactionCount: diary.totalReactionCount,
            commentCount: diary.commentCount
          }));
        }
        hasMorePages = !responseData.last;
      }
      
      if (append) {
        setDiaries(prev => [...(prev || []), ...diaries]);
      } else {
        setDiaries(diaries);
      }
      
      setHasMore(hasMorePages);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : '일기를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [activeTab]);

  // 리액션 처리
  const handleReaction = async (diaryId: string, type: 'CHEER' | 'SAD' | 'LIKE') => {
    if (reactingDiaries.has(diaryId)) return;
    
    setShouldAnimate(false);
    setHasAnimated(true);
    setReactingDiaries(prev => new Set(prev).add(diaryId));

    try {
      const response = await fetchWithAuth(`/api/reactions/${diaryId}`, {
        method: 'POST',
        body: JSON.stringify({ type } as CreateReactionRequest),
      });
      
      await handleApiResponse(response);
      
      // 성공 시 해당 일기의 최신 데이터 다시 로드
      await refreshDiaryReactions(diaryId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '공감 처리에 실패했습니다.');
    } finally {
      setReactingDiaries(prev => {
        const newSet = new Set(prev);
        newSet.delete(diaryId);
        return newSet;
      });
    }
  };

  // 북마크 토글 처리
  const handleBookmarkToggle = async (diaryId: string) => {
    if (bookmarkingDiaries.has(diaryId)) return;
    setShouldAnimate(false);
    setHasAnimated(true);
    setBookmarkingDiaries(prev => new Set(prev).add(diaryId));
    try {
      const isBookmarked = bookmarkedDiaries.has(diaryId);
      const method = isBookmarked ? 'DELETE' : 'POST';
      const response = await fetchWithAuth(`/api/bookmarks/${diaryId}`, { method });
      await handleApiResponse(response);
      // 북마크 상태를 서버에서 다시 동기화
      await fetchBookmarkedIds();
    } catch (err) {
      setError(err instanceof Error ? err.message : '북마크 처리에 실패했습니다.');
    } finally {
      setBookmarkingDiaries(prev => {
        const newSet = new Set(prev);
        newSet.delete(diaryId);
        return newSet;
      });
    }
  };

  // 특정 일기의 공감 데이터 새로고침
  const refreshDiaryReactions = async (diaryId: string) => {
    try {
      const response = await fetchWithAuth(`/api/reactions/${diaryId}`);
      const reactionsData = await handleApiResponse<any[]>(response);
      
      // 공감 데이터 검증 및 정리
      const validatedReactions = reactionsData.map((reaction: any) => ({
        ...reaction,
        id: reaction.id || 'temp',
        type: reaction.type || 'LIKE',
        diaryId: reaction.diaryId || diaryId,
        userId: reaction.userId || 'temp',
        createdAt: reaction.createdAt || new Date().toISOString()
      }));
      
      setDiaries(prev => prev.map(diary => {
        if (diary.id.toString() === diaryId) {
          return {
            ...diary,
            reactions: validatedReactions,
            _count: {
              ...diary._count,
              reactions: validatedReactions.length
            }
          };
        }
        return diary;
      }));
    } catch (err) {
      console.log('공감 데이터 새로고침 실패:', err);
    }
  };

  // 무한 스크롤 설정
  const lastDiaryElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoadingMore) return;
    
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setIsLoadingMore(true);
        fetchDiaries(page + 1, true);
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [isLoadingMore, hasMore, page, fetchDiaries]);

  // 사용자 정보 로드
  const loadUserInfo = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const response = await fetchWithAuth('/api/me');
        const userData = await handleApiResponse<UserType>(response);
        setUser(userData);
      }
    } catch (err) {
      console.log('사용자 정보 로드 실패:', err);
    }
  };

  // 내 북마크 id 리스트를 서버에서 받아오기
  const fetchBookmarkedIds = async () => {
    try {
      const response = await fetchWithAuth('/api/bookmarks/me');
      const data = await handleApiResponse<any>(response);
      // data.content가 [{id, ...}, ...] 형태
      const ids = (data.content || []).map((item: any) => item.id?.toString()).filter(Boolean);
      setBookmarkedDiaries(new Set(ids));
    } catch (err) {
      // 실패 시 무시 (북마크 표시만 안 됨)
    }
  };

  // 본 일기 id 리스트를 서버에서 받아오기
  const fetchViewedIds = async () => {
    try {
      const response = await fetchWithAuth('/api/views/me');
      const data = await handleApiResponse<any>(response);
      // data.content가 [id, id, ...] 형태
      const ids = (data.content || []).map((id: number) => id.toString()).filter(Boolean);
      setViewedDiaries(new Set(ids));
    } catch (err) {
      // 실패 시 무시 (본 일기 표시만 안 됨)
    }
  };

  // 탭 변경 시 일기 목록 새로고침
  useEffect(() => {
    setPage(1);
    setDiaries([]);
    fetchDiaries(1, false);
  }, [activeTab, fetchDiaries]);

  // 초기 로딩 시 북마크 id 동기화
  useEffect(() => {
    loadUserInfo();
    fetchBookmarkedIds();
    fetchViewedIds();
  }, []);

  // 로그인 강제 체크
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  // DiaryCard 컴포넌트 (forwardRef)
  const DiaryCard = React.forwardRef<HTMLDivElement, DiaryCardProps & { ref?: React.Ref<HTMLDivElement> }>(
    ({ diary, onReaction, onBookmarkToggle, isBookmarked, isBookmarking, index }, ref) => {
      const isReacting = reactingDiaries.has(diary.id.toString());
      const userReactions = diary.reactions?.map((r: any) => r.type) || [];
      
      // 백엔드 응답 구조에 맞는 안전한 접근
      const reactionCount = diary.totalReactionCount ?? diary._count?.reactions ?? 0;
      const commentCount = diary.commentCount ?? diary._count?.comments ?? 0;
      
      // 이모지와 백엔드 enum 매핑
      const reactionMap = {
        '🌿': 'CHEER',
        '🌙': 'SAD', 
        '☀️': 'LIKE'
      } as const;
      
      const handleReactionClick = (emoji: '🌿' | '🌙' | '☀️') => {
        onReaction(diary.id.toString(), reactionMap[emoji]);
      };
      
      // 내용 일부만 표시 (100자 제한)
      const truncatedContent = diary.content.length > 100 
        ? diary.content.substring(0, 100) + '...' 
        : diary.content;
      
      return (
        <motion.div 
          ref={ref}
          initial={shouldAnimate && !hasAnimated ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: shouldAnimate && !hasAnimated ? Math.floor(index / 4) * 0.15 : 0 }}
          onAnimationComplete={() => {
            if (shouldAnimate && !hasAnimated && index === 0) {
              setHasAnimated(true);
            }
          }}
        >
          <Card 
            className="transition-all duration-200 bg-gradient-to-br from-beige-50 to-warm-50 cursor-pointer h-full flex flex-col border border-beige-200 hover:border-deepgreen-300 hover:shadow-lg hover:shadow-deepgreen-100/50 group"
            onClick={() => router.push(`/diaries/${diary.id}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full opacity-60 ${
                    viewedDiaries.has(diary.id.toString())
                      ? 'bg-beige-400'
                      : 'bg-deepgreen-400'
                  }`}></div>
                  <span className="text-xs text-beige-600 font-medium">
                    {getRelativeTime(diary.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {diary.aiRefined && (
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-deepgreen-500" />
                      <span className="text-xs text-deepgreen-600 font-medium">AI 다듬기</span>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4 flex-1 flex flex-col">
              {diary.title && (
                <div className="space-y-1">
                  <h3 className="text-lg font-medium text-deepnavy-800 leading-tight overflow-hidden group-hover:text-deepgreen-700 transition-colors duration-200" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {diary.title}
                  </h3>
                  <div className="w-8 h-0.5 bg-gradient-to-r from-deepgreen-400 to-mint-400 rounded-full"></div>
                </div>
              )}
              <div className="text-deepnavy-700 leading-relaxed whitespace-pre-wrap flex-1 overflow-hidden text-sm italic" style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
                "{truncatedContent}"
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-beige-200/50">
                <div className="flex items-center space-x-4 text-sm">
                  <span className="flex items-center text-deepgreen-600 font-medium">
                    <Heart className="w-4 h-4 mr-1 text-beige-500 group-hover:text-deepgreen-500 transition-colors duration-200" />
                    <span className="text-deepnavy-400">{diary.totalReactionCount ?? 0}</span>
                  </span>
                  <span className="flex items-center text-deepnavy-600 font-medium">
                    <MessageSquare className="w-4 h-4 mr-1 text-beige-500 group-hover:text-deepgreen-500 transition-colors duration-200" />
                    <span className="text-deepnavy-400">{diary.commentCount ?? 0}</span>
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBookmarkToggle(diary.id.toString());
                  }}
                  disabled={isBookmarking}
                  className={`h-8 w-8 p-0 hover:bg-deepgreen-100 transition-colors duration-200 ${
                    isBookmarked ? 'text-deepgreen-600' : 'text-beige-500 hover:text-deepgreen-600'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      );
    }
  );

    // 로그아웃 처리
  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
    router.push('/login');
  };

  // 로딩 스켈레톤
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="bg-beige-50 border border-beige-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24 bg-beige-200" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-full bg-beige-200" />
              <Skeleton className="h-5 w-3/4 bg-beige-200" />
              <Skeleton className="h-4 w-full bg-beige-200" />
              <Skeleton className="h-4 w-1/2 bg-beige-200" />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-beige-200">
              <div className="flex space-x-4">
                <Skeleton className="h-4 w-8 bg-beige-200" />
                <Skeleton className="h-4 w-8 bg-beige-200" />
              </div>
              <Skeleton className="h-8 w-8 bg-beige-200" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          {/* 제목 섹션 */}
          <div className="text-center mb-6">
            <h1 className="text-5xl font-light font-poetic mb-2 text-deepnavy-800 tracking-wide">
              무명일기
            </h1>
            <p className="text-beige-600 text-lg font-light">
              오늘의 기록들
            </p>
          </div>

          {/* 탭 UI와 일기 작성 버튼 */}
          {user && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1"></div>
              <div className="flex bg-white rounded-lg p-1 border border-beige-200 shadow-sm">
                <button
                  onClick={() => {
                    setShouldAnimate(true);
                    setHasAnimated(false);
                    setActiveTab('public');
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    activeTab === 'public'
                      ? 'bg-deepgreen-600 text-white'
                      : 'text-beige-700 hover:text-deepnavy-700'
                  }`}
                >
                  전체 일기
                </button>
                <button
                  onClick={() => {
                    setShouldAnimate(true);
                    setHasAnimated(false);
                    setActiveTab('my');
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    activeTab === 'my'
                      ? 'bg-deepgreen-600 text-white'
                      : 'text-beige-700 hover:text-deepnavy-700'
                  }`}
                >
                  내 일기
                </button>
                <button
                  onClick={() => {
                    setShouldAnimate(true);
                    setHasAnimated(false);
                    setActiveTab('bookmarks');
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    activeTab === 'bookmarks'
                      ? 'bg-deepgreen-600 text-white'
                      : 'text-beige-700 hover:text-deepnavy-700'
                  }`}
                >
                  모아둔 일기
                </button>
              </div>
              <div className="flex-1 flex justify-end">
                <Button
                  onClick={() => router.push('/write')}
                  className="bg-deepgreen-600 hover:bg-deepgreen-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors duration-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">일기 작성</span>
                </Button>
              </div>
            </div>
          )}
        </motion.div>

        {/* 에러 메시지 */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6"
          >
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError('');
                    setShouldAnimate(true);
                    setHasAnimated(false);
                    fetchDiaries(1, false);
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  다시 시도
                </Button>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* 일기 목록 */}
        <div className="space-y-4">
          {isLoading ? (
            <LoadingSkeleton />
          ) : diaries && diaries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {shouldAnimate ? (
                <AnimatePresence>
                  {diaries.map((diary, index) => (
                    <DiaryCard
                      key={`${diary.id}-${activeTab}-${index}`}
                      diary={diary}
                      onReaction={handleReaction}
                      onBookmarkToggle={handleBookmarkToggle}
                      isBookmarked={bookmarkedDiaries.has(diary.id.toString())}
                      isBookmarking={bookmarkingDiaries.has(diary.id.toString())}
                      index={index}
                      ref={index === diaries.length - 1 ? lastDiaryElementRef : undefined}
                    />
                  ))}
                </AnimatePresence>
              ) : (
                diaries.map((diary, index) => (
                  <DiaryCard
                    key={`${diary.id}-${activeTab}-${index}`}
                    diary={diary}
                    onReaction={handleReaction}
                    onBookmarkToggle={handleBookmarkToggle}
                    isBookmarked={bookmarkedDiaries.has(diary.id.toString())}
                    isBookmarking={bookmarkingDiaries.has(diary.id.toString())}
                    index={index}
                    ref={index === diaries.length - 1 ? lastDiaryElementRef : undefined}
                  />
                ))
              )}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Card className="bg-white/90">
                <CardContent className="py-12">
                  {activeTab === 'bookmarks' ? (
                    <>
                      <p className="text-gray-600 text-lg">
                        아직 모아둔 일기가 없습니다.
                      </p>
                      <p className="text-gray-500 text-sm mt-2">
                        마음에 드는 일기를 북마크해보세요.
                      </p>
                      <Button
                        onClick={() => setActiveTab('public')}
                        className="mt-4 bg-deepgreen-600 hover:bg-deepgreen-700 text-white"
                      >
                        일기 둘러보기
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-600 text-lg">
                        {activeTab === 'my' ? '작성한 일기가 없습니다.' : '아직 공개된 일기가 없습니다.'}
                      </p>
                      <p className="text-gray-500 text-sm mt-2">
                        {activeTab === 'my' ? '첫 번째 일기를 작성해보세요.' : '첫 번째 일기를 작성해보세요.'}
                      </p>
                      {activeTab === 'my' && (
                        <Button
                          onClick={() => router.push('/write')}
                          className="mt-4 bg-deepgreen-600 hover:bg-deepgreen-700 text-white"
                        >
                          일기 작성하기
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 더 로딩 중 */}
          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          )}
        </div>
      </div>

      {/* 플로팅 액션 버튼 */}
      <FloatingActionButton user={user} onLogout={handleLogout} />
    </div>
  );
}
