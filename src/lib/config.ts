// API 설정
// 개발 환경에서는 localhost:8080, 프로덕션에서는 anonymous-diary-backend.onrender.com 사용
export const API_CONFIG = {
  // 개발 환경
  DEVELOPMENT: 'http://localhost:8080',
  // 프로덕션 환경
  PRODUCTION: 'https://anonymous-diary-backend.onrender.com',
  // 현재 환경에 따른 API 베이스 URL
  get BASE_URL() {
    // 환경 변수가 설정되어 있으면 사용, 없으면 개발 환경으로 기본 설정
    if (typeof window !== 'undefined') {
      // 클라이언트 사이드에서는 환경 변수 접근이 제한적이므로
      // 개발/프로덕션 환경을 구분하는 다른 방법 사용
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return this.DEVELOPMENT;
      } else {
        return this.PRODUCTION;
      }
    }
    // 서버 사이드에서는 환경 변수 사용
    return process.env.NEXT_PUBLIC_API_BASE_URL || this.DEVELOPMENT;
  }
};

// API 베이스 URL을 쉽게 가져올 수 있는 함수
export const getApiBaseUrl = () => API_CONFIG.BASE_URL; 