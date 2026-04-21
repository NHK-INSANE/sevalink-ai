const Joi = require("joi");

/**
 * Validation Middleware
 * Validates the request body against a Joi schema.
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(", ");
      return res.status(400).json({ error: errorMessage });
    }
    next();
  };
};

// ── Schemas ──

const userSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("user", "volunteer", "worker", "ngo", "admin").required(),
  phone: Joi.string().optional().allow(""),
  address: Joi.string().optional().allow(""),
  // role-specific fields
  ngoName: Joi.string().optional(),
  ngoContact: Joi.string().optional(),
  ngoLink: Joi.string().optional(),
  bio: Joi.string().optional().max(500),
  skills: Joi.array().items(Joi.string()).optional(),
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional(),
});

const problemSchema = Joi.object({
  title: Joi.string().min(5).max(100).required(),
  description: Joi.string().min(10).required(),
  category: Joi.string().required(),
  address: Joi.string().required(),
  latitude: Joi.number().required(),
  longitude: Joi.number().required(),
  urgency: Joi.string().valid("Low", "Medium", "High", "Critical").optional(),
});

module.exports = {
  validate,
  userSchema,
  problemSchema,
};
