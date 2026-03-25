/**
 * Scheduled Jobs Service
 * รันงานอัตโนมัติตามเวลาที่กำหนด
 */

import * as cron from 'node-cron';
import { initFlightCrossCheckJobs } from '../jobs/flightCrossCheckJob';

export class SchedulerService {
  private jobs: cron.ScheduledTask[] = [];

  /**
   * เริ่ม Scheduled Jobs ทั้งหมด
   */
  startAll(): void {
    console.log('\n📅 Starting scheduled jobs...');
    console.log('='.repeat(60));

    // Start background scraped cross-checks
    initFlightCrossCheckJobs();

    console.log('='.repeat(60));
    console.log(`✅ Started scheduled jobs\n`);
  }

  /**
   * หยุด Scheduled Jobs ทั้งหมด
   */
  stopAll(): void {
    console.log('🛑 Stopping scheduled jobs...');
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    console.log('✅ All scheduled jobs stopped');
  }
}

export const schedulerService = new SchedulerService();

