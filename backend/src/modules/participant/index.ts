// Participant module - Public interface
// Factory function for dependency injection and module exports

import { PrismaClient } from '@prisma/client';
import { ParticipantRepository } from './repository.js';
import { ParticipantValidator } from './validation.js';
import { ParticipantService } from './service.js';
import { ParticipantController } from './controller.js';
import { createParticipantRoutes } from './routes.js';

// Re-export types
export * from './types.js';

// Re-export classes
export { ParticipantRepository } from './repository.js';
export { ParticipantValidator } from './validation.js';
export { ParticipantService } from './service.js';
export { ParticipantController } from './controller.js';
export { createParticipantRoutes } from './routes.js';

// Factory function for creating participant module
export function createParticipantModule(prisma: PrismaClient) {
  const repository = new ParticipantRepository(prisma);
  const validator = new ParticipantValidator(prisma);
  const service = new ParticipantService(prisma);
  const controller = new ParticipantController(prisma);
  const routes = createParticipantRoutes(prisma);

  return {
    repository,
    validator,
    service,
    controller,
    routes
  };
}
