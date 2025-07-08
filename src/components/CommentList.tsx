'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Comment } from '@/types';
import CommentItem from './CommentItem';

interface CommentListProps {
  comments: Comment[];
  onUpdateComment: (commentId: number, content: string) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
  onSubmitReply: (parentCommentId: number, content: string) => Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;
  isSubmittingReply: boolean;
  diaryAuthorNickname: string;
}

export default function CommentList({
  comments,
  onUpdateComment,
  onDeleteComment,
  onSubmitReply,
  isUpdating,
  isDeleting,
  isSubmittingReply,
  diaryAuthorNickname
}: CommentListProps) {
  // 댓글을 계층 구조로 정리
  const organizeComments = (comments: Comment[]) => {
    const rootComments: Comment[] = [];
    const replyMap = new Map<number, Comment[]>();

    // 댓글들을 분류
    comments.forEach(comment => {
      if (comment.parentCommentId === null || comment.parentCommentId === undefined) {
        rootComments.push(comment);
      } else {
        const parentId = comment.parentCommentId;
        if (!replyMap.has(parentId)) {
          replyMap.set(parentId, []);
        }
        replyMap.get(parentId)!.push(comment);
      }
    });

    return { rootComments, replyMap };
  };

  const { rootComments, replyMap } = organizeComments(comments);

  const renderCommentWithReplies = (comment: Comment, level: number = 0) => {
    const replies = replyMap.get(comment.id) || [];

    if (level === 0) {
      // 루트댓글: Card로 감싸고, 답글은 내부에 ㄴ 표식과 함께 렌더링
      return (
        <Card key={comment.id} className="bg-beige-50 border border-beige-200 shadow-sm rounded-lg mb-4">
          <CardContent className="pt-2 pb-2 px-4">
            <CommentItem
              comment={comment}
              onUpdate={onUpdateComment}
              onDelete={onDeleteComment}
              onSubmitReply={onSubmitReply}
              isUpdating={isUpdating}
              isDeleting={isDeleting}
              isSubmittingReply={isSubmittingReply}
              level={0}
              diaryAuthorNickname={diaryAuthorNickname}
            />
            {replies.length > 0 && (
              <div className="mt-2 space-y-2">
                {replies.map(reply => (
                  <div key={reply.id} className="flex items-start space-x-2">
                    <span className="text-beige-400 text-lg leading-6 select-none">ㄴ</span>
                    <div className="flex-1">
                      <CommentItem
                        comment={reply}
                        onUpdate={onUpdateComment}
                        onDelete={onDeleteComment}
                        onSubmitReply={onSubmitReply}
                        isUpdating={isUpdating}
                        isDeleting={isDeleting}
                        isSubmittingReply={isSubmittingReply}
                        level={1}
                        diaryAuthorNickname={diaryAuthorNickname}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      );
    } else {
      // 답글은 루트댓글 Card 내부에서만 렌더링
      return null;
    }
  };

  if (comments.length === 0) {
    return (
      <Card className="bg-beige-50 border border-beige-200 shadow-sm">
        <CardContent className="py-8 text-center">
          <p className="text-beige-600">아직 댓글이 없습니다.</p>
          <p className="text-beige-500 text-sm mt-1">첫 번째 댓글을 작성해보세요.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {rootComments.map(comment => renderCommentWithReplies(comment))}
    </div>
  );
} 