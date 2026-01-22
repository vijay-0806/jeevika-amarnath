
import React from 'react';
import { Copy } from 'lucide-react';

const PythonCodeBlock: React.FC = () => {
  const code = `
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

# 1. Feature Extraction Simulation
# In real life, you'd process raw GSR time-series here
def extract_features(gsr_signal):
    return {
        'gsr_mean': np.mean(gsr_signal),
        'gsr_std': np.std(gsr_signal),
        'gsr_peaks': len([i for i in range(1, len(gsr_signal)-1) 
                          if gsr_signal[i] > gsr_signal[i-1] and gsr_signal[i] > gsr_signal[i+1]])
    }

# 2. Loading Dataset
# Assume df contains: ['stroop_time', 'gsr_mean', 'gsr_std', 'gsr_peaks', 'label']
# For demonstration, we use X and y
X = df.drop('label', axis=1)
y = df['label']

# 3. Train-Test Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# 4. Scaling
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# 5. Model 1: Random Forest
rf_model = RandomForestClassifier(n_estimators=100)
rf_model.fit(X_train_scaled, y_train)
rf_pred = rf_model.predict(X_test_scaled)

# 6. Evaluation
print("--- Random Forest Performance ---")
print(classification_report(y_test, rf_pred))
print(f"Accuracy: {accuracy_score(y_test, rf_pred):.4f}")

# 7. Feature Importance Visualization
plt.figure(figsize=(10,6))
sns.barplot(x=rf_model.feature_importances_, y=X.columns)
plt.title('Gini Importance of Features')
plt.show()
  `.trim();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    alert('Code copied to clipboard!');
  };

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
        </div>
        <button 
          onClick={copyToClipboard}
          className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-2 transition-colors"
        >
          <Copy size={14} />
          Copy Code
        </button>
      </div>
      <div className="p-6 overflow-x-auto">
        <pre className="mono text-sm leading-relaxed text-blue-300">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

export default PythonCodeBlock;
