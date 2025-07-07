'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Heart, ArrowLeft, Send, Loader2, RefreshCw, Edit, Trash2, Bookmark, Sparkles, MoreVertical, CheckCircle, MessageSquare } from 'lucide-react';
import { fetchWithAuth, handleApiResponse } from '@/lib/api';
import { Diary, Comment, CreateCommentRequest, CreateReactionRequest, DiaryUpdateRequest, CommentCreateResponse, DiaryDetailDto, UpdateCommentRequest } from '@/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function DiaryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const diaryId = params.id as string;
  
  const [diary, setDiary] = useState<Diary | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [reactingDiaries, setReactingDiaries] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<any>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editVisible, setEditVisible] = useState(true);
  const [editAllowComment, setEditAllowComment] = useState(true);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [bookmarkedDiaries, setBookmarkedDiaries] = useState<Set<string>>(new Set());
  const [showSuccessToast, setShowSuccessToast] = useState(false);

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



  // 일기 상세 정보 로드
  const loadDiaryDetail = async () => {
    try {
      const response = await fetchWithAuth(`/api/diaries/${diaryId}`);
      const diaryData = await handleApiResponse<DiaryDetailDto>(response);
      // 리액션도 같이 불러오기
      const reactionsResponse = await fetchWithAuth(`/api/reactions/${diaryId}`);
      const reactionsData = await handleApiResponse<any[]>(reactionsResponse);
      const transformedDiary: Diary = {
        ...diaryData,
        updatedAt: diaryData.updatedAt || diaryData.createdAt,
        reactions: reactionsData,
        _count: {
          reactions: reactionsData.length,
          comments: 0
        }
      };
      setDiary(transformedDiary);
    } catch (err) {
      console.error('일기 불러오기 에러:', err);
      setError(err instanceof Error ? err.message : '일기를 불러오는데 실패했습니다.');
    }
  };

  // 댓글 목록 로드
  const loadComments = async () => {
    if (!currentUser) {
      setComments([]);
      return;
    }
    try {
      const response = await fetchWithAuth(`/api/comments/${diaryId}`);
      const commentsData = await handleApiResponse<Comment[]>(response);
      
      // 댓글 데이터 검증 및 정리, 본인 댓글 식별
      const validatedComments = commentsData.map(comment => ({
        ...comment,
        nickname: comment.nickname || '알 수 없음',
        isOwned: currentUser && comment.nickname && currentUser.nickname === comment.nickname
      }));
      
      setComments(validatedComments);
    } catch (err) {
      console.error('댓글 로드 실패:', err);
      setComments([]); // 오류 시 빈 배열로 설정
    }
  };

  // 댓글 작성
  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    setIsSubmittingComment(true);
    try {
      const response = await fetchWithAuth(`/api/comments/${diaryId}`, {
        method: 'POST',
        body: JSON.stringify({ content: newComment } as CreateCommentRequest),
      });
      
      const result = await handleApiResponse<CommentCreateResponse>(response);
      setNewComment('');
      
      // 댓글 목록 새로고침
      await loadComments();
      
      // 일기 상세 정보도 새로고침 (댓글 수 업데이트)
      await loadDiaryDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : '댓글 작성에 실패했습니다.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // 리액션 처리
  const handleReaction = async (type: 'CHEER' | 'SAD' | 'LIKE') => {
    if (reactingDiaries.has(diaryId)) return;
    setReactingDiaries(prev => new Set(prev).add(diaryId));
    try {
      const response = await fetchWithAuth(`/api/reactions/${diaryId}`, {
        method: 'POST',
        body: JSON.stringify({ type } as CreateReactionRequest),
      });
      await handleApiResponse(response);
      // 성공 시 최신 데이터 다시 로드
      await loadDiaryDetail();
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

  // 현재 사용자 정보 로드
  const loadCurrentUser = async () => {
    try {
      const response = await fetchWithAuth('/api/me');
      const userData = await handleApiResponse(response);
      setCurrentUser(userData);
    } catch (err) {
      // 사용자 정보 로드 실패 시 조용히 처리
    }
  };

  // 언제든 수정 가능
  const isEditable = true;

  // 일기 수정
  const handleUpdateDiary = async () => {
    if (!editContent.trim()) {
      setError('일기 내용을 입력해주세요.');
      return;
    }

    setIsUpdating(true);
    try {
      const updateData: DiaryUpdateRequest = {
        title: editTitle.trim() || undefined,
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
        await loadDiaryDetail();
        setIsEditing(false);
        setError('');
        setShowSuccessToast(true);
        setTimeout(() => {
          setShowSuccessToast(false);
        }, 3000);
      } else if (!response.ok) {
        let errorMsg = '';
        try {
          const data = await response.json();
          errorMsg = data?.message || '';
        } catch {
          errorMsg = await response.text();
        }
        if (
          response.status === 409 &&
          errorMsg.includes('작성 후 1시간이 지난 일기는 수정할 수 없습니다.')
        ) {
          setError('시간이 흘러 이 일기는 더 이상 수정할 수 없어요. 그 순간의 감정은 소중히 간직해둘게요.');
        } else {
          setError(errorMsg || '일기 수정에 실패했습니다.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '일기 수정에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  // 일기 삭제
  const handleDeleteDiary = async () => {
    if (!confirm('정말로 이 일기를 삭제하시겠습니까?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await fetchWithAuth(`/api/diaries/${diaryId}`, {
        method: 'DELETE',
      });

      // 홈 페이지로 이동
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '일기 삭제에 실패했습니다.');
      setIsDeleting(false);
    }
  };

  // 수정 모드 시작
  const startEditing = async () => {
    if (!diary) return;
    
    // 수정 모드 진입 시 최신 데이터 로드
    try {
      const response = await fetchWithAuth(`/api/diaries/${diaryId}`);
      const latestDiaryData = await handleApiResponse<DiaryDetailDto>(response);
      
      // 최신 데이터로 수정 폼 초기화
      setEditTitle(latestDiaryData.title || '');
      setEditContent(latestDiaryData.content);
      setEditVisible(latestDiaryData.visible);
      setEditAllowComment(latestDiaryData.allowComment);
      setIsEditing(true);
    } catch (err) {
      console.error('수정 모드 진입 시 데이터 로드 실패:', err);
      setError('수정 모드 진입에 실패했습니다.');
    }
  };

  // 댓글 수정
  const handleUpdateComment = async (commentId: number) => {
    if (!editingCommentContent.trim()) return;
    
    setIsUpdatingComment(true);
    try {
      await fetchWithAuth(`/api/comments/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({ content: editingCommentContent } as UpdateCommentRequest),
      });
      
      setEditingCommentId(null);
      setEditingCommentContent('');
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '댓글 수정에 실패했습니다.');
    } finally {
      setIsUpdatingComment(false);
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
      return;
    }
    
    setIsDeletingComment(true);
    try {
      await fetchWithAuth(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });
      
      await loadComments();
      await loadDiaryDetail(); // 댓글 수 업데이트
    } catch (err) {
      setError(err instanceof Error ? err.message : '댓글 삭제에 실패했습니다.');
    } finally {
      setIsDeletingComment(false);
    }
  };

  // 댓글 수정 모드 시작
  const startEditingComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  };

  // 댓글 수정 모드 취소
  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent('');
  };

  // 수정 모드 취소
  const cancelEditing = () => {
    setIsEditing(false);
    setError('');
  };

  // 현재 사용자의 공감 상태 확인 (백엔드 응답 구조에 맞게)
  const userReactions = diary?.reactions?.map((r: any) => r.type) || [];
  const reactionCount = diary?._count?.reactions || 0;
  const commentCount = diary?._count?.comments || 0;

  // 내 북마크 id 리스트를 서버에서 받아오기
  const fetchBookmarkedIds = async () => {
    try {
      const response = await fetchWithAuth('/api/bookmarks/me');
      const data = await handleApiResponse<any>(response);
      const ids = (data.content || []).map((item: any) => item.id?.toString()).filter(Boolean);
      setBookmarkedDiaries(new Set(ids));
    } catch (err) {}
  };

  // 북마크 토글 함수
  const handleBookmarkToggle = async () => {
    if (isBookmarking) return;
    setIsBookmarking(true);
    try {
      const isBookmarked = bookmarkedDiaries.has(diaryId);
      const method = isBookmarked ? 'DELETE' : 'POST';
      const response = await fetchWithAuth(`/api/bookmarks/${diaryId}`, { method });
      await handleApiResponse(response);
      await fetchBookmarkedIds();
    } catch (err) {
      setError(err instanceof Error ? err.message : '북마크 처리에 실패했습니다.');
    } finally {
      setIsBookmarking(false);
    }
  };

  // 이모지와 백엔드 enum 매핑 - 직관적이고 의미가 명확한 이모지
  const reactionMap = {
    '👍': 'LIKE',      // 좋아요 - 엄지척
    '😢': 'SAD',       // 슬퍼요 - 우는 얼굴
    '💪': 'CHEER'      // 응원해요 - 힘주는 팔
  } as const;

  // 북마크 상태 확인
  const checkBookmarkStatus = async () => {
    if (!currentUser) return;
    
    try {
      const response = await fetchWithAuth(`/api/bookmarks/${diaryId}`, {
        method: 'GET',
      });
      if (response.ok) {
        setIsBookmarked(true);
      } else {
        setIsBookmarked(false);
      }
    } catch (err) {
      // 북마크가 없으면 false로 유지
      setIsBookmarked(false);
    }
  };

  // 데이터 준비 상태에 따라 isLoading 처리
  useEffect(() => {
    if (diary !== null && currentUser !== undefined) {
      setIsLoading(false);
    }
  }, [diary, currentUser]);

  // 컴포넌트 마운트 시 currentUser 먼저 불러오기
  useEffect(() => {
    loadCurrentUser();
  }, []);

  // 초기 로딩
  useEffect(() => {
    if (currentUser === undefined) return; // 로딩 중이면 아무것도 안함
    if (diaryId) {
      // 북마크 상태는 기본적으로 false로 시작
      setIsBookmarked(false);
      loadDiaryDetail();
      loadComments();
      fetchBookmarkedIds();
    }
  }, [diaryId, currentUser]);

  // 로딩 스켈레톤
  if (isLoading) {
    return (
      <div className="min-h-screen bg-warm-50">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="mb-6">
            <Skeleton className="h-8 w-24" />
          </div>
          <Card className="bg-beige-50 border border-beige-200">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!diary) {
    return (
      <div className="min-h-screen bg-warm-50">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <Alert variant="destructive">
            <AlertDescription>일기를 찾을 수 없습니다.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* 뒤로가기 버튼 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-beige-600 hover:text-deepnavy-700 hover:bg-beige-100"
          >
            <ArrowLeft className="w-4 h-4" />
            뒤로가기
          </Button>
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
                    loadDiaryDetail();
                  }}
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

        {/* 일기 상세 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-beige-50 border border-beige-200 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {diary.aiRefined && (
                    <Badge variant="secondary" className="bg-deepgreen-100 text-deepgreen-700 border-deepgreen-200">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI 다듬기
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-beige-600 font-medium">
                    {getRelativeTime(diary.createdAt)}
                  </span>
                  {/* 로그인한 사용자에게만 북마크 버튼 표시 */}
                  {currentUser && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBookmarkToggle}
                      disabled={isBookmarking}
                      className={`h-8 w-8 p-0 hover:bg-beige-200 transition-colors duration-200 ${
                        bookmarkedDiaries.has(diaryId) ? 'text-deepgreen-600' : 'text-beige-500 hover:text-deepgreen-600'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${bookmarkedDiaries.has(diaryId) ? 'fill-current' : ''}`} />
                    </Button>
                  )}
                  {/* 본인 글인 경우 수정/삭제 버튼 */}
                  {currentUser && diary.nickname && currentUser.nickname === diary.nickname && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-beige-200">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={startEditing}>
                          <Edit className="w-4 h-4 mr-2" />
                          수정
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={handleDeleteDiary}
                          className="text-red-600"
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 mr-2" />
                          )}
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
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
                      onClick={handleUpdateDiary}
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
                <>
                  {diary.title && (
                    <div>
                      <h1 className="text-2xl font-semibold text-deepnavy-800 leading-tight">
                        {diary.title}
                      </h1>
                      {diary.updatedAt && diary.updatedAt !== diary.createdAt && (
                        <span className="ml-2 text-xs text-beige-500">(수정됨)</span>
                      )}
                    </div>
                  )}
                  
                  <div className="text-deepnavy-700 leading-relaxed whitespace-pre-wrap text-base">
                    {diary.content}
                  </div>
                </>
              )}
              
              <div className="flex items-center justify-between pt-4 border-t border-beige-200">
                <div className="flex items-center space-x-6">
                  {/* 공감 버튼들 */}
                  <div className="flex items-center space-x-2">
                    {Object.entries(reactionMap).map(([emoji, type]) => {
                      const isReacted = userReactions.includes(type);
                      return (
                        <button
                          key={type}
                          onClick={() => handleReaction(type)}
                          disabled={reactingDiaries.has(diaryId)}
                          className={`flex items-center px-3 py-1.5 rounded-full text-sm transition-all duration-200 ${
                            isReacted 
                              ? 'bg-deepgreen-50 text-deepgreen-600 border border-deepgreen-200 shadow-sm' 
                              : 'bg-beige-50 text-beige-600 border border-beige-200 hover:bg-beige-100 hover:border-beige-300'
                          }`}
                        >
                          <span className="mr-1.5 text-base">{emoji}</span>
                          <span className="font-medium">
                            {(diary?.reactions || []).filter((r: any) => r.type === type).length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-beige-500" />
                    <span className="text-deepnavy-400 font-medium">{commentCount}</span>
                  </div>
                </div>
                {diary.visible !== undefined && (
                  <Badge variant={diary.visible ? "default" : "secondary"} className={diary.visible ? "bg-deepgreen-100 text-deepgreen-700 border-deepgreen-200" : "bg-beige-100 text-beige-600 border-beige-300"}>
                    {diary.visible ? '공개' : '비공개'}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 댓글 섹션 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-8 space-y-6"
        >
          <h2 className="text-xl font-semibold text-deepnavy-800">댓글</h2>
          
          {/* 댓글 작성 */}
          {diary?.allowComment && (
            <Card className="bg-beige-50 border border-beige-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Textarea
                    placeholder="댓글을 작성해주세요..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[100px] resize-none border-beige-300 focus:border-deepgreen-500 focus:ring-deepgreen-500/20"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || isSubmittingComment}
                      className="bg-deepgreen-600 hover:bg-deepgreen-700 text-white"
                    >
                      {isSubmittingComment ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          작성 중...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          댓글 작성
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 댓글 목록 */}
          <div className="space-y-4">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <Card key={comment.id} className="bg-beige-50 border border-beige-200 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-deepnavy-700">
                          {comment.nickname}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-beige-600 font-medium">
                            {getRelativeTime(comment.createdAt)}
                          </span>
                          {/* 본인 댓글인 경우 수정/삭제 버튼 */}
                          {comment.isOwned && (
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditingComment(comment)}
                                className="h-6 px-2 text-beige-600 hover:text-deepnavy-700 hover:bg-beige-200"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteComment(comment.id)}
                                disabled={isDeletingComment}
                                className="h-6 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                {isDeletingComment ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      {editingCommentId === comment.id ? (
                        // 수정 모드
                        <div className="space-y-2">
                          <textarea
                            value={editingCommentContent}
                            onChange={(e) => setEditingCommentContent(e.target.value)}
                            className="w-full px-3 py-2 border border-beige-300 rounded-md focus:outline-none focus:ring-2 focus:ring-deepgreen-500/20 focus:border-deepgreen-500 min-h-[80px] resize-none"
                            placeholder="댓글 내용을 수정해주세요..."
                          />
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => handleUpdateComment(comment.id)}
                              disabled={isUpdatingComment}
                              size="sm"
                              className="bg-deepgreen-600 hover:bg-deepgreen-700 text-white"
                            >
                              {isUpdatingComment ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  수정 중...
                                </>
                              ) : (
                                '수정 완료'
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={cancelEditingComment}
                              disabled={isUpdatingComment}
                              size="sm"
                              className="border-beige-300 text-beige-700 hover:bg-beige-50"
                            >
                              취소
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // 읽기 모드
                        <p className="text-deepnavy-700 whitespace-pre-wrap text-sm">
                          {comment.content}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-beige-50 border border-beige-200 shadow-sm">
                <CardContent className="py-8 text-center">
                  {diary?.allowComment ? (
                    <>
                      <p className="text-beige-600">아직 댓글이 없습니다.</p>
                      <p className="text-beige-500 text-sm mt-1">첫 번째 댓글을 작성해보세요.</p>
                    </>
                  ) : (
                    <p className="text-beige-500">댓글이 제한되었습니다.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
} 