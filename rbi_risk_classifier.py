import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
import re

# 1. Mock Data Preparation
# In a real scenario, you would fetch and parse actual RBI circulars.
# Here, we create a small, synthetic dataset for demonstration.
data = {
    "text": [
        "Circular on KYC norms for financial institutions, strict adherence required.",
        "New guidelines for digital payment security, focusing on fraud prevention.",
        "Revised lending norms for commercial banks, emphasizing priority sector lending.",
        "Updates on anti-money laundering (AML) regulations, enhanced due diligence.",
        "Framework for grievance redressal mechanisms in banking, consumer protection.",
        "Instructions on cyber security framework for cooperative banks.",
        "Regulation on microfinance institutions, interest rate caps and transparency.",
        "Circular regarding foreign exchange management, reporting requirements.",
        "Measures to combat illicit financial flows, international cooperation.",
        "Policy on capital adequacy for banks, Basel III implementation."
    ],
    "risk_type": [
        "KYC/AML",
        "Digital Payments/Fraud",
        "Lending/Credit",
        "KYC/AML",
        "Consumer Protection",
        "Cyber Security",
        "Lending/Credit",
        "Foreign Exchange",
        "KYC/AML",
        "Capital Adequacy"
    ]
}
df = pd.DataFrame(data)

# 2. Text Preprocessing Function
def preprocess_text(text):
    text = text.lower()
    text = re.sub(r'[^a-z\s]', '', text) # Remove punctuation and numbers
    text = re.sub(r'\s+', ' ', text).strip() # Remove extra spaces
    return text

df['processed_text'] = df['text'].apply(preprocess_text)

# 3. Feature Extraction (TF-IDF)
vectorizer = TfidfVectorizer(max_features=1000) # Limit features for simplicity
X = vectorizer.fit_transform(df['processed_text'])
y = df['risk_type']

# Split data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42, stratify=y)

# 4. Model Training (RandomForestClassifier)
classifier = RandomForestClassifier(n_estimators=100, random_state=42)
classifier.fit(X_train, y_train)

# 5. Model Evaluation
y_pred = classifier.predict(X_test)
print("Classification Report:")
print(classification_report(y_test, y_pred, zero_division=0))

print("\\nExample Prediction:")
new_circular_text = "RBI circular on new rules for digital banking transactions and security."
processed_new_text = preprocess_text(new_circular_text)
new_text_vectorized = vectorizer.transform([processed_new_text])
predicted_risk = classifier.predict(new_text_vectorized)
print(f"Text: '{new_circular_text}'")
print(f"Predicted Risk Type: {predicted_risk[0]}")

new_circular_text_2 = "Revised guidelines for credit disbursement by commercial banks."
processed_new_text_2 = preprocess_text(new_circular_text_2)
new_text_vectorized_2 = vectorizer.transform([processed_new_text_2])
predicted_risk_2 = classifier.predict(new_text_vectorized_2)
print(f"\\nText: '{new_circular_text_2}'")
print(f"Predicted Risk Type: {predicted_risk_2[0]}")
