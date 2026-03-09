// Configuração centralizada da API
export const API_URL = 'http://152.42.165.18:3000';

// Função auxiliar para construir URLs da API
export const getApiEndpoint = (path: string): string => {
  return `${API_URL}${path.startsWith('/') ? path : '/' + path}`;
};

export default API_URL;
