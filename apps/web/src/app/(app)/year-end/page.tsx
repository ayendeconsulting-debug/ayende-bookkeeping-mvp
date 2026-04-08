import { YearEndClient } from '@/components/year-end-client';

export default function YearEndPage() {
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 6 }, (_, i) => currentYear - i);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Year-End Assistant</h1>
        <p className="text-sm text-gray-500 mt-1">
          AI-powered year-end analysis â€” executive summary, revenue insights, expense breakdown, and action items.
        </p>
      </div>
      <YearEndClient availableYears={availableYears} />
    </div>
  );
}

