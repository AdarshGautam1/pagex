import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

type RequestLocation = 'body' | 'query' | 'params';

export function validate(schema: AnyZodObject, location: RequestLocation = 'body') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync(req[location]);
      req[location] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}
