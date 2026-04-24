import { Router } from 'express';
import flightRoutes from './flightRoutes';
import airportRoutes from './airportRoutes';
import airlineRoutes from './airlineRoutes';
import destinationRoutes from './destinationRoutes';
import statisticsRoutes from './statisticsRoutes';
import healthRoutes from './healthRoutes';
import monitoringRoutes from './monitoringRoutes';

const router = Router();

// API routes
router.use('/flights', flightRoutes);
router.use('/airports', airportRoutes);
router.use('/airlines', airlineRoutes);
router.use('/destinations', destinationRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/health', healthRoutes);
router.use('/system', monitoringRoutes);

export default router;

