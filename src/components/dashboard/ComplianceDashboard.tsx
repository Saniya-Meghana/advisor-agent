import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './ComplianceDashboard.css'; // We'll create this file next

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface RiskData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
  }[];
}

interface Document {
  doc_id: string;
  title: string;
  source: string;
  date: string;
  domain: string;
  risk_type: string;
  severity: string;
  download_link: string; // Assuming a download link
}

const ComplianceDashboard: React.FC = () => {
  const [riskDistribution, setRiskDistribution] = useState<RiskData>({
    labels: [],
    datasets: [],
  });
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filters, setFilters] = useState({ domain: 'All', severity: 'All', source: 'All' });

  useEffect(() => {
    // In a real application, you'd fetch this data from Supabase
    // For now, let's use mock data
    const mockRiskData: RiskData = {
      labels: ["KYC", "AML", "Digital Payments", "Lending Norms", "Cyber Security", "Foreign Exchange", "Capital Adequacy", "Consumer Protection"],
      datasets: [{
        label: "Risk Count",
        data: [12, 8, 15, 6, 9, 3, 7, 10],
        backgroundColor: "#4e79a7"
      }]
    };
    setRiskDistribution(mockRiskData);

    const mockDocuments: Document[] = [
      {
        doc_id: "doc1", title: "RBI KYC Circular 2023", source: "RBI", date: "2023-01-15",
        domain: "Financial", risk_type: "KYC", severity: "High", download_link: "#"
      },
      {
        doc_id: "doc2", title: "GDPR Article 5 Compliance", source: "GDPR", date: "2018-05-25",
        domain: "Data Privacy", risk_type: "Data Handling", severity: "High", download_link: "#"
      },
      {
        doc_id: "doc3", title: "SOX Section 302 Requirements", source: "SOX", date: "2002-07-30",
        domain: "Corporate Governance", risk_type: "Reporting", severity: "Medium", download_link: "#"
      },
      {
        doc_id: "doc4", title: "RBI Digital Payments Guidelines", source: "RBI", date: "2023-03-10",
        domain: "Financial", risk_type: "Digital Payments", severity: "Medium", download_link: "#"
      },
      {
        doc_id: "doc5", title: "RBI Lending Norms Update", source: "RBI", date: "2023-04-01",
        domain: "Financial", risk_type: "Lending Norms", severity: "Low", download_link: "#"
      },
    ];
    setDocuments(mockDocuments);
  }, []);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const filteredDocuments = documents.filter(doc => {
    return (filters.domain === 'All' || doc.domain === filters.domain) &&
           (filters.severity === 'All' || doc.severity === filters.severity) &&
           (filters.source === 'All' || doc.source === filters.source);
  });

  return (
    <div className="compliance-dashboard">
      <h1>Compliance Dashboard</h1>

      <section className="risk-distribution-chart card">
        <h2>Risk Distribution Across Domains</h2>
        {riskDistribution.labels.length > 0 ? (
          <Bar data={riskDistribution} options={{ responsive: true, plugins: { legend: { position: 'top' as const }, title: { display: true, text: 'Risk Type Distribution' } } }} />
        ) : (
          <p>Loading chart data...</p>
        )}
      </section>

      <section className="document-explorer card">
        <h2>Document Explorer</h2>
        <div className="filters">
          <select name="domain" onChange={handleFilterChange} value={filters.domain}>
            <option value="All">All Domains</option>
            <option value="Financial">Financial</option>
            <option value="Data Privacy">Data Privacy</option>
            <option value="Corporate Governance">Corporate Governance</option>
          </select>
          <select name="severity" onChange={handleFilterChange} value={filters.severity}>
            <option value="All">All Severities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select name="source" onChange={handleFilterChange} value={filters.source}>
            <option value="All">All Sources</option>
            <option value="RBI">RBI</option>
            <option value="GDPR">GDPR</option>
            <option value="SOX">SOX</option>
          </select>
        </div>
        <div className="document-list">
          {filteredDocuments.length > 0 ? (
            filteredDocuments.map(doc => (
              <div key={doc.doc_id} className="document-item">
                <h3>{doc.title}</h3>
                <p><strong>Source:</strong> {doc.source}</p>
                <p><strong>Date:</strong> {doc.date}</p>
                <p><strong>Domain:</strong> {doc.domain}</p>
                <p><strong>Risk Type:</strong> <span className={`risk-tag ${doc.risk_type.toLowerCase().replace(/\s/g, '-')}`}>{doc.risk_type}</span></p>
                <p><strong>Severity:</strong> <span className={`severity-tag ${doc.severity.toLowerCase()}`}>{doc.severity}</span></p>
                <a href={doc.download_link} target="_blank" rel="noopener noreferrer">Download</a>
              </div>
            ))
          ) : (
            <p>No documents found matching the filters.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default ComplianceDashboard;
