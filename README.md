# ComplianceAgent

ComplianceAgent is a tool designed to help organizations manage, analyze, and automate compliance tasks such as AML (Anti-Money Laundering) and GDPR (General Data Protection Regulation) requirements. It leverages modern NLP and vector search technologies for document analysis and compliance automation.

## Features

- **Document Chunking:** Splits compliance documents into manageable pieces for analysis.
- **Embeddings & Vector Store:** Uses Sentence Transformers and ChromaDB for semantic search and retrieval.
- **Sample Policies:** Includes sample AML and GDPR policies for demonstration.
- **Easy Integration:** Modular codebase for extending to other compliance frameworks.

## Getting Started

### Prerequisites

- Python 3.10 (recommended: use [pyenv](https://github.com/pyenv/pyenv))
- [pip](https://pip.pypa.io/en/stable/)
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository:**

    ```bash
    git clone https://github.com/Saniya-Meghana/ComplianceAgent.git
    cd ComplianceAgent
    ```

2. **Set up Python environment:**

    ```bash
    pyenv shell 3.10.14
    python -m venv venv
    source venv/bin/activate
    ```

3. **Install dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

    *(If `requirements.txt` does not exist, install main dependencies manually:)*

    ```bash
    pip install sentence-transformers chromadb langchain
    ```

### Usage

1. **Prepare your compliance documents:**
    - Place your documents in the `docs/` directory (see `docs/sample_compliance.txt` for format).

2. **Run the training script:**

    ```bash
    python train.ipynb
    ```

    *(Or open `train.ipynb` in Jupyter Notebook and run all cells.)*

3. **Search or analyze compliance content:**
    - Extend the code to add search, Q&A, or compliance checks as needed.

### Project Structure

```
ComplianceAgent/
├── docs/
│   └── sample_compliance.txt
├── train.ipynb
├── README.md
└── ...
```

- `docs/`: Contains sample and user-provided compliance documents.
- `train.ipynb`: Main notebook for embedding and storing compliance content.
- `README.md`: Project documentation.

### Example: Sample Compliance Document

See [`docs/sample_compliance.txt`](docs/sample_compliance.txt):

```
AML Policy (Sample):
Cash deposits equal to or above $10,000 require enhanced due diligence (EDD).
EDD includes source-of-funds verification and a customer declaration.
Suspicious activity must be reported per SAR procedures.

GDPR (Sample):
Personal data must be processed lawfully, fairly, and transparently (Article 5).
Special categories of personal data require explicit consent unless another legal basis applies (Article 9).
Data subjects have the right to access and rectify their data.
```

## Contributing

Contributions are welcome! Please open issues or pull requests for improvements or bug fixes.

## License

This project is licensed under the MIT License.

## Contact

For questions or support, please contact [Saniya-Meghana](https://github.com/Saniya-Meghana).
