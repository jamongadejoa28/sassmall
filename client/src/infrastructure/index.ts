// Infrastructure Layer Exports
// Clean Architecture: Infrastructure Layer
// 위치: client/src/infrastructure/index.ts

export {
  container,
  type DIContainer,
  type ContainerConfig,
} from './di/Container';
export { useContainer, useProductUseCases } from './di/useContainer';
