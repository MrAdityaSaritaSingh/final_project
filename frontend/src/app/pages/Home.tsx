import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Plus, ChevronDown, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { workbooksApi } from '../../api/workbooksApi';
import { useAuth } from '../context/AuthContext';
interface WorkbookDisplay {
  id: string;
  clientName: string;
  financialYear: string;
  status: 'Draft' | 'In Progress' | 'Completed';
  lastModified: string;
  riskScore?: number;
}
export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [workbooks, setWorkbooks] = useState<WorkbookDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [workbookToDelete, setWorkbookToDelete] = useState<WorkbookDisplay | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchWorkbooks = async () => {
      try {
        setIsLoading(true);
        const data = await workbooksApi.listWorkbooks();
        const mapped: WorkbookDisplay[] = data.map((wb) => ({
          id: wb.id,
          clientName: wb.client_name,
          financialYear: wb.financial_year,
          status: wb.analysis_summary ? 'Completed' : 'In Progress',
          lastModified: wb.last_modified ? new Date(wb.last_modified).toLocaleDateString() : '—',
          riskScore: wb.analysis_summary
            ? Math.round(
              ((wb.analysis_summary.total_flagged || 0) /
                (wb.analysis_summary.total_entries || 1)) *
              100
            )
            : undefined,
        }));
        setWorkbooks(mapped);
      } catch (error: any) {
        console.error('Failed to load workbooks:', error);
        if (error.message === 'Invalid or expired token') {
          toast.error('Your session has expired. Please log in again.');
          navigate('/login');
          return;
        }
        console.error('Failed to load workbooks:', error);
        if (error.message === 'Invalid or expired token') {
          toast.error('Your session has expired. Please log in again.');
          navigate('/login');
          return;
        }
        toast.error(error?.message || 'Failed to load workbooks');
      } finally {
        setIsLoading(false);
      }
    };
    fetchWorkbooks();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-700';
      case 'In Progress':
        return 'bg-[#A7C7C6] text-[#074645]';
      case 'Completed':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getRiskScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 70) return 'text-red-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-green-600';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteWorkbook = async () => {
    if (!workbookToDelete) return;

    setIsDeleting(true);
    try {
      await workbooksApi.deleteWorkbook(workbookToDelete.id);
      setWorkbooks((prev) => prev.filter((w) => w.id !== workbookToDelete.id));
      toast.success('Workbook deleted');
      setWorkbookToDelete(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete workbook');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl text-gray-900">General Ledger Scrutiny</h1>
            <p className="text-sm text-gray-600 mt-1">Enterprise Audit Intelligence Platform</p>
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#095859] flex items-center justify-center text-white text-sm font-medium">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="text-left">
                <div className="text-sm text-gray-900">{user?.name || 'User'}</div>
                <div className="text-xs text-gray-500">{user?.email || ''}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-gray-50"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          {/* Top Section */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl text-gray-900 mb-1">Workbooks</h2>
              <p className="text-sm text-gray-600">Manage audit engagement workbooks</p>
            </div>
            <button
              onClick={() => navigate('/create-workbook')}
              className="px-4 py-2 bg-[#095859] text-white rounded-lg hover:bg-[#0B6B6A] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Audit Workbook
            </button>
          </div>

          {/* Workbooks Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs text-gray-600">Client Name</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-600">Financial Year</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-600">Status</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-600">Last Modified</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-600">Risk Score</th>
                  <th className="px-6 py-3 text-right text-xs text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#095859] mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Loading workbooks...</p>
                    </td>
                  </tr>
                ) : workbooks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                      No workbooks found. Create your first workbook to get started.
                    </td>
                  </tr>
                ) : (
                  workbooks.map((workbook) => (
                    <tr
                      key={workbook.id}
                      onClick={() => navigate(`/workbook/${workbook.id}`)}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">{workbook.clientName}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{workbook.financialYear}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs ${getStatusColor(workbook.status)}`}>
                          {workbook.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{workbook.lastModified}</td>
                      <td className="px-6 py-4 text-sm">
                        {workbook.riskScore !== undefined ? (
                          <span className={`font-medium ${getRiskScoreColor(workbook.riskScore)}`}>
                            {workbook.riskScore}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setWorkbookToDelete(workbook);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Workbook"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>


      {/* Delete Confirmation Modal */}
      {workbookToDelete && (
        <div className="fixed inset-0 z-50 backdrop-blur-md bg-white bg-opacity-10 flex items-center justify-center p-6">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg text-gray-900">Delete Workbook?</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600">
                Are you sure you want to remove <span className="font-semibold text-gray-800">"{workbookToDelete.clientName}"</span>?
                You can contact support if you need to recover it later.
              </p>
              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setWorkbookToDelete(null)}
                  className="flex-1 px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteWorkbook()}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

