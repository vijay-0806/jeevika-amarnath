
import { State, DataPoint, GSRReading } from '../types';
// Fix: Import correct exported members from csvData.ts (STROOP_DATA and GSR_DATA)
import { STROOP_DATA, GSR_DATA } from './csvData';

export class DataGenerator {
  /**
   * Parses the provided CSV strings into DataPoints.
   * Stroop data points are used as samples.
   * GSR data is synced to trial timestamps.
   */
  generateDataset(): DataPoint[] {
    // Fix: Reference STROOP_DATA instead of non-existent STROOP_CSV
    const stroopRows = STROOP_DATA.split('\n').slice(1);
    // Fix: Reference GSR_DATA instead of non-existent GSR_CSV_1
    const gsrRows = GSR_DATA.split('\n').slice(1);

    // Parse GSR stream
    const gsrStream: GSRReading[] = [];
    gsrRows.forEach(row => {
      const cols = row.split(',');
      if (cols.length >= 2) {
        gsrStream.push({
          timestamp: parseFloat(cols[0]) * 1000, // Convert to ms
          value: parseFloat(cols[1])
        });
      }
    });

    const data: DataPoint[] = [];

    // Map each Stroop trial to a DataPoint
    stroopRows.forEach((row, index) => {
      const cols = row.split(',');
      if (cols.length < 7) return;

      const timestampMs = parseInt(cols[1]);
      const rt = parseInt(cols[6]);
      const response = cols[5];

      // Heuristic for Drowsiness Labeling: 
      // Reaction Time > 1100ms or Wrong Response = Drowsy
      const isDrowsy = rt > 1100 || response.toLowerCase() === 'wrong';

      // Find GSR window for this trial (last 5 seconds)
      const windowStart = timestampMs - 5000;
      const windowEnd = timestampMs;
      const gsrHistory = gsrStream.filter(g => g.timestamp >= windowStart && g.timestamp <= windowEnd);

      if (gsrHistory.length === 0) return;

      // Feature Extraction
      const values = gsrHistory.map(h => h.value);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      
      let peakCount = 0;
      for (let j = 1; j < values.length - 1; j++) {
        if (values[j] > values[j-1] && values[j] > values[j+1] && values[j] > mean + 0.05) {
          peakCount++;
        }
      }

      data.push({
        id: cols[0], // S.No
        stroopTime: rt / 1000,
        gsrHistory,
        label: isDrowsy ? State.DROWSY : State.ALERT,
        features: {
          mean,
          variance,
          peakCount,
          slope: (values[values.length - 1] - values[0]) / (values.length || 1)
        }
      });
    });

    return data;
  }
}
