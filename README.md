<<<<<<< HEAD
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
=======
# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/ef01753e-54ad-45f2-ba74-c0eca1042939

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/ef01753e-54ad-45f2-ba74-c0eca1042939) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/ef01753e-54ad-45f2-ba74-c0eca1042939) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
>>>>>>> b7f9e04 (Use tech stack vite_react_shadcn_ts_20250728_minor)
