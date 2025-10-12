
from transformers import AutoTokenizer, AutoModelForSequenceClassification, TrainingArguments, Trainer
from datasets import Dataset
import numpy as np
# import evaluate # No longer needed for custom accuracy
import os
from sklearn.metrics import accuracy_score

# Set a temporary cache directory for datasets (though we're using a dummy dataset now, good practice)
os.environ["HF_DATASETS_CACHE"] = "/tmp/hf_cache"

# 2. Choose a Pre-trained Model and Tokenizer
model_name = "bert-base-uncased"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=2) # Assuming binary classification

# 3. Prepare Your Dataset - Using a dummy in-memory dataset
dummy_data = {
    "text": [
        "This movie is great! I loved it.",
        "This is a terrible film, really bad.",
        "A fantastic experience, highly recommended.",
        "What a waste of time. So boring.",
        "Absolutely brilliant and captivating.",
        "I regret watching this. It was awful."
    ],
    "label": [1, 0, 1, 0, 1, 0] # 1 for positive, 0 for negative
}

dataset = Dataset.from_dict(dummy_data)

# Define a tokenization function
def tokenize_function(examples):
    # Ensure examples["text"] is treated as a list of strings
    text_input = examples["text"]
    if not isinstance(text_input, list):
        text_input = [text_input]
    return tokenizer(text_input, padding="max_length", truncation=True)

# Apply the tokenization
# Changed batched=False to True and adjusted tokenize_function for batching
tokenized_datasets = dataset.map(tokenize_function, batched=True)

# Rename the 'label' column to 'labels'
tokenized_datasets = tokenized_datasets.rename_columns({"label": "labels"})

# Format for PyTorch
tokenized_datasets.set_format("torch", columns=["input_ids", "attention_mask", "labels"])

# Define train and test splits (split the dummy dataset)
train_size = int(0.8 * len(tokenized_datasets))
test_size = len(tokenized_datasets) - train_size
train_dataset = tokenized_datasets.select(range(train_size))
eval_dataset = tokenized_datasets.select(range(train_size, train_size + test_size))


# 4. Define Training Arguments
training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=1,              # Reduced epochs for quicker demonstration
    per_device_train_batch_size=2,   # Reduced batch size for quicker demonstration due to small dataset
    per_device_eval_batch_size=2,
    warmup_steps=10,                 # Reduced warmup steps
    weight_decay=0.01,
    logging_dir="./logs",
    logging_steps=1,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="accuracy",
)

# 5. Set Up Evaluation Metrics (Custom accuracy calculation)
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    return {"accuracy": accuracy_score(labels, predictions)}

# 6. Create a Trainer and Train Your Model
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    compute_metrics=compute_metrics,
    tokenizer=tokenizer,
)

print("Starting model training...")
trainer.train()
print("Model training finished.")

# 7. Evaluate and Save Your Model
print("Evaluating model...")
results = trainer.evaluate()
print("Evaluation results:", results)

print("Saving model...")
trainer.save_model("./my_fine_tuned_model")
print("Model saved to ./my_fine_tuned_model")

# 8. (Optional) Push to Hugging Face Hub - uncomment and configure if needed
# trainer.push_to_hub("my-awesome-model")
