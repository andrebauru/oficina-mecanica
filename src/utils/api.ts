import axios from 'axios';

// Configuração centralizada da API
export const API_URL = '/api';

// Garante que cookies de sessão sejam enviados em todos os requests
axios.defaults.withCredentials = true;

// Interceptor global para redirecionar para login em caso de sessão expirada
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 440) {
      // Limpa sessionStorage e recarrega para forçar login
      sessionStorage.clear();
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// Função auxiliar para construir URLs da API
export const getApiEndpoint = (path: string): string => {
  return `${API_URL}${path.startsWith('/') ? path : '/' + path}`;
};

export default API_URL;
