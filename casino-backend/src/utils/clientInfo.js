/**
 * Utilitário para extrair informações reais do cliente
 * Resolve problemas de proxy/load balancer/Docker
 */

/**
 * Obtém o IP real do cliente considerando proxies
 * @param {object} req - Express request object
 * @returns {string} IP real do cliente
 */
function getClientIP(req) {
  // Ordem de prioridade para headers de IP
  const headers = [
    'x-client-ip',           // Header customizado
    'x-forwarded-for',       // Header padrão de proxy
    'cf-connecting-ip',      // Cloudflare
    'fastly-client-ip',      // Fastly CDN
    'true-client-ip',        // Akamai
    'x-real-ip',             // Nginx proxy
    'x-cluster-client-ip',   // Rackspace LB
    'x-forwarded',           // Variação
    'forwarded-for',         // Variação
    'forwarded',             // RFC 7239
  ];

  for (const header of headers) {
    const value = req.headers[header];
    if (value) {
      // X-Forwarded-For pode ter múltiplos IPs separados por vírgula
      // O primeiro IP é o cliente original
      const ips = value.split(',').map(ip => ip.trim());
      const clientIP = ips[0];
      
      // Validar se parece um IP válido e não é interno
      if (clientIP && !isInternalIP(clientIP)) {
        return clientIP;
      }
    }
  }

  // Fallback para req.ip (Express) ou conexão direta
  const expressIP = req.ip || 
                   req.connection?.remoteAddress || 
                   req.socket?.remoteAddress ||
                   req.connection?.socket?.remoteAddress;

  // Remover prefixo IPv6 se presente
  if (expressIP) {
    return expressIP.replace(/^::ffff:/, '');
  }

  return 'IP não identificado';
}

/**
 * Verifica se um IP é interno (rede privada/Docker)
 * @param {string} ip - Endereço IP
 * @returns {boolean}
 */
function isInternalIP(ip) {
  if (!ip) return true;
  
  // IPs de rede privada (RFC 1918) e Docker
  const internalPatterns = [
    /^10\./,              // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[01])\./,  // 172.16.0.0/12
    /^192\.168\./,        // 192.168.0.0/16
    /^127\./,             // Localhost
    /^0\./,               // Invalid
    /^::1$/,              // IPv6 localhost
    /^fc00:/i,            // IPv6 private
    /^fe80:/i,            // IPv6 link-local
  ];

  return internalPatterns.some(pattern => pattern.test(ip));
}

/**
 * Extrai informações detalhadas do User-Agent
 * @param {string} userAgent - User-Agent string
 * @returns {object} Informações do navegador/dispositivo
 */
function parseUserAgent(userAgent) {
  if (!userAgent) {
    return {
      browser: 'Desconhecido',
      os: 'Desconhecido',
      device: 'Desconhecido',
      isMobile: false,
      isBot: false,
      raw: ''
    };
  }

  const result = {
    browser: 'Navegador desconhecido',
    os: 'Sistema desconhecido',
    device: 'Desktop',
    isMobile: false,
    isBot: false,
    raw: userAgent
  };

  // Detectar bots
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /java/i, /perl/i
  ];
  result.isBot = botPatterns.some(pattern => pattern.test(userAgent));

  // Detectar navegador
  if (/Edg/i.test(userAgent)) {
    result.browser = 'Microsoft Edge';
  } else if (/OPR|Opera/i.test(userAgent)) {
    result.browser = 'Opera';
  } else if (/Chrome/i.test(userAgent) && !/Chromium/i.test(userAgent)) {
    result.browser = 'Google Chrome';
  } else if (/Firefox/i.test(userAgent)) {
    result.browser = 'Mozilla Firefox';
  } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
    result.browser = 'Apple Safari';
  } else if (/MSIE|Trident/i.test(userAgent)) {
    result.browser = 'Internet Explorer';
  }

  // Detectar sistema operacional
  if (/Windows NT 10/i.test(userAgent)) {
    result.os = 'Windows 10/11';
  } else if (/Windows NT 6\.3/i.test(userAgent)) {
    result.os = 'Windows 8.1';
  } else if (/Windows NT 6\.2/i.test(userAgent)) {
    result.os = 'Windows 8';
  } else if (/Windows NT 6\.1/i.test(userAgent)) {
    result.os = 'Windows 7';
  } else if (/Windows/i.test(userAgent)) {
    result.os = 'Windows';
  } else if (/Mac OS X/i.test(userAgent)) {
    result.os = 'macOS';
  } else if (/Android/i.test(userAgent)) {
    result.os = 'Android';
    result.isMobile = true;
    result.device = 'Smartphone';
  } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
    result.os = 'iOS';
    result.isMobile = true;
    result.device = /iPad/i.test(userAgent) ? 'Tablet' : 'Smartphone';
  } else if (/Linux/i.test(userAgent)) {
    result.os = 'Linux';
  }

  // Detectar dispositivo móvel adicional
  if (/Mobile|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    result.isMobile = true;
    if (!/Tablet|iPad/i.test(userAgent)) {
      result.device = 'Smartphone';
    }
  }

  return result;
}

/**
 * Formata as informações do cliente para exibição
 * @param {object} req - Express request object
 * @returns {object} Informações formatadas do cliente
 */
function getClientInfo(req) {
  const ip = getClientIP(req);
  const userAgentRaw = req.get('user-agent') || req.headers['user-agent'];
  const userAgentInfo = parseUserAgent(userAgentRaw);

  return {
    ip,
    isInternalIP: isInternalIP(ip),
    userAgent: userAgentInfo,
    formattedDevice: `${userAgentInfo.browser} (${userAgentInfo.os})`,
    timestamp: new Date(),
    // Headers para debug
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'cf-connecting-ip': req.headers['cf-connecting-ip'],
    }
  };
}

module.exports = {
  getClientIP,
  isInternalIP,
  parseUserAgent,
  getClientInfo
};
