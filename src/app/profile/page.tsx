'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Heart, Sparkles, MoreVertical, Trash2, Edit, User, Bookmark, Loader2, RefreshCw, ArrowLeft, CheckCircle, MessageSquare } from 'lucide-react';
import { fetchWithAuth, handleApiResponse } from '@/lib/api';
import { User as UserType, Diary, Bookmark as BookmarkType, PaginatedResponse, UserDiarySummaryDto, SliceResponse, BookmarkedDiaryDto } from '@/types';

/* 타입 정의 */
interface DiaryCardProps {
  diary: UserDiarySummaryDto;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

interface BookmarkCardProps {
  bookmark: BookmarkedDiaryDto;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [diaries, setDiaries] = useState<UserDiarySummaryDto[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkedDiaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'diaries' | 'bookmarks'>('diaries');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{ id: string; type: 'diary' | 'bookmark' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingDiaryId, setEditingDiaryId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editVisible, setEditVisible] = useState(true);
  const [editAllowComment, setEditAllowComment] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // 로그인 상태 확인 및 데이터 로드
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadUserData();
  }, [router]);

  // 사용자 데이터 로드
  const loadUserData = async () => {
    setIsLoading(true);
    setError('');

    try {
      // 사용자 정보
      const userResponse = await fetchWithAuth('/api/me');
      const userData = await handleApiResponse<UserType>(userResponse);
      setUser(userData);

      // 내 일기 목록
      const diariesResponse = await fetchWithAuth('/api/diaries/me');
      const diariesData = await handleApiResponse<SliceResponse<UserDiarySummaryDto>>(diariesResponse);
      setDiaries(diariesData.content || []);

      // 북마크 목록
      const bookmarksResponse = await fetchWithAuth('/api/bookmarks/me');
      const bookmarksData = await handleApiResponse<SliceResponse<BookmarkedDiaryDto>>(bookmarksResponse);
      setBookmarks(bookmarksData.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 삭제 확인 다이얼로그 열기
  const handleDeleteClick = (id: string, type: 'diary' | 'bookmark') => {
    setDeletingItem({ id, type });
    setDeleteDialogOpen(true);
  };

  // 삭제 실행
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;

    setIsDeleting(true);

    try {
      if (deletingItem.type === 'diary') {
        await fetchWithAuth(`/api/diaries/${deletingItem.id}`, {
          method: 'DELETE',
        });
        setDiaries(prev => prev.filter(d => d.id !== parseInt(deletingItem.id)));
      } else {
        await fetchWithAuth(`/api/bookmarks/${deletingItem.id}`, {
          method: 'DELETE',
        });
        setBookmarks(prev => prev.filter(b => b.id !== parseInt(deletingItem.id)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    }
  };

  // 언제든 수정 가능
  const isEditable = () => true;

  // 일기 수정
  const handleUpdateDiary = async (diaryId: number) => {
    if (!editContent.trim()) {
      setError('일기 내용을 입력해주세요.');
      return;
    }

    setIsUpdating(true);
    try {
      const updateData = {
        title: editTitle.trim() || '',
        content: editContent.trim(),
        visible: editVisible,
        allowComment: editAllowComment,
      };

      const response = await fetchWithAuth(`/api/diaries/${diaryId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      if (response.status === 204) {
        // 수정 성공
        await loadUserData();
        setEditingDiaryId(null);
        setError('');
        setShowSuccessToast(true);
        
        // 3초 후 Toast 숨기기
        setTimeout(() => {
          setShowSuccessToast(false);
        }, 3000);
        return;
      }
      
      if (!response.ok) {
        let errorMsg = '';
        try {
          const data = await response.json();
          errorMsg = data?.message || '';
        } catch {
          errorMsg = await response.text();
        }
        setError(errorMsg || '일기 수정에 실패했습니다.');
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '일기 수정에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  // 수정 모드 시작
  const startEditing = async (diary: UserDiarySummaryDto) => {
    try {
      const response = await fetchWithAuth(`/api/diaries/${diary.id}`);
      const latestDiaryData = await handleApiResponse<any>(response);
      
      setEditTitle(latestDiaryData.title || '');
      setEditContent(latestDiaryData.content);
      setEditVisible(latestDiaryData.visible);
      setEditAllowComment(latestDiaryData.allowComment);
      setEditingDiaryId(diary.id);
    } catch (err) {
      console.error('수정 모드 진입 시 데이터 로드 실패:', err);
      setError('수정 모드 진입에 실패했습니다.');
    }
  };

  // 수정 모드 취소
  const cancelEditing = () => {
    setEditingDiaryId(null);
    setError('');
  };

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

  // DiaryCard 컴포넌트
  const DiaryCard = ({ diary, onDelete, isDeleting }: DiaryCardProps) => {
    const editable = isEditable();
    const isEditing = editingDiaryId === diary.id;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="hover:shadow-md transition-all duration-200 bg-beige-50 border border-beige-200 hover:border-beige-300 hover:bg-beige-100/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {diary.aiRefined && (
                  <Badge variant="secondary" className="bg-deepgreen-100 text-deepgreen-700 border-deepgreen-200">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI 다듬기
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-beige-600 font-medium">
                  {getRelativeTime(diary.createdAt)}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-beige-200">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => startEditing(diary)}>
                      <Edit className="w-4 h-4 mr-2" />
                      수정
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(diary.id.toString())}
                      className="text-red-600"
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {isEditing ? (
              // 수정 모드
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-deepnavy-700">
                    제목 (선택사항)
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-beige-300 rounded-md focus:outline-none focus:ring-2 focus:ring-deepgreen-500/20 focus:border-deepgreen-500"
                    placeholder="일기의 제목을 입력해주세요..."
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-deepnavy-700">
                    일기 내용
                  </label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-3 py-2 border border-beige-300 rounded-md focus:outline-none focus:ring-2 focus:ring-deepgreen-500/20 focus:border-deepgreen-500 min-h-[200px] resize-none"
                    placeholder="일기 내용을 입력해주세요..."
                  />
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-deepnavy-700">
                        공개 설정
                      </label>
                      <p className="text-xs text-beige-600">
                        다른 사용자들이 볼 수 있습니다
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={editVisible}
                      onChange={(e) => setEditVisible(e.target.checked)}
                      className="w-4 h-4 text-deepgreen-600 focus:ring-deepgreen-500 border-beige-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-deepnavy-700">
                        댓글 허용
                      </label>
                      <p className="text-xs text-beige-600">
                        다른 사용자들의 댓글을 받습니다
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={editAllowComment}
                      onChange={(e) => setEditAllowComment(e.target.checked)}
                      className="w-4 h-4 text-deepgreen-600 focus:ring-deepgreen-500 border-beige-300 rounded"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 pt-4">
                  <Button
                    onClick={() => handleUpdateDiary(diary.id)}
                    disabled={isUpdating}
                    className="bg-deepgreen-600 hover:bg-deepgreen-700 text-white"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        수정 중...
                      </>
                    ) : (
                      '수정 완료'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelEditing}
                    disabled={isUpdating}
                    className="border-beige-300 text-beige-700 hover:bg-beige-50"
                  >
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              // 읽기 모드
              <div className="text-deepnavy-700 leading-relaxed whitespace-pre-wrap text-sm">
                {diary.content}
              </div>
            )}
            
            <div className="flex items-center justify-between pt-3 border-t border-beige-200">
              <div className="flex items-center space-x-4 text-sm">
                <span className="flex items-center text-deepgreen-600 font-medium">
                  <Heart className="w-4 h-4 mr-1 text-beige-500" />
                  <span className="text-deepnavy-400">{diary._count?.reactions || 0}</span>
                </span>
                <span className="flex items-center text-deepnavy-600 font-medium">
                  <MessageSquare className="w-4 h-4 mr-1 text-beige-500" />
                  <span className="text-deepnavy-400">{diary._count?.comments || 0}</span>
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={diary.visible ? "default" : "secondary"} className={diary.visible ? "bg-deepgreen-100 text-deepgreen-700 border-deepgreen-200" : "bg-beige-100 text-beige-600 border-beige-300"}>
                  {diary.visible ? '공개' : '비공개'}
                </Badge>
                <Badge variant={diary.allowComment ? "default" : "secondary"} className={diary.allowComment ? "bg-deepgreen-100 text-deepgreen-700 border-deepgreen-200" : "bg-beige-100 text-beige-600 border-beige-300"}>
                  {diary.allowComment ? '댓글 허용' : '댓글 비허용'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // BookmarkCard 컴포넌트
  const BookmarkCard = ({ bookmark, onDelete, isDeleting }: BookmarkCardProps) => {
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="hover:shadow-md transition-all duration-200 bg-beige-50 border border-beige-200 hover:border-beige-300 hover:bg-beige-100/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {bookmark.aiRefined && (
                  <Badge variant="secondary" className="bg-deepgreen-100 text-deepgreen-700 border-deepgreen-200">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI 다듬기
                  </Badge>
                )}
                <Badge variant="outline" className="bg-deepnavy-50 text-deepnavy-700 border-deepnavy-200">
                  <Bookmark className="w-3 h-3 mr-1" />
                  북마크
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-beige-600 font-medium">
                  {getRelativeTime(bookmark.createdAt)}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-beige-200">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/diaries/${bookmark.id}`)}>
                      <Edit className="w-4 h-4 mr-2" />
                      보기
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(bookmark.id.toString())}
                      className="text-red-600"
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      북마크 삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-deepnavy-700 leading-relaxed whitespace-pre-wrap text-sm">
              {bookmark.content}
            </div>
            
            <div className="flex items-center justify-between pt-3 border-t border-beige-200">
              <div className="flex items-center space-x-4 text-sm">
                <span className="flex items-center text-deepgreen-600 font-medium">
                  <Heart className="w-4 h-4 mr-1 text-beige-500" />
                  <span className="text-deepnavy-400">{bookmark.totalReactionCount}</span>
                </span>
                <span className="flex items-center text-deepnavy-600 font-medium">
                  <MessageSquare className="w-4 h-4 mr-1 text-beige-500" />
                  <span className="text-deepnavy-400">{bookmark.commentCount}</span>
                </span>
              </div>
              <span className="text-xs text-beige-600">
                북마크: {getRelativeTime(bookmark.createdAt)}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // 로딩 스켈레톤
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="bg-beige-50 border border-beige-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 bg-beige-200" />
              <Skeleton className="h-3 w-16 bg-beige-200" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full bg-beige-200" />
              <Skeleton className="h-4 w-3/4 bg-beige-200" />
              <Skeleton className="h-4 w-1/2 bg-beige-200" />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-beige-200">
              <div className="flex space-x-4">
                <Skeleton className="h-4 w-8 bg-beige-200" />
                <Skeleton className="h-4 w-8 bg-beige-200" />
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-6 w-12 bg-beige-200" />
                <Skeleton className="h-6 w-16 bg-beige-200" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center mb-8">
            <Skeleton className="h-8 w-32 mx-auto mb-2" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-light text-deepnavy-800 mb-2">마이페이지</h1>
              <p className="text-beige-600">내 일기와 설정을 관리해보세요</p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="border-beige-300 text-beige-700 hover:bg-beige-50"
            >
              ← 뒤로가기
            </Button>
          </div>
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
                  onClick={loadUserData}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  다시 시도
                </Button>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* 성공 Toast 알림 */}
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <Alert className="bg-deepgreen-50 border-deepgreen-200 text-deepgreen-800">
              <AlertDescription className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                일기가 성공적으로 수정되었습니다.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* 사용자 정보 */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mb-8"
          >
            <Card className="bg-white border border-beige-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-deepnavy-800 font-medium">
                  <User className="w-5 h-5" />
                  내 정보
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-beige-600 mb-1">무명번호</p>
                    <p className="text-xl font-medium text-deepnavy-800">{user.nickname}</p>
                  </div>
                  <div className="flex items-center space-x-8">
                    <div className="text-center">
                      <p className="text-2xl font-medium text-deepnavy-800">{diaries.length}</p>
                      <p className="text-sm text-beige-600">작성한 일기</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-medium text-deepnavy-800">{bookmarks.length}</p>
                      <p className="text-sm text-beige-600">북마크</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 탭 컨텐츠 */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'diaries' | 'bookmarks')}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="diaries">내 일기</TabsTrigger>
            <TabsTrigger value="bookmarks">북마크</TabsTrigger>
          </TabsList>

          <TabsContent value="diaries" className="space-y-6">
            {diaries.length > 0 ? (
              <AnimatePresence>
                {diaries.map((diary) => (
                  <DiaryCard
                    key={diary.id}
                    diary={diary}
                    onDelete={(id) => handleDeleteClick(id, 'diary')}
                    isDeleting={isDeleting}
                  />
                ))}
              </AnimatePresence>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Card className="bg-white/90">
                  <CardContent className="py-12">
                    <p className="text-gray-600 text-lg">
                      작성한 일기가 없습니다.
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      첫 번째 일기를 작성해보세요.
                    </p>
                    <Button
                      onClick={() => router.push('/write')}
                      className="mt-4 bg-deepgreen-600 hover:bg-deepgreen-700 text-white"
                    >
                      일기 작성하기
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="bookmarks" className="space-y-6">
            {bookmarks.length > 0 ? (
              <AnimatePresence>
                {bookmarks.map((bookmark) => (
                  <BookmarkCard
                    key={bookmark.id}
                    bookmark={bookmark}
                    onDelete={(id) => handleDeleteClick(id, 'bookmark')}
                    isDeleting={isDeleting}
                  />
                ))}
              </AnimatePresence>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Card className="bg-white/90">
                  <CardContent className="py-12">
                    <p className="text-gray-600 text-lg">
                      북마크한 일기가 없습니다.
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      마음에 드는 일기를 북마크해보세요.
                    </p>
                    <Button
                      onClick={() => router.push('/')}
                      className="mt-4 bg-deepgreen-600 hover:bg-deepgreen-700 text-white"
                    >
                      일기 둘러보기
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>

        {/* 삭제 확인 다이얼로그 */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>정말 삭제하시겠습니까?</DialogTitle>
              <DialogDescription>
                {deletingItem?.type === 'diary' 
                  ? '이 일기는 영구적으로 삭제됩니다.' 
                  : '이 북마크를 삭제하시겠습니까?'
                }
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                취소
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    삭제 중...
                  </>
                ) : (
                  '삭제'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 