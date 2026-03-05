// Configuração centralizada da API
const getApiUrl = (): string => {
  // Em desenvolvimento, use localhost:3001
  // Em produção, use a API relativa ou a variável de ambiente
  
  if (typeof window !== 'undefined') {
    // Se estamos em um navegador
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    
    if (isDevelopment) {
      return 'http://localhost:3001';
    }
    
    // Em produção, use a URL relativa para o mesmo domínio
    // Isto funciona se o nginx redireciona /api para localhost:3001
    return 'http://localhost:3001';
  }
  
  return 'http://localhost:3001';
};

export const API_URL = getApiUrl();

// Função auxiliar para construir URLs da API
export const getApiEndpoint = (path: string): string => {
  return `${API_URL}${path.startsWith('/') ? path : '/' + path}`;
};

export default API_URL;
