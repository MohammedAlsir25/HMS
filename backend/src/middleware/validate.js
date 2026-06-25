import { ValidationError } from '../utils/errors.js';

export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
      throw new ValidationError('Validation failed', details);
    }
    req.body = result.data;
    next();
  };
}
