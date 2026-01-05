// Vote module exports
// Public interface for Vote Management Module

import { PrismaClient } from '@prisma/client';
import { VoteRepository } from './repository.js';
import { VoteValidator } from './validation.js';
import { VoteService } from './service.js';
import { VoteController } from './controller.js';
import { createVoteRoutes } from './routes.js';

// Export types
export * from './types.js';

// Export classes
export { VoteRepository } from './repository.js';
export { VoteValidator } from './validation.js';
export { VoteService } from './service.js';
export { VoteController } from './controller.js';
export { createVoteRoutes } from './routes.js';

// Factory function to create Vote module with dependencies
export function createVoteModule(prisma: PrismaClient) {
  const repository = new VoteRepository(prisma);
  const validator = new VoteValidator(prisma);
  const service = new VoteService(repository, validator);
  const controller = new VoteController(service);
  const routes = createVoteRoutes(controller);

  return {
    repository,
    validator,
    service,
    controller,
    routes
  };
}
