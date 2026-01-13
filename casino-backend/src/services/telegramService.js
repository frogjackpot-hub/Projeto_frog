/**
 * Serviço de notificações via Telegram
 * Envia alertas para o administrador sobre tentativas de login
 */

const logger = require('../utils/logger');

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.enabled = !!(this.botToken && this.chatId);
    
    if (!this.enabled) {
      logger.warn('⚠️ TelegramService: Token ou Chat ID não configurados. Notificações desabilitadas.');
    } else {
      logger.info('✅ TelegramService: Serviço de notificações Telegram ativo');
    }
  }

  /**
   * Envia uma mensagem para o Telegram
   * @param {string} message - Mensagem a ser enviada
   * @returns {Promise<boolean>} - Retorna true se enviado com sucesso
   */
  async sendMessage(message) {
    if (!this.enabled) {
      logger.debug('TelegramService: Notificação ignorada - serviço desabilitado');
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        logger.error('Erro ao enviar mensagem Telegram:', data.description);
        return false;
      }

      logger.info('📨 Notificação Telegram enviada com sucesso');
      return true;
    } catch (error) {
      logger.error('Erro ao enviar notificação Telegram:', error.message);
      return false;
    }
  }

  /**
   * Notifica sobre tentativa de login admin bem-sucedida
   * @param {object} params - Parâmetros da notificação
   */
  async notifyAdminLoginSuccess({ email, username, ip, userAgent, timestamp }) {
    const message = `
🎯 <b>ACESSO ADMINISTRATIVO AUTORIZADO</b>

✅ <b>STATUS:</b> Login realizado com sucesso
👤 <b>ADMIN:</b> ${username || 'N/A'}
📧 <b>EMAIL:</b> ${email}
🌍 <b>ORIGEM:</b> ${ip || 'IP não identificado'}
🖥️ <b>DISPOSITIVO:</b> ${this.truncateUserAgent(userAgent)}
⏰ <b>TIMESTAMP:</b> ${this.formatDate(timestamp)}

🔒 <i>Sistema de monitoramento de segurança ativo</i>
🎰 <b>CASINO ADMINISTRATION PANEL</b>
    `.trim();

    return this.sendMessage(message);
  }

  /**
   * Notifica sobre tentativa de login admin falha
   * @param {object} params - Parâmetros da notificação
   */
  async notifyAdminLoginFailed({ email, reason, ip, userAgent, timestamp }) {
    const reasonText = this.getReasonText(reason);
    
    const message = `
🚨 <b>TENTATIVA DE ACESSO NEGADA</b>

❌ <b>STATUS:</b> Acesso negado ao painel administrativo
📧 <b>EMAIL:</b> ${email || 'Não informado'}
⚠️ <b>MOTIVO:</b> ${reasonText}
🌍 <b>ORIGEM:</b> ${ip || 'IP não identificado'}
🖥️ <b>DISPOSITIVO:</b> ${this.truncateUserAgent(userAgent)}
⏰ <b>TIMESTAMP:</b> ${this.formatDate(timestamp)}

🔐 <i>Monitoramento de segurança detectou tentativa suspeita</i>
⚠️ <b>VERIFIQUE IMEDIATAMENTE se esta tentativa é legítima</b>
🎰 <b>CASINO SECURITY SYSTEM</b>
    `.trim();

    return this.sendMessage(message);
  }

  /**
   * Notifica sobre logout de admin
   * @param {object} params - Parâmetros da notificação
   */
  async notifyAdminLogout({ email, username, ip, timestamp }) {
    const message = `
🔓 <b>SESSÃO ADMINISTRATIVA ENCERRADA</b>

🚪 <b>STATUS:</b> Logout realizado com sucesso
👤 <b>ADMIN:</b> ${username || 'N/A'}
📧 <b>EMAIL:</b> ${email}
🌍 <b>ORIGEM:</b> ${ip || 'IP não identificado'}
⏰ <b>TIMESTAMP:</b> ${this.formatDate(timestamp)}

🔒 <i>Sessão encerrada com segurança</i>
🎰 <b>CASINO ADMINISTRATION PANEL</b>
    `.trim();

    return this.sendMessage(message);
  }

  /**
   * Traduz o código de motivo para texto legível
   */
  getReasonText(reason) {
    const reasons = {
      'user_not_found': '🔍 Usuário não encontrado no sistema',
      'invalid_password': '🔑 Credenciais inválidas fornecidas',
      'not_admin': '⚠️ Usuário não possui privilégios administrativos',
      'account_blocked': '🚫 Conta administrativa bloqueada temporariamente',
      'multiple_attempts': '🔒 Múltiplas tentativas de acesso detectadas',
      'suspicious_activity': '🕵️ Atividade suspeita identificada',
      'unknown': '❓ Erro de autenticação não identificado',
    };
    return reasons[reason] || reason || '❓ Motivo não especificado pelo sistema';
  }

  /**
   * Formata a data para exibição
   */
  formatDate(timestamp) {
    const date = timestamp ? new Date(timestamp) : new Date();
    return date.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  /**
   * Trunca o User-Agent para não ficar muito longo
   */
  truncateUserAgent(userAgent) {
    if (!userAgent) return 'Desconhecido';
    
    // Extrair informações principais do User-Agent
    const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];
    const os = ['Windows', 'Mac', 'Linux', 'Android', 'iOS'];
    
    let browserInfo = 'Navegador desconhecido';
    let osInfo = '';
    
    for (const browser of browsers) {
      if (userAgent.includes(browser)) {
        browserInfo = browser;
        break;
      }
    }
    
    for (const system of os) {
      if (userAgent.includes(system)) {
        osInfo = system;
        break;
      }
    }
    
    return osInfo ? `${browserInfo} (${osInfo})` : browserInfo;
  }
}

// Exportar instância única (singleton)
module.exports = new TelegramService();