// Configuração centralizada da API
export const API_URL = '/api';

// Função auxiliar para construir URLs da API
export const getApiEndpoint = (path: string): string => {
  return `${API_URL}${path.startsWith('/') ? path : '/' + path}`;
};

export default API_URL;
