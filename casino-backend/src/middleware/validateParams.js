const Joi = require('joi');

const uuidSchema = Joi.string().pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).required();

function validateParamUUID(paramName) {
  return (req, res, next) => {
    const { error } = uuidSchema.validate(req.params[paramName]);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'ID inválido',
        code: 'INVALID_PARAM_UUID',
        details: error.details,
      });
    }
    next();
  };
}

module.exports = {
  validateParamUUID,
};
