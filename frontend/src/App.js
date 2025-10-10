import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      setMessage('Please select one or more files to analyze.');
      return;
    }

    setLoading(true);
    setMessage('');
    setResults(null);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post('http://localhost:8000/upload_documents/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResults(response.data);
      setMessage(response.data.message || 'Analysis complete.');
    } catch (error) {
      console.error('Error analyzing documents:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to analyze documents. Please check the console.';
      setMessage(errorMessage);
    }

    setLoading(false);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>AI-Powered Compliance Advisor</h1>
        <p>Upload compliance documents (PDFs) to dynamically identify risks, generate reports, and get actionable insights.</p>

        <div className="upload-section">
          <label className="file-input">
            <input type="file" multiple onChange={handleFileChange} accept=".pdf" />
            {files.length === 0 ? 
              'Click to select documents' : 
              `${files.length} file(s) selected`}
          </label>
          
          {files.length > 0 && (
            <div className="file-list">
              <p>Selected files:</p>
              <ul>
                {files.map((file, index) => (
                  <li key={index}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button onClick={handleAnalyze} disabled={loading || files.length === 0} className="analyze-button">
          {loading ? 'Analyzing...' : 'Analyze Documents'}
        </button>

        {loading && <div className="loading-indicator">Processing documents, please wait...</div>}
        {message && <div className="message">{message}</div>}

        {results && (
          <div className="results-section">
            <h2>Analysis Results</h2>
            <div className="pdf-links">
              <div className="pdf-category">
                <h3>Summary Reports</h3>
                <ul>
                  {results.summary_pdfs.map((file, index) => (
                    <li key={index}>
                      <a href={`http://localhost:8000/${file}`} target="_blank" rel="noopener noreferrer">
                        {file.split('/').pop()}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pdf-category">
                <h3>Detailed Risk Reports</h3>
                <ul>
                  {results.risk_pdfs.map((file, index) => (
                    <li key={index}>
                      <a href={`http://localhost:8000/${file}`} target="_blank" rel="noopener noreferrer">
                        {file.split('/').pop()}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
