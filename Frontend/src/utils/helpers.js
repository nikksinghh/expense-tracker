// Utility: category icon + color mapping
export const CATEGORIES = [
  { label: 'Rent', emoji: '🏠', colorClass: 'cat-icon-Rent' },
  { label: 'Food', emoji: '🍔', colorClass: 'cat-icon-Food' },
  { label: 'Grocery', emoji: '🛒', colorClass: 'cat-icon-Grocery' },
  { label: 'Electricity', emoji: '⚡', colorClass: 'cat-icon-Electricity' },
  { label: 'Internet', emoji: '🌐', colorClass: 'cat-icon-Internet' },
  { label: 'Travel', emoji: '🚗', colorClass: 'cat-icon-Travel' },
  { label: 'Household', emoji: '🏡', colorClass: 'cat-icon-Household' },
  { label: 'Maintenance', emoji: '🔧', colorClass: 'cat-icon-Maintenance' },
  { label: 'Entertainment', emoji: '🎬', colorClass: 'cat-icon-Entertainment' },
  { label: 'Others', emoji: '📦', colorClass: 'cat-icon-Others' }
];

export const getCategoryMeta = (category) => {
  return CATEGORIES.find(c => c.label === category) || { label: category, emoji: '📦', colorClass: 'cat-icon-Others' };
};

export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatDateShort = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const getInitials = (name) => {
  if (!name) return 'U';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
};

export const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export const CHART_COLORS = [
  '#1d72fe', '#845ec2', '#f97316', '#22c55e', '#00c9a7',
  '#ff6b8b', '#4d93ff', '#ffd166', '#06b6d4', '#94a3b8'
];
