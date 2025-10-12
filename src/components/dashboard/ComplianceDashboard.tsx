import React, { useEffect, useState, useMemo } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { createClient } from '@supabase/supabase-js';
import './ComplianceDashboard.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Initialize Supabase Client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Interfaces ---
interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string | string[];
  }[];
}

interface PieChartData {
    labels: string[];
    datasets: {
      data: number[];
      backgroundColor: string[];
      hoverBackgroundColor: string[];
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
  compliance_score?: number;
  download_link?: string;
}

const ComplianceDashboard: React.FC = () => {
  // --- State ---
  const [documents, setDocuments] = useState<Document[]>([]);
  const [riskDistribution, setRiskDistribution] = useState<ChartData>({ labels: [], datasets: [] });
  const [scoreDistribution, setScoreDistribution] = useState<ChartData>({ labels: [], datasets: [] });
  const [typeBreakdown, setTypeBreakdown] = useState<PieChartData>({ labels: [], datasets: [] });
  const [filters, setFilters] = useState({
    domain: 'All',
    severity: 'All',
    source: 'All',
    startDate: '',
    endDate: '',
  });

  // --- Data Fetching Effect ---
  useEffect(() => {
    const fetchDocuments = async () => {
      let query = supabase.from('compliance_reports').select('*');

      // Apply filters
      if (filters.domain !== 'All') query = query.eq('domain', filters.domain);
      if (filters.severity !== 'All') query = query.eq('severity', filters.severity);
      if (filters.source !== 'All') query = query.eq('source', filters.source);
      if (filters.startDate) query = query.gte('date', filters.startDate);
      if (filters.endDate) query = query.lte('date', filters.endDate);

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching documents:', error);
        return;
      }
      setDocuments(data || []);
    };

    fetchDocuments();
  }, [filters]);

  // --- Data Processing for Charts ---
  useEffect(() => {
    // Risk Distribution (Bar Chart)
    const riskCounts = documents.reduce((acc, doc) => {
      acc[doc.risk_type] = (acc[doc.risk_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    setRiskDistribution({
      labels: Object.keys(riskCounts),
      datasets: [{
        label: 'Number of Documents by Risk Type',
        data: Object.values(riskCounts),
        backgroundColor: '#4e79a7',
      }],
    });

    // Score Distribution (Histogram-style Bar Chart)
    const scoreBins = documents.reduce((acc, doc) => {
        const score = doc.compliance_score || 0;
        if (score <= 20) acc['0-20']++;
        else if (score <= 40) acc['21-40']++;
        else if (score <= 60) acc['41-60']++;
        else if (score <= 80) acc['61-80']++;
        else acc['81-100']++;
        return acc;
    }, { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 });

    setScoreDistribution({
        labels: Object.keys(scoreBins),
        datasets: [{
            label: 'Compliance Score Distribution',
            data: Object.values(scoreBins),
            backgroundColor: '#f28e2c',
        }],
    });

    // Document Type (Domain) Breakdown (Pie Chart)
    const domainCounts = documents.reduce((acc, doc) => {
        acc[doc.domain] = (acc[doc.domain] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    setTypeBreakdown({
        labels: Object.keys(domainCounts),
        datasets: [{
            data: Object.values(domainCounts),
            backgroundColor: ['#e15759', '#76b7b2', '#59a14f', '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'],
            hoverBackgroundColor: ['#d14749', '#66a7a2', '#49913f', '#ddb939', '#9f6a91', '#ef8d97', '#8c654f', '#aab0ab'],
        }],
    });

  }, [documents]);

  // --- Event Handlers ---
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const filteredDocuments = useMemo(() => documents, [documents]);

  return (
    <div className="compliance-dashboard">
      <h1>Compliance Dashboard</h1>

      <div className="charts-grid">
        <section className="chart-card card">
          <h2>Risk Distribution</h2>
          <Bar data={riskDistribution} options={{ responsive: true, maintainAspectRatio: false }} />
        </section>
        <section className="chart-card card">
          <h2>Compliance Score Distribution</h2>
          <Bar data={scoreDistribution} options={{ responsive: true, maintainAspectRatio: false }} />
        </section>
        <section className="chart-card card">
          <h2>Document Domain Breakdown</h2>
          <div className="pie-chart-container">
             <Pie data={typeBreakdown} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </section>
      </div>

      <section className="document-explorer card">
        <h2>Document Explorer</h2>
        <div className="filters">
          <input type="date" name="startDate" onChange={handleFilterChange} value={filters.startDate} />
          <input type="date" name="endDate" onChange={handleFilterChange} value={filters.endDate} />
          <select name="domain" onChange={handleFilterChange} value={filters.domain}>
            <option value="All">All Domains</option>
            <option value="Financial">Financial</option>
            <option value="Data Privacy">Data Privacy</option>
          </select>
          <select name="severity" onChange={handleFilterChange} value={filters.severity}>
             <option value="All">All Severities</option>
             <option value="High">High</option>
             <option value="Medium">Medium</option>
             <option value="Low">Low</option>
           </select>
        </div>
        <div className="document-list">
          {filteredDocuments.length > 0 ? (
            filteredDocuments.map(doc => (
              <div key={doc.doc_id} className="document-item">
                <h3>{doc.title}</h3>
                <p><strong>Source:</strong> {doc.source} | <strong>Date:</strong> {new Date(doc.date).toLocaleDateString()}</p>
                <p><strong>Risk Type:</strong> <span className={`risk-tag`}>{doc.risk_type}</span> | <strong>Severity:</strong> <span className={`severity-tag ${doc.severity?.toLowerCase()}`}>{doc.severity}</span></p>
                {doc.compliance_score && <p><strong>Compliance Score:</strong> {doc.compliance_score}</p>}
                <a href={doc.download_link} target="_blank" rel="noopener noreferrer">Download Original</a>
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
