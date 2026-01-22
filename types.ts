
export enum State {
  ALERT = 'Alert',
  DROWSY = 'Drowsy'
}

export interface GSRReading {
  timestamp: number;
  value: number; // in microSiemens (µS)
}

export interface DataPoint {
  id: string;
  gsrHistory: GSRReading[];
  stroopTime: number; // in seconds
  label: State;
  features?: {
    mean: number;
    variance: number;
    peakCount: number;
    slope: number;
  };
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}
