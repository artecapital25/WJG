/**
 * WorkOrdersPipeline (Modular Proxy)
 * Re-exports the decoupled modular feature implementation from src/features/workshop
 * Adheres to 5-layer decoupled architecture (<10 lines entry).
 */
export { WorkOrdersPipeline } from '../../features/workshop';
export type { WorkOrdersPipelineProps } from '../../features/workshop/types/workshop.types';
