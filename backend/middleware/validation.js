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
  username: Joi.string().optional().allow(""),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("user", "volunteer", "worker", "ngo", "admin").required(),
  phone: Joi.string().optional().allow(""),
  address: Joi.string().optional().allow(""),
  location: Joi.object({
    lat: Joi.number().optional(),
    lng: Joi.number().optional(),
  }).optional(),
  skill: Joi.string().optional().allow(""),
  skills: Joi.array().items(Joi.string()).optional(),
  otherSkill: Joi.string().optional().allow(""),
  // role-specific fields
  ngoName: Joi.string().optional().allow(""),
  ngoContact: Joi.string().optional().allow(""),
  ngoLink: Joi.string().optional().allow(""),
  bio: Joi.string().optional().max(500).allow(""),
});

const problemSchema = Joi.object({
  title: Joi.string().min(5).max(100).required(),
  description: Joi.string().min(10).required(),
  category: Joi.string().required(),
  address: Joi.string().optional(),
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional(),
  location: Joi.object({
    lat: Joi.number().optional(),
    lng: Joi.number().optional(),
    address: Joi.string().optional(),
  }).optional(),
  urgency: Joi.string().valid("Low", "Medium", "High", "Critical").optional(),
  requiredSkill: Joi.string().optional().allow(""),
});

module.exports = {
  validate,
  userSchema,
  problemSchema,
};
