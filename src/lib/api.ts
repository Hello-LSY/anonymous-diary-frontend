import { getApiBaseUrl } from './config';

const API_BASE = getApiBaseUrl();

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}

export async function fetchWithAuth(
    path: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
  
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  
    let response: Response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: 'include', //  쿠키 인증용
      });
    } catch (error) {
      console.error('Fetch error:', error);
      throw new Error(`네트워크 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  
    // 401 에러 시 토큰 갱신 시도
    if (response.status === 401) {
      try {
        const refreshResponse = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include', //  HttpOnly 쿠키 전달
        });
  
        if (refreshResponse.ok) {
          const { accessToken } = await refreshResponse.json();
          localStorage.setItem('accessToken', accessToken);
          
          headers.Authorization = `Bearer ${accessToken}`;
          return fetch(`${API_BASE}${path}`, {
            ...options,
            headers: headers as HeadersInit,
            credentials: 'include', //  재시도에도 적용
          });
        } else {
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      } catch (error) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
  
    return response;
  }
  

export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = '알 수 없는 오류가 발생했습니다.';
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // JSON 파싱 실패 시 상태 코드에 따른 기본 메시지 사용
      switch (response.status) {
        case 400:
          errorMessage = '잘못된 요청입니다.';
          break;
        case 401:
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          errorMessage = '로그인이 필요합니다.';
          break;
        case 403:
          errorMessage = '권한이 없습니다.';
          break;
        case 404:
          errorMessage = '요청한 리소스를 찾을 수 없습니다.';
          break;
        case 500:
          errorMessage = '서버 오류가 발생했습니다.';
          break;
        default:
          errorMessage = '알 수 없는 오류가 발생했습니다.';
      }
    }
    
    throw new Error(errorMessage);
  }

  // 응답이 비어있는 경우 (204 No Content 등)
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    // JSON이 아닌 응답이거나 빈 응답인 경우
    if (response.status === 204 || response.status === 200) {
      return {} as T; // 빈 객체 반환
    }
    throw new Error('서버에서 잘못된 응답을 받았습니다.');
  }

  try {
    const text = await response.text();
    if (!text.trim()) {
      // 빈 문자열인 경우
      return {} as T;
    }
    return JSON.parse(text);
  } catch (e) {
    console.error('JSON 파싱 오류:', e);
    console.error('응답 텍스트:', await response.text());
    throw new Error('서버 응답을 처리하는 중 오류가 발생했습니다.');
  }
} 