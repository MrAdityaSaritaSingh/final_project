import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Building2, FileText, Scale, Target } from 'lucide-react';
import { toast } from 'sonner';
import { workbooksApi, type CreateWorkbookPayload } from '../../api/workbooksApi';

const FINANCIAL_YEARS = ['FY 2024-25', 'FY 2023-24', 'FY 2022-23', 'FY 2021-22', 'FY 2020-21'];
const ASSESSMENT_YEARS = ['AY 2025-26', 'AY 2024-25', 'AY 2023-24', 'AY 2022-23', 'AY 2021-22'];
const ENGAGEMENT_TYPES = ['Statutory Audit', 'Internal Audit', 'Tax Audit', 'Forensic Audit', 'Limited Review', 'Other'];

export default function CreateWorkbook() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateWorkbookPayload>({
    client_name: '',
    financial_year: '',
    functional_currency: 'INR',
    engagement_type: '',
    assessment_year: '',
    industry_type: '',
    reporting_framework: '',
    tax_id: '',
    materiality_threshold: undefined,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'materiality_threshold' ? (value ? parseFloat(value) : undefined) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newWorkbook = await workbooksApi.createWorkbook(formData);
      toast.success('Engagement created successfully');
      navigate(`/workbook/${newWorkbook.id}`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create engagement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center sticky top-0 z-10">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mr-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Workbooks
        </button>
        <div className="h-6 w-px bg-gray-200 mx-2"></div>
        <h1 className="text-xl text-gray-900 font-medium ml-4">Create Audit Workbook</h1>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Form Area */}
        <div className="lg:col-span-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900">Define Workbook Context</h2>
            <p className="text-sm text-gray-500 mt-2">
              This workbook will serve as the central workspace for ledger scrutiny, anomaly detection, and audit evidence gathering.
            </p>
          </div>

          <form id="create-engagement-form" onSubmit={handleSubmit} className="space-y-10">

            {/* Section 1: Engagement Details */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                <Building2 className="w-5 h-5 text-[#095859]" />
                <h3 className="text-lg font-medium text-gray-900">Engagement Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Legal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="client_name"
                    value={formData.client_name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#095859] focus:border-transparent outline-none transition-all"
                    placeholder="e.g., Acme Corporation Ltd."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Financial Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="financial_year"
                    value={formData.financial_year}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#095859] focus:border-transparent outline-none transition-all bg-white"
                  >
                    <option value="" disabled>Select Financial Year</option>
                    {FINANCIAL_YEARS.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assessment Year
                  </label>
                  <select
                    name="assessment_year"
                    value={formData.assessment_year}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#095859] focus:border-transparent outline-none transition-all bg-white"
                  >
                    <option value="">Select Assessment Year</option>
                    {ASSESSMENT_YEARS.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry Type
                  </label>
                  <input
                    name="industry_type"
                    value={formData.industry_type}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#095859] focus:border-transparent outline-none transition-all"
                    placeholder="e.g., Manufacturing, Software, Retail"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Audit Scope & Framework */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                <Target className="w-5 h-5 text-[#095859]" />
                <h3 className="text-lg font-medium text-gray-900">Audit Scope & Framework</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Engagement Type
                  </label>
                  <select
                    name="engagement_type"
                    value={formData.engagement_type}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#095859] focus:border-transparent outline-none transition-all bg-white"
                  >
                    <option value="">Select Engagement Type</option>
                    {ENGAGEMENT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reporting Framework
                  </label>
                  <input
                    name="reporting_framework"
                    value={formData.reporting_framework}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#095859] focus:border-transparent outline-none transition-all"
                    placeholder="e.g., Ind AS, IGAAP"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Materiality Threshold
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Defines the baseline threshold for flagging immaterial anomalies during automated scrutiny.
                  </p>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">#</span>
                    </div>
                    <input
                      type="number"
                      name="materiality_threshold"
                      value={formData.materiality_threshold || ''}
                      onChange={handleChange}
                      className="w-full pl-8 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#095859] focus:border-transparent outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Compliance & Currency */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                <Scale className="w-5 h-5 text-[#095859]" />
                <h3 className="text-lg font-medium text-gray-900">Compliance & Currency</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Functional Currency <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="functional_currency"
                    value={formData.functional_currency}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#095859] focus:border-transparent outline-none transition-all bg-white"
                  >
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CIN / GSTIN / PAN
                  </label>
                  <input
                    name="tax_id"
                    value={formData.tax_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#095859] focus:border-transparent outline-none transition-all"
                    placeholder="Enter Tax ID or Company Number"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#095859] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-medium text-white bg-[#095859] rounded-lg hover:bg-[#0B6B6A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#095859] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Initializing...
                  </>
                ) : (
                  'Initialize Workbook'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Preview & Status Area */}
        <div className="lg:col-span-4">
          <div className="sticky top-24">

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wider">Summary</h3>
              </div>
              <div className="p-6 space-y-6">

                {/* Client Info Preview */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Client</p>
                  <p className={`text-base font-medium ${formData.client_name ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                    {formData.client_name || 'Pending client name...'}
                  </p>
                  {formData.industry_type && (
                    <span className="inline-block mt-2 px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {formData.industry_type}
                    </span>
                  )}
                </div>

                <div className="h-px bg-gray-100"></div>

                {/* Period Info Preview */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Period</p>
                  <p className={`text-sm ${formData.financial_year ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                    {formData.financial_year || 'Pending financial year...'}
                  </p>
                </div>

                <div className="h-px bg-gray-100"></div>

                {/* Scope Info Preview */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Scope</p>
                  <p className={`text-sm ${formData.engagement_type || formData.reporting_framework ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                    {[formData.engagement_type, formData.reporting_framework].filter(Boolean).join(' • ') || 'Pending scope definition...'}
                  </p>
                </div>
              </div>
            </div>

            {/* Future Readiness Empty State */}
            <div className="mt-6 border-2 border-dashed border-gray-200 rounded-xl p-6 bg-gray-50 text-center">
              <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 mb-3 shadow-sm">
                <FileText className="w-6 h-6 text-gray-400" />
              </div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Financial Records & Evidence</h4>
              <p className="text-xs text-gray-500">
                You can upload General Ledgers, Trial Balances, and other supporting documents once the engagement is initialized.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
