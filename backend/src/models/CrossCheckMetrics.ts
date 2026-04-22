import { pool } from '../config/database';

export interface CrossCheckBatch {
  id?: number;
  run_date: string;
  total_duration_seconds: number;
  total_airports: number;
  status: 'running' | 'success' | 'failed';
  error_message?: string | null;
  created_at?: Date;
}

export interface CrossCheckAirportMetric {
  id?: number;
  batch_id: number;
  airport_code: string;
  duration_seconds: number;
  updated_count: number;
  cancelled_count: number;
  new_flights_count: number;
  total_records: number;
  status: 'success' | 'failed';
  error_message?: string | null;
  attempts?: number;
  created_at?: Date;
}

export class CrossCheckMetricsModel {
  /**
   * Create a new batch record
   */
  static async createBatch(batch: Partial<CrossCheckBatch>): Promise<number> {
    const query = `
      INSERT INTO cross_check_batches (run_date, total_airports, status)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    const result = await pool.query(query, [
      batch.run_date,
      batch.total_airports || 0,
      batch.status || 'running'
    ]);
    return result.rows[0].id;
  }

  /**
   * Update an existing batch record (finish)
   */
  static async updateBatch(id: number, update: Partial<CrossCheckBatch>): Promise<void> {
    const query = `
      UPDATE cross_check_batches
      SET total_duration_seconds = $2,
          status = $3,
          error_message = $4
      WHERE id = $1
    `;
    await pool.query(query, [
      id,
      update.total_duration_seconds || 0,
      update.status || 'success',
      update.error_message || null
    ]);
  }

  /**
   * Save a single airport metric tied to a batch
   */
  static async saveAirportMetric(metric: CrossCheckAirportMetric): Promise<void> {
    const query = `
      INSERT INTO cross_check_airport_metrics (
        batch_id, airport_code, duration_seconds,
        updated_count, cancelled_count, new_flights_count,
        total_records, status, error_message, attempts
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    await pool.query(query, [
      metric.batch_id,
      metric.airport_code,
      metric.duration_seconds,
      metric.updated_count,
      metric.cancelled_count,
      metric.new_flights_count,
      metric.total_records,
      metric.status,
      metric.error_message || null,
      metric.attempts || 1,
    ]);
  }

  /**
   * Get recent batches with their airport metrics
   */
  static async getRecentBatches(limit: number = 10): Promise<any[]> {
    const query = `
      SELECT b.*, 
             (SELECT json_agg(a.*) FROM cross_check_airport_metrics a WHERE a.batch_id = b.id) as airport_metrics
      FROM cross_check_batches b
      ORDER BY b.created_at DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }
}
