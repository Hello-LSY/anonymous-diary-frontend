// 사용자 관련 타입
export interface User {
  id: string;
  email: string;
  anonymousNumber: string;
  nickname?: string;
  createdAt: string;
}

// 일기 관련 타입
export interface Diary {
  id: number;
  title?: string;
  content: string;
  visible: boolean;
  allowComment: boolean;
  aiRefined: boolean;
  createdAt: string;
  updatedAt: string;
  viewed?: boolean;
  nickname?: string;
  // 기존 호환성을 위한 필드들
  isPublic?: boolean;
  allowComments?: boolean;
  isRefined?: boolean;
  refinedContent?: string;
  author?: {
    id: number;
    anonymousNumber: string;
  };
  reactions?: Reaction[];
  comments?: Comment[];
  _count?: {
    reactions: number;
    comments?: number;
  };
  totalReactionCount?: number;
  commentCount?: number;
}

// 백엔드 응답용 일기 상세 타입
export interface DiaryDetailDto {
  id: number;
  nickname: string;
  title?: string;
  content: string;
  allowComment: boolean;
  visible: boolean;
  aiRefined: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiaryRequest {
  title: string;
  content: string;
  allowComment: boolean;
  visible: boolean;
}

export interface RefineDiaryRequest {
  refineType: 'NATURAL' | 'EMOTIONAL' | 'SIMPLIFY' | 'EXPAND';
}

export interface RefineDiaryResponse {
  originalContent: string;
  refinedContent: string;
}

// 새로운 AI 정제 API용 타입들
export interface RefineRequest {
  content: string;
  refineType: 'NATURAL' | 'EMOTIONAL' | 'SIMPLIFY' | 'EXPAND';
}

export interface RefineResponse {
  originalContent: string;
  refinedContent: string;
}

export interface RefineUpdateRequest {
  refinedContent: string;
}

export interface DiaryUpdateRequest {
  title?: string;
  content: string;
  visible: boolean;
  allowComment: boolean;
}

// 리액션 관련 타입
export interface Reaction {
  id: string;
  type: 'CHEER' | 'SAD' | 'LIKE';
  diaryId: string;
  userId: string;
  createdAt: string;
  nickname?: string;
}

// 백엔드 응답용 리액션 타입
export interface ReactionDto {
  nickname: string;
  type: 'CHEER' | 'SAD' | 'LIKE';
}

export interface ReactionToggleResponse {
  result: string;
}

export interface CreateReactionRequest {
  type: 'CHEER' | 'SAD' | 'LIKE';
}

// 댓글 관련 타입 (대댓글 지원)
export interface Comment {
  id: number;
  nickname: string;
  content: string;
  createdAt: string;
  parentCommentId?: number | null; // 대댓글인 경우 부모 댓글 ID
  isOwned?: boolean; // 본인 댓글 여부
}

// 백엔드 응답용 댓글 타입
export interface CommentDto {
  id: number;
  nickname: string;
  content: string;
  createdAt: string;
  parentCommentId?: number | null;
}

export interface CommentCreateResponse {
  id: number;
  nickname: string;
  content: string;
  createdAt: string;
}

export interface CreateCommentRequest {
  content: string;
  parentCommentId?: number | null; // 대댓글인 경우 부모 댓글 ID
}

export interface UpdateCommentRequest {
  content: string;
}

// 페이지네이션 타입
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

// API 응답 타입
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}

// 북마크 관련 타입
export interface Bookmark {
  id: string;
  diaryId: string;
  diary: Diary;
  createdAt: string;
}

// 마이페이지 탭 타입
export type ProfileTab = 'diaries' | 'bookmarks';

// 내 일기 목록 응답 타입 (Slice 기반)
export interface UserDiarySummaryDto {
  id: number;
  title?: string;
  content: string;
  allowComment: boolean;
  visible: boolean;
  aiRefined: boolean;
  createdAt: string;
  totalReactionCount: number;
  commentCount: number;
  // Diary 타입과의 호환성을 위한 필드들
  reactions?: any[];
  _count?: {
    reactions: number;
    comments: number;
  };
  isPublic?: boolean;
  allowComments?: boolean;
  isRefined?: boolean;
  refinedContent?: string;
  author?: {
    id: number;
    anonymousNumber: string;
  };
}

export interface RefineUsageResponse {
  used: number;
  remaining: number;
  limit: number;
}

// Slice 기반 페이지네이션 응답 타입
export interface SliceResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      sorted: boolean;
      empty: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  number: number;
  size: number;
  numberOfElements: number;
  sort: {
    sorted: boolean;
    empty: boolean;
    unsorted: boolean;
  };
  first: boolean;
  empty: boolean;
}

// 전체 일기 목록 응답 타입 (Slice 기반)
export interface VisibleDiarySummaryDto {
  id: number;
  title?: string;
  content: string;
  allowComment: boolean;
  aiRefined: boolean;
  createdAt: string;
  viewed: boolean;
  totalReactionCount: number;
  commentCount: number;
}

// 북마크 관련 타입
export interface BookmarkToggleResponse {
  result: string;
}

export interface BookmarkedDiaryDto {
  id: number;
  title?: string;
  content: string;
  allowComment: boolean;
  aiRefined: boolean;
  createdAt: string;
  viewed: boolean;
  totalReactionCount: number;
  commentCount: number;
}

