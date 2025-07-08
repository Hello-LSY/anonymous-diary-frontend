'use client';

import React, { useState, useContext } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Trash2, Reply, Loader2, Send, MessageSquare } from 'lucide-react';
import { Comment } from '@/types';
import { DiaryContext } from '@/app/diaries/[id]/DiaryContext';

interface CommentItemProps {
  comment: Comment;
  onUpdate: (commentId: number, content: string) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
  onSubmitReply: (parentCommentId: number, content: string) => Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;
  isSubmittingReply: boolean;
  level?: number; // 대댓글 깊이 (0: 루트 댓글, 1: 대댓글)
  diaryAuthorNickname: string;
}

export default function CommentItem({
  comment,
  onUpdate,
  onDelete,
  onSubmitReply,
  isUpdating,
  isDeleting,
  isSubmittingReply,
  level = 0,
  diaryAuthorNickname
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const diaryContext = useContext(DiaryContext);
  const isAuthor = diaryContext && comment.nickname === diaryContext.nickname;

  const handleUpdate = async () => {
    if (!editContent.trim()) return;
    await onUpdate(comment.id, editContent);
    setIsEditing(false);
    setEditContent(comment.content);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(comment.content);
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return;
    await onSubmitReply(comment.id, replyContent);
    setIsReplying(false);
    setReplyContent('');
  };

  const handleCancelReply = () => {
    setIsReplying(false);
    setReplyContent('');
  };

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

  // 대댓글은 1-depth까지만 허용 (level === 0일 때만 답글 가능)
  const canReply = level === 0;
  const isReply = level === 1;

  if (isReply) {
    return (
      <div className="bg-beige-100 rounded-md px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isAuthor && (
              <span className="text-xs bg-beige-200 text-deepnavy-600 px-2 py-0.5 rounded-full mr-1">작성자</span>
            )}
            <span className="text-sm font-medium text-deepnavy-600">{comment.nickname}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-beige-600">{getRelativeTime(comment.createdAt)}</span>
            {comment.isOwned && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-6 px-2 text-beige-600 hover:text-deepnavy-700 hover:bg-beige-200"
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(comment.id)}
                  disabled={isDeleting}
                  className="h-6 px-2 text-beige-500 hover:text-beige-700 hover:bg-beige-100"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
        <p className="text-sm text-deepnavy-700 mt-1">{comment.content}</p>
      </div>
    );
  }

  // 루트댓글은 기존 Card 렌더링
  return (
    <div className="mb-2">
      <Card className="bg-beige-50 border-none shadow-none rounded-lg">
        <CardContent className="pt-2 pb-2 px-4">
          <div className="flex items-center space-x-2">
            {isAuthor && (
              <span className="text-xs bg-beige-200 text-deepnavy-600 px-2 py-0.5 rounded-full mr-1">작성자</span>
            )}
            <span className="text-sm font-medium text-deepnavy-700">{comment.nickname}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs font-medium text-beige-600">{getRelativeTime(comment.createdAt)}</span>
            <div className="flex items-center space-x-1">
              {comment.isOwned && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-6 px-2 text-beige-600 hover:text-deepnavy-700 hover:bg-beige-200"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(comment.id)}
                    disabled={isDeleting}
                    className="h-6 px-2 text-beige-500 hover:text-beige-700 hover:bg-beige-100"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </Button>
                </>
              )}
              {canReply && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReplying(true)}
                  className="h-6 px-2 text-deepnavy-600 border-beige-300 hover:text-deepnavy-700 hover:bg-beige-100"
                >
                  <Reply className="w-3 h-3 mr-1" />
                  답글
                </Button>
              )}
            </div>
          </div>
          <div className="mt-2">
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[80px] resize-none border-beige-300 focus:border-deepnavy-500 focus:ring-deepnavy-500/20"
                  placeholder="댓글 내용을 수정해주세요..."
                />
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    size="sm"
                    className="bg-deepnavy-600 hover:bg-deepnavy-700 text-white"
                  >
                    {isUpdating ? (
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
                    onClick={handleCancelEdit}
                    disabled={isUpdating}
                    size="sm"
                    className="border-beige-300 text-beige-700 hover:bg-beige-50"
                  >
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm text-deepnavy-700">{comment.content}</p>
            )}
          </div>
          {isReplying && (
            <div className="mt-4 p-4 bg-beige-100 rounded-md border border-beige-300">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium text-deepnavy-700">{comment.nickname}님에게 답글</span>
                </div>
                <Textarea
                  placeholder="답글을 작성해주세요..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="min-h-[80px] resize-none border-beige-300 focus:border-deepnavy-500 focus:ring-deepnavy-500/20"
                />
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleSubmitReply}
                    disabled={!replyContent.trim() || isSubmittingReply}
                    size="sm"
                    className="bg-deepnavy-600 hover:bg-deepnavy-700 text-white"
                  >
                    {isSubmittingReply ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        작성 중...
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3 mr-1" />
                        답글 작성
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelReply}
                    disabled={isSubmittingReply}
                    size="sm"
                    className="border-beige-300 text-deepnavy-700 hover:bg-beige-50"
                  >
                    취소
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 