// Poll module exports
// Public interface for Poll Management Module

import { PrismaClient } from '@prisma/client';
import { PollRepository } from './repository.js';
import { PollValidator } from './validation.js';
import { PollService } from './service.js';
import { PollController } from './controller.js';
import { createPollRoutes } from './routes.js';

// Export types
export * from './types.js';

// Export classes
export { PollRepository } from './repository.js';
export { PollValidator } from './validation.js';
export { PollService } from './service.js';
export { PollController } from './controller.js';
export { createPollRoutes } from './routes.js';

// Factory function to create Poll module with dependencies
export function createPollModule(prisma: PrismaClient) {
  const repository = new PollRepository(prisma);
  const validator = new PollValidator(prisma);
  const service = new PollService(repository, validator);
  const controller = new PollController(service);
  const routes = createPollRoutes(controller);

  return {
    repository,
    validator,
    service,
    controller,
    routes
  };
}
