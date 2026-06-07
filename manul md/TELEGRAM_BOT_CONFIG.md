# 🤖 Configuração do Bot Telegram - Notificações Admin

## 📋 Descrição

O sistema de notificações via Telegram envia alertas em tempo real para o administrador sempre que:

- ✅ Um admin faz login com sucesso
- ❌ Uma tentativa de login admin falha (senha errada, usuário não encontrado, etc.)

## 🔧 Configuração no Render.com

### Passo 1: Acessar o Dashboard do Render

1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Selecione o serviço **casino-backend**
3. Vá para a aba **Environment**

### Passo 2: Adicionar Variáveis de Ambiente

Adicione as seguintes variáveis:

| Variável             | Valor                                            |
| -------------------- | ------------------------------------------------ |
| `TELEGRAM_BOT_TOKEN` | `<SEU_TELEGRAM_BOT_TOKEN>`                       |
| `TELEGRAM_CHAT_ID`   | `<SEU_TELEGRAM_CHAT_ID>`                         |

### Passo 3: Salvar e Fazer Redeploy

1. Clique em **Save Changes**
2. O Render irá automaticamente fazer o redeploy
3. Aguarde o deploy finalizar

## 📨 Exemplos de Notificações

### Login Bem-Sucedido

```
🟢 LOGIN ADMIN BEM-SUCEDIDO

👤 Usuário: admin
📧 Email: admin@casino.com
🌐 IP: 189.45.123.78
🖥️ Navegador: Chrome (Windows)
🕐 Data/Hora: 11/01/2026, 14:30:45

✅ Acesso autorizado ao painel administrativo.
```

### Tentativa de Login Falha

```
🔴 TENTATIVA DE LOGIN ADMIN FALHOU

📧 Email tentado: hacker@email.com
❌ Motivo: Usuário não encontrado
🌐 IP: 45.67.89.123
🖥️ Navegador: Firefox (Linux)
🕐 Data/Hora: 11/01/2026, 14:32:10

⚠️ Fique atento a tentativas suspeitas de acesso.
```

## 🧪 Testar Localmente

Para testar localmente, crie um arquivo `.env` na pasta `casino-backend`:

```env
TELEGRAM_BOT_TOKEN=<SEU_TELEGRAM_BOT_TOKEN>
TELEGRAM_CHAT_ID=<SEU_TELEGRAM_CHAT_ID>
```

Depois, reinicie o servidor e tente fazer login no painel admin.

## 🔒 Segurança

⚠️ **IMPORTANTE**:

- Nunca compartilhe seu token do bot publicamente
- O Chat ID é seu identificador pessoal no Telegram
- As credenciais estão configuradas como variáveis de ambiente, não no código

## 📁 Arquivos Modificados

- `src/services/telegramService.js` - Novo serviço de Telegram
- `src/controllers/adminController.js` - Integração das notificações
- `.env.example` - Template atualizado
- `.env.production` - Configurações de produção

## ❓ Solução de Problemas

### Não estou recebendo notificações

1. Verifique se as variáveis de ambiente estão corretas no Render
2. Certifique-se de que iniciou uma conversa com o bot no Telegram
3. Verifique os logs do backend para erros

### Como obter meu Chat ID?

1. Inicie uma conversa com seu bot no Telegram
2. Envie qualquer mensagem
3. Acesse: `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`
4. Procure pelo campo `"chat":{"id":XXXXXXXX}`

### Como criar um bot no Telegram?

1. Abra o Telegram e pesquise por `@BotFather`
2. Envie `/newbot`
3. Siga as instruções para criar o bot
4. Copie o token fornecido
