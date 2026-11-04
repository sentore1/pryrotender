'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface QuoteItem {
  name: string;
  description?: string;
  unit?: string;
  qty?: number;
}

interface ResponseItem {
  name: string;
  unit?: string;
  unit_price: string;
  qty: number;
  total: number;
}

interface Company {
  company_name?: string;
  logo_url?: string;
  signature_url?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
}

interface QuoteRequest {
  id: string;
  token: string;
  title: string;
  items: QuoteItem[];
  status: string;
}

export default function SupplierQuotePage({ params }: { params: { token: string } }) {
  const { token } = params;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [quoteRequest, setQuoteRequest] = useState<QuoteRequest | null>(null);
  const [company, setCompany] = useState<Company | null>(null);

  const [supplierName, setSupplierName] = useState('');
  const [responseItems, setResponseItems] = useState<ResponseItem[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/supplier-quote/submit?token=${token}`);
        const data = await res.json();
        if (!res.ok || !data.success) { setNotFound(true); setLoading(false); return; }

        setQuoteRequest(data.quoteRequest);
        setCompany(data.company);

        if (data.quoteRequest.status === 'submitted') {
          setAlreadySubmitted(true);
          setLoading(false);
          return;
        }

        // Pre-fill response items from the request
        setResponseItems(
          (data.quoteRequest.items as QuoteItem[]).map(item => ({
            name: item.name,
            unit: item.unit || '',
            unit_price: '',
            qty: item.qty || 1,
            total: 0,
          }))
        );
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    }
    load();
  }, [token]);

  const updateItem = (idx: number, field: keyof ResponseItem, value: string | number) => {
    setResponseItems(prev => {
      const updated = [...prev];
      const item = { ...updated[idx], [field]: value };
      // Recalculate total whenever unit_price or qty changes
      const price = parseFloat(String(item.unit_price)) || 0;
      const qty = Number(item.qty) || 0;
      item.total = price * qty;
      updated[idx] = item;
      return updated;
    });
  };

  const grandTotal = responseItems.reduce((sum, i) => sum + (i.total || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate all prices are filled
    const missing = responseItems.filter(i => i.unit_price === '' || isNaN(parseFloat(i.unit_price)));
    if (missing.length) {
      setError(`Please enter a unit price for: ${missing.map(i => i.name).join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/supplier-quote/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          supplierName: supplierName.trim(),
          items: responseItems.map(i => ({
            ...i,
            unit_price: parseFloat(i.unit_price) || 0,
            total: (parseFloat(i.unit_price) || 0) * (Number(i.qty) || 1),
          })),
          notes,
        }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || 'Submission failed. Please try again.'); setSubmitting(false); return; }
      setSubmitSuccess(true);
    } catch {
      setError('Network error. Please try again.');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Link not found</h1>
          <p className="text-sm text-gray-500">This quote request link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Already submitted</h1>
          <p className="text-sm text-gray-500">Your prices for this quote request have already been submitted. Thank you!</p>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Prices submitted!</h1>
          <p className="text-sm text-gray-500">Thank you. The requesting company has been notified and will review your prices shortly.</p>
        </div>
      </div>
    );
  }

  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Company header card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-start gap-4">
            {company?.logo_url && (
              <img
                src={company.logo_url}
                alt="Company Logo"
                className="h-14 w-auto object-contain shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              {company?.company_name && (
                <h2 className="text-base font-bold text-gray-900">{company.company_name}</h2>
              )}
              {company?.company_address && (
                <p className="text-xs text-gray-500 mt-0.5">{company.company_address}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-1">
                {company?.company_phone && (
                  <span className="text-xs text-gray-500">📞 {company.company_phone}</span>
                )}
                {company?.company_email && (
                  <span className="text-xs text-gray-500">✉ {company.company_email}</span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-gray-400">Date</p>
              <p className="text-xs font-medium text-gray-700">{dateStr}</p>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <h1 className="text-lg font-bold text-gray-900 mb-1">
            📋 {quoteRequest?.title || 'Price Quotation Request'}
          </h1>
          <p className="text-sm text-gray-500">
            We would like to know if you carry the following items and their current prices.
            Please fill in the unit price for each item below and submit.
          </p>
        </div>

        {/* Quote form */}
        <form onSubmit={handleSubmit}>
          {/* Supplier name */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4 shadow-sm">
            <label className="text-xs font-semibold text-gray-600 block mb-1 uppercase tracking-wide">
              Your Company / Name <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={supplierName}
              onChange={e => setSupplierName(e.target.value)}
              placeholder="e.g. ABC Supplies Ltd"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Items table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">Items Requested</h3>
              <p className="text-xs text-gray-400 mt-0.5">Fill in the unit price (RWF) for each item</p>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Item</th>
                    <th className="px-4 py-3 text-left font-semibold">Unit</th>
                    <th className="px-4 py-3 text-center font-semibold">Qty</th>
                    <th className="px-4 py-3 text-right font-semibold">Unit Price (RWF)</th>
                    <th className="px-4 py-3 text-right font-semibold">Total (RWF)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {responseItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{item.name}</p>
                        {quoteRequest?.items[idx]?.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{quoteRequest.items[idx].description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{item.unit || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={e => updateItem(idx, 'qty', Number(e.target.value))}
                          className="w-16 text-center px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                          placeholder="0"
                          className="w-full text-right px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700">
                        {item.total > 0 ? item.total.toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-blue-50 border-t-2 border-blue-100">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-sm font-bold text-gray-700 text-right">
                      Grand Total (RWF):
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700">
                      {grandTotal.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-100">
              {responseItems.map((item, idx) => (
                <div key={idx} className="px-4 py-4 space-y-3">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                    {quoteRequest?.items[idx]?.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{quoteRequest.items[idx].description}</p>
                    )}
                    {item.unit && <p className="text-xs text-gray-500 mt-0.5">Unit: {item.unit}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Quantity</label>
                      <input
                        type="number" min="1" value={item.qty}
                        onChange={e => updateItem(idx, 'qty', Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Unit Price (RWF)</label>
                      <input
                        type="number" min="0" step="0.01" value={item.unit_price}
                        onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                        placeholder="0"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                  {item.total > 0 && (
                    <p className="text-xs font-semibold text-blue-700 text-right">
                      Subtotal: {item.total.toLocaleString()} RWF
                    </p>
                  )}
                </div>
              ))}
              {grandTotal > 0 && (
                <div className="px-4 py-3 bg-blue-50 flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">Grand Total:</span>
                  <span className="text-sm font-bold text-blue-700">{grandTotal.toLocaleString()} RWF</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4 shadow-sm">
            <label className="text-xs font-semibold text-gray-600 block mb-1 uppercase tracking-wide">
              Additional Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Prices valid for 30 days, delivery in 5 business days..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition text-sm"
          >
            {submitting ? 'Submitting...' : 'Submit Prices'}
          </button>

          <p className="text-center text-xs text-gray-400 mt-3">
            By submitting you confirm that the prices above are accurate and current.
          </p>
        </form>
      </div>
    </div>
  );
}
