/**
 * Middleware de Sanitização de Dados
 * 
 * Protege contra XSS armazenado sanitizando entradas do usuário
 * Remove tags HTML e caracteres perigosos de strings
 */

/**
 * Escapa caracteres HTML especiais para prevenir XSS
 * @param {string} str - String a ser sanitizada
 * @returns {string} - String sanitizada
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  return str.replace(/[&<>"'`=/]/g, char => htmlEscapes[char]);
}

/**
 * Remove tags HTML e scripts de uma string
 * @param {string} str - String a ser limpa
 * @returns {string} - String sem tags HTML
 */
function stripTags(str) {
  if (typeof str !== 'string') return str;
  
  // Remove tags HTML/XML
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/<[^>]+>/g, '') // Remove outras tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitiza uma string removendo tags e escapando caracteres perigosos
 * @param {string} str - String a ser sanitizada
 * @returns {string} - String sanitizada
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return stripTags(str).trim();
}

/**
 * Sanitiza recursivamente um objeto
 * @param {any} obj - Objeto a ser sanitizado
 * @returns {any} - Objeto sanitizado
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key of Object.keys(obj)) {
      // Não sanitizar senhas (elas podem ter caracteres especiais legítimos)
      if (key.toLowerCase().includes('password')) {
        sanitized[key] = obj[key];
      } else {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Middleware que sanitiza req.body
 */
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Middleware que sanitiza req.query
 */
function sanitizeQuery(req, res, next) {
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  next();
}

/**
 * Middleware que sanitiza req.params
 */
function sanitizeParams(req, res, next) {
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
}

/**
 * Middleware completo que sanitiza body, query e params
 */
function sanitizeAll(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
}

module.exports = {
  escapeHtml,
  stripTags,
  sanitizeString,
  sanitizeObject,
  sanitizeBody,
  sanitizeQuery,
  sanitizeParams,
  sanitizeAll
};
