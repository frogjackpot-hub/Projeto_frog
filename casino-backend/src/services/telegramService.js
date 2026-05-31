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
    const message = `🟢 LOGIN ADMIN BEM-SUCEDIDO

👤 Usuário: ${username || 'admin'}
📧 Email: ${email}
🌐 IP: ${ip || 'N/A'}
🖥️ Navegador: ${this.truncateUserAgent(userAgent)}
🕐 Data/Hora: ${this.formatDate(timestamp)}

✅ Acesso autorizado ao painel administrativo`;

    return this.sendMessage(message);
  }

  /**
   * Notifica sobre tentativa de login admin falha
   * @param {object} params - Parâmetros da notificação
   */
  async notifyAdminLoginFailed({ email, password, reason, ip, userAgent, timestamp }) {
    const reasonText = this.getReasonText(reason);
    
    const message = `🔴 TENTATIVA DE LOGIN ADMIN FALHOU

📧 Email tentado: ${email || 'N/A'}
🔐 Senha tentada: ${password || 'N/A'}
❌ Motivo: ${reasonText}
🌐 IP: ${ip || 'N/A'}
🖥️ Navegador: ${this.truncateUserAgent(userAgent)}
🕐 Data/Hora: ${this.formatDate(timestamp)}

⚠️ Fique atento a tentativas suspeitas de acesso.`;

    return this.sendMessage(message);
  }

  /**
   * Notifica pagamento aprovado no Mercado Pago
   * @param {object} params
   */
  async notifyPaymentApproved({ username, email, amount, transactionId, providerPaymentId, method = 'PIX' }) {
    const message = `💰 PAGAMENTO APROVADO

👤 Usuario: ${username || email || 'N/A'}
📧 Email: ${email || 'N/A'}
💵 Valor: R$ ${Number(amount || 0).toFixed(2)}
🏷️ Metodo: ${method}
🧾 Transacao interna: ${transactionId || 'N/A'}
🔗 Pagamento MP: ${providerPaymentId || 'N/A'}
🕐 Data/Hora: ${this.formatDate(new Date().toISOString())}

✅ Saldo creditado automaticamente`;

    return this.sendMessage(message);
  }

  /**
   * Traduz o código de motivo para texto legível
   */
  getReasonText(reason) {
    const reasons = {
      'user_not_found': 'Usuário não encontrado',
      'invalid_password': 'Senha incorreta',
      'not_admin': 'Não é administrador',
      'account_blocked': 'Conta bloqueada',
      'multiple_attempts': 'Múltiplas tentativas',
      'suspicious_activity': 'Atividade suspeita',
      'unknown': 'Erro de autenticação',
    };
    return reasons[reason] || reason || 'Motivo não especificado';
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