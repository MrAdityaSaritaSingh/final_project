import { ArrowRight, Settings, Eye, Upload } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useState, useMemo, useEffect } from 'react';
import DatasetReviewPanel from '../components/DatasetReviewPanel';
import { useWorkbook } from '../context/WorkbookContext';
import { workbooksApi } from '../../api/workbooksApi';

interface RiskIntelligenceDashboardProps {
  embedded?: boolean;
  workbookId?: string;
  analysisSummary?: Record<string, any>;
  columnMappings?: Record<string, string>;
}

export default function RiskIntelligenceDashboard({
  embedded = false,
  workbookId,
  analysisSummary,
  columnMappings = {},
}: RiskIntelligenceDashboardProps) {
  const navigate = useNavigate();
  const { workbookData } = useWorkbook();
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [aggregations, setAggregations] = useState<any>(null);

  useEffect(() => {
    if (!workbookId || !analysisSummary) return;

    const fetchAggregations = async () => {
      try {
        const data = await workbooksApi.getAggregations(workbookId);
        setAggregations(data);
      } catch (error) {
        console.error('Failed to fetch aggregations:', error);
      }
    };

    fetchAggregations();
  }, [workbookId, analysisSummary]);

  // Derive KPI cards from real analysis summary AND aggregations
  const kpiCards = useMemo(() => {
    const summary = analysisSummary || {};
    const totalEntries = summary.total_entries || 0;
    const totalFlagged = summary.total_flagged || 0;
    const pctFlagged = summary.pct_flagged || 0;

    const highRisk = aggregations?.risk_buckets?.high?.count ?? 0;
    const mediumRisk = aggregations?.risk_buckets?.medium?.count ?? 0;
    const lowRisk = aggregations?.risk_buckets?.low?.count ?? 0;
    
    const highExposure = aggregations?.risk_buckets?.high?.exposure ?? 0;
    const mediumExposure = aggregations?.risk_buckets?.medium?.exposure ?? 0;
    const lowExposure = aggregations?.risk_buckets?.low?.exposure ?? 0;

    const formatCr = (val: number) => {
        if (val === 0) return '₹0 Cr';
        // Convert to Crores (1 Cr = 1,00,00,000)
        const cr = val / 10000000;
        return `₹${cr.toFixed(1)} Cr`;
    }

    return [
      { label: 'Total Transactions', value: totalEntries.toLocaleString(), subtitle: '' },
      { label: 'Total Flagged', value: totalFlagged.toLocaleString(), subtitle: `${pctFlagged}% flagged` },
      {
        label: 'High Risk',
        value: String(highRisk),
        subtitle: formatCr(highExposure),
        indicator: 'red',
      },
      {
        label: 'Medium Risk',
        value: String(mediumRisk),
        subtitle: formatCr(mediumExposure),
        indicator: 'amber',
      },
      {
        label: 'Low Risk',
        value: String(lowRisk),
        subtitle: formatCr(lowExposure),
        indicator: 'green',
      },
    ];
  }, [analysisSummary, aggregations]);

  // Derive control points from aggregations
  const controlPoints = useMemo(() => {
    if (!aggregations || !aggregations.controls || aggregations.controls.length === 0) {
      return [
        { name: 'Manual Entry', transactions: 0, exposure: '₹0 Cr', status: 'Active' },
        { name: 'Unusual Amount', transactions: 0, exposure: '₹0 Cr', status: 'Active' },
        { name: 'Sequence Gap', transactions: 0, exposure: '₹0 Cr', status: 'Active' },
        { name: 'Suspicious Keyword', transactions: 0, exposure: '₹0 Cr', status: 'Inactive' },
        { name: 'Outlier Anomaly', transactions: 0, exposure: '₹0 Cr', status: 'Active' },
        { name: 'Period End Transaction', transactions: 0, exposure: '₹0 Cr', status: 'Active' },
        { name: 'Weekend Entry', transactions: 0, exposure: '₹0 Cr', status: 'Active' },
        { name: 'Round Number Pattern', transactions: 0, exposure: '₹0 Cr', status: 'Active' },
      ];
    }

    return aggregations.controls.map((cat: any) => ({
      name: cat.category || 'Unknown',
      transactions: cat.count || 0,
      exposure: `₹${(cat.exposure / 10000000).toFixed(1)} Cr`,
      status: 'Active',
    }));
  }, [aggregations]);

  const riskScore = analysisSummary?.pct_flagged || 0;
  const riskLevel = riskScore >= 50 ? 'High Risk' : riskScore >= 20 ? 'Moderate Risk' : 'Low Risk';

  return (
    <div className={`bg-gray-50 ${embedded ? 'h-full overflow-auto' : 'min-h-screen'}`}>
      {showReviewPanel && (
        <DatasetReviewPanel
          onClose={() => setShowReviewPanel(false)}
          workbookId={workbookId}
          columnMappings={workbookData?.columnMappings || columnMappings}
        />
      )}

      {/* Header */}
      {!embedded && (
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl text-gray-900 mb-1">Risk Intelligence Dashboard</h1>
              <p className="text-sm text-gray-500">Comprehensive risk analysis of uploaded ledger</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-5 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                Investigate Transactions
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        {/* Dataset Management Actions - Only visible when embedded */}
        {embedded && (
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg text-gray-900 font-medium">Risk Overview</h2>
              <p className="text-sm text-gray-500 mt-1">Comprehensive risk analysis of uploaded ledger</p>
            </div>
            <div className="flex gap-3">
              {analysisSummary && (
                <>
                  <button
                    onClick={() => setShowReviewPanel(true)}
                    className="px-4 py-2 text-sm bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Review Source Data
                  </button>
                  <button
                    onClick={() => navigate(`/data-ingestion?mode=replace&workbookId=${workbookId}`)}
                    className="px-4 py-2 text-sm bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Replace Dataset
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {!analysisSummary ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center mt-8">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-[#095859]" />
            </div>
            <h3 className="text-lg text-gray-900 font-medium mb-2">No Data Ingested</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
              Upload your financial ledger dataset to begin the risk intelligence analysis. The system will automatically detect anomalies, categorize risks, and identify potential control points.
            </p>
            <button
              onClick={() => navigate(`/data-ingestion?workbookId=${workbookId}`)}
              className="px-6 py-3 text-sm bg-[#095859] text-white rounded-lg hover:bg-[#0B6B6A] transition-colors inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Dataset Now
            </button>
          </div>
        ) : (
          <>
            {/* Risk Score Banner */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">Overall Risk Score</p>
            <p className="text-3xl text-gray-900 font-medium">{riskScore}%</p>
            <p className={`text-sm mt-1 ${
              riskScore >= 50 ? 'text-red-600' : riskScore >= 20 ? 'text-amber-600' : 'text-green-600'
            }`}>
              {riskLevel}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Flagged by Rules</p>
            <p className="text-lg text-gray-900">{analysisSummary?.rule_flagged || 0}</p>
            <p className="text-xs text-gray-500 mt-2">Flagged by ML</p>
            <p className="text-lg text-gray-900">{analysisSummary?.ml_flagged || 0}</p>
          </div>
        </div>

        {/* Executive KPI Cards */}
        <div className="grid grid-cols-5 gap-6 mb-8">
          {kpiCards.map((card, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 relative">
              {card.indicator && (
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
                    card.indicator === 'red' ? 'bg-red-500' :
                    card.indicator === 'amber' ? 'bg-amber-500' :
                    'bg-green-500'
                  }`}
                />
              )}
              <p className="text-xs text-gray-500 mb-2">{card.label}</p>
              <p className="text-2xl text-gray-900 mb-1">{card.value}</p>
              {card.subtitle && (
                <p className="text-sm text-gray-600">{card.subtitle}</p>
              )}
            </div>
          ))}
        </div>

        {/* Control Point Library */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
            <div>
              <h2 className="text-base text-gray-900 mb-1">Control Point Library</h2>
              <p className="text-xs text-gray-500">Risk detection controls applied to this ledger</p>
            </div>
            <button className="px-4 py-2 text-sm bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Modify Controls
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs text-gray-600">Control Name</th>
                  <th className="px-6 py-3 text-right text-xs text-gray-600">Triggered Transactions</th>
                  <th className="px-6 py-3 text-right text-xs text-gray-600">Exposure</th>
                  <th className="px-6 py-3 text-center text-xs text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {controlPoints.map((control: any, index: number) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">{control.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 text-right">
                      {control.transactions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 text-right">{control.exposure}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs ${
                          control.status === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {control.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

