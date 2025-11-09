// Configuração de produção para Render.com
// A URL da API será injetada automaticamente pelo Render
export const environment = {
  production: true,
  // No Render, a URL do backend será: https://casino-backend.onrender.com
  // Atualize após o deploy com a URL real
  apiUrl: 'https://casino-backend.onrender.com/api',
  appName: 'Casino Online',
  version: '1.0.0'
};