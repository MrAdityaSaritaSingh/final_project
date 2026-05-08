import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { workbooksApi, type Workbook as WorkbookType } from '../../api/workbooksApi';
import RiskIntelligenceDashboard from './RiskIntelligenceDashboard';
import Dashboard from './Dashboard';
import Documentation from './Documentation';
import { EvidenceProvider } from '../context/EvidenceContext';

type TabType = 'overview' | 'investigation' | 'documentation';

export default function Workbook() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [workbook, setWorkbook] = useState<WorkbookType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchWorkbook = async () => {
      try {
        setIsLoading(true);
        const data = await workbooksApi.getWorkbook(id);
        setWorkbook(data);
      } catch (error: any) {
        console.error('Failed to load workbook:', error);
        if (error.message === 'Invalid or expired token') {
          toast.error('Your session has expired. Please log in again.');
          navigate('/login');
          return;
        }
        toast.error(error?.message || 'Failed to load workbook');
      } finally {
        setIsLoading(false);
      }
    };
    fetchWorkbook();
  }, [id]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#095859] mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading workbook...</p>
        </div>
      </div>
    );
  }

  if (!workbook) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg text-gray-900 mb-2">Workbook not found</p>
          <button
            onClick={() => navigate('/home')}
            className="text-sm text-[#095859] hover:text-[#0B6B6A]"
          >
            Back to Workbooks
          </button>
        </div>
      </div>
    );
  }

  const status = workbook.analysis_summary ? 'Completed' : 'In Progress';
  const lastModified = new Date(workbook.last_modified || new Date()).toLocaleDateString();

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Workbook Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center mb-3">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Workbooks
          </button>
        </div>

        {/* Workbook Info */}
        <div className="flex items-center gap-4 text-sm">
          <h1 className="text-lg text-gray-900 font-medium">{workbook.client_name}</h1>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600">{workbook.financial_year}</span>
          <span className="text-gray-400">|</span>
          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
            {status}
          </span>
          <span className="text-gray-400">|</span>
          <span className="text-xs text-gray-500">Last modified {lastModified}</span>
        </div>
      </div>

      {/* Fixed Top Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex-shrink-0">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-sm border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('investigation')}
            className={`px-6 py-3 text-sm border-b-2 transition-colors ${
              activeTab === 'investigation'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Investigation
          </button>
          <button
            onClick={() => setActiveTab('documentation')}
            className={`px-6 py-3 text-sm border-b-2 transition-colors ${
              activeTab === 'documentation'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Documentation
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <EvidenceProvider workbookId={workbook.id}>
        <div className="flex-1 overflow-hidden">
          {activeTab === 'overview' && (
            <RiskIntelligenceDashboard
              embedded
              workbookId={workbook.id}
              analysisSummary={workbook.analysis_summary}
              columnMappings={workbook.column_mappings}
            />
          )}
          {activeTab === 'investigation' && (
            <Dashboard embedded workbookId={workbook.id} />
          )}
          {activeTab === 'documentation' && <Documentation />}
        </div>
      </EvidenceProvider>
    </div>
  );
}
