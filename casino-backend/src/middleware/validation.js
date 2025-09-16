const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      return res.status(400).json({
        error: 'Dados de entrada inválidos',
        code: 'VALIDATION_ERROR',
        details: errorDetails,
      });
    }
    
    next();
  };
};

// Esquemas de validação
const schemas = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email deve ter um formato válido',
      'any.required': 'Email é obrigatório',
    }),
    username: Joi.string().alphanum().min(3).max(30).required().messages({
      'string.alphanum': 'Username deve conter apenas letras e números',
      'string.min': 'Username deve ter pelo menos 3 caracteres',
      'string.max': 'Username deve ter no máximo 30 caracteres',
      'any.required': 'Username é obrigatório',
    }),
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required().messages({
      'string.min': 'Senha deve ter pelo menos 8 caracteres',
      'string.pattern.base': 'Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial',
      'any.required': 'Senha é obrigatória',
    }),
    firstName: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 50 caracteres',
      'any.required': 'Nome é obrigatório',
    }),
    lastName: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Sobrenome deve ter pelo menos 2 caracteres',
      'string.max': 'Sobrenome deve ter no máximo 50 caracteres',
      'any.required': 'Sobrenome é obrigatório',
    }),
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email deve ter um formato válido',
      'any.required': 'Email é obrigatório',
    }),
    password: Joi.string().required().messages({
      'any.required': 'Senha é obrigatória',
    }),
  }),

  bet: Joi.object({
    gameId: Joi.string().uuid().required().messages({
      'string.uuid': 'ID do jogo deve ser um UUID válido',
      'any.required': 'ID do jogo é obrigatório',
    }),
    amount: Joi.number().positive().precision(2).required().messages({
      'number.positive': 'Valor da aposta deve ser positivo',
      'any.required': 'Valor da aposta é obrigatório',
    }),
  }),
};

module.exports = {
  validate,
  schemas,
};