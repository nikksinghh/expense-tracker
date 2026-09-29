import { useState, useEffect, useCallback } from 'react';
import {
  BsSearch, BsPlusLg, BsTrashFill, BsPencilFill, BsFunnelFill,
  BsFilter, BsChevronLeft, BsChevronRight
} from 'react-icons/bs';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';
import { formatCurrency, formatDate, getCategoryMeta, CATEGORIES } from '../utils/helpers';
import AddExpenseModal from '../components/Expenses/AddExpenseModal';

const LIMIT = 10;

const Expenses = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editExpense, setEditExpense] = useState(null);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page, limit: LIMIT, sort: sortDir,
        ...(filterType !== 'all' && { type: filterType }),
        ...(filterCat !== 'all' && { category: filterCat }),
        ...(search && { search })
      });
      const res = await api.get(`/api/expenses?${params}`);
      setExpenses(res.data.expenses || []);
      setTotal(res.data.total || 0);
    } catch {
      toast('Failed to load expenses', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterCat, search, sortDir]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/api/expenses/${id}`);
      toast('Expense deleted', 'success');
      fetchExpenses();
    } catch {
      toast('Failed to delete expense', 'error');
    }
  };

  const handleEdit = (exp) => { setEditExpense(exp); setShowModal(true); };
  const handleAdd = () => { setEditExpense(null); setShowModal(true); };
  const handleModalClose = (refresh) => {
    setShowModal(false);
    setEditExpense(null);
    if (refresh) fetchExpenses();
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h4 style={{ margin: 0, fontWeight: 800 }}>All Expenses</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '3px 0 0' }}>{total} total expenses found</p>
        </div>
        <button className="btn-rm-primary" onClick={handleAdd} id="add-expense-btn">
          <BsPlusLg /> Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="rm-card" style={{ marginBottom: 16, padding: '14px 16px' }}>
        <div className="rm-filter-bar">
          <div className="rm-search-wrapper">
            <BsSearch className="rm-search-icon" />
            <input
              className="rm-search-input rm-input"
              placeholder="Search expenses..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              id="expense-search"
            />
          </div>

          <select className="rm-select" style={{ width: 'auto' }} value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
            <option value="all">All Types</option>
            <option value="shared">Shared</option>
            <option value="personal">Personal</option>
          </select>

          <select className="rm-select" style={{ width: 'auto' }} value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }}>
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c.label} value={c.label}>{c.emoji} {c.label}</option>)}
          </select>

          <button className="rm-icon-btn" onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')} title="Sort by date">
            <BsFilter size={14} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="rm-table">
          <thead>
            <tr>
              <th>Expense</th>
              <th>Category</th>
              <th>Type</th>
              <th>Paid By</th>
              <th>Your Share</th>
              <th>Total</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 14, width: j === 0 ? 140 : 80 }} /></td>
                  ))}
                </tr>
              ))
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="rm-empty-state">
                    <div className="rm-empty-icon">🧾</div>
                    <h5>No expenses found</h5>
                    <p>Try adjusting filters or add a new expense</p>
                  </div>
                </td>
              </tr>
            ) : (
              expenses.map(exp => {
                const meta = getCategoryMeta(exp.category);
                const isYours = exp.paidBy?._id === user?._id;
                const myPart = exp.participants?.find(p => p.user?._id === user?._id || p.user === user?._id);
                return (
                  <tr key={exp._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.1rem' }}>{meta.emoji}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.83rem' }}>{exp.title}</div>
                          {exp.note && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{exp.note}</div>}
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{exp.category}</span></td>
                    <td>
                      <span className={`rm-badge-pill ${exp.type === 'shared' ? 'rm-badge-shared' : 'rm-badge-personal'}`}>
                        {exp.type}
                      </span>
                    </td>
                    <td>
                      <span className={`payer-badge ${!isYours ? 'roommate' : ''}`} style={{ fontSize: '0.72rem' }}>
                        {isYours ? 'You' : exp.paidBy?.name?.split(' ')[0] || 'Roommate'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--rm-blue)', fontSize: '0.83rem' }}>
                        {myPart ? formatCurrency(myPart.shareAmount) : '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--rm-red)', fontSize: '0.83rem' }}>
                        {formatCurrency(exp.amount)}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatDate(exp.date || exp.createdAt)}</td>
                    <td>
                      {isYours && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => handleEdit(exp)}
                            style={{ background: 'var(--rm-blue-pale)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: 'var(--rm-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <BsPencilFill size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(exp._id)}
                            style={{ background: 'var(--rm-red-light)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: 'var(--rm-red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <BsTrashFill size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderTop: '1px solid var(--divider)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Page {page} of {totalPages} ({total} results)
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="rm-icon-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <BsChevronLeft size={13} />
              </button>
              <button className="rm-icon-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <BsChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <AddExpenseModal
          expense={editExpense}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default Expenses;
