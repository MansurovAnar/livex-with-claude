const { z } = require('zod');

exports.loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
