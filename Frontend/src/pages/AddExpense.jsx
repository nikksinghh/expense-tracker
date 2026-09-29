import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsArrowLeft } from 'react-icons/bs';
import AddExpenseModal from '../components/Expenses/AddExpenseModal';

const AddExpense = () => {
  const navigate = useNavigate();
  const [, setDone] = useState(false);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button className="btn-rm-outline" onClick={() => navigate(-1)} style={{ gap: 6 }}>
          <BsArrowLeft /> Back
        </button>
      </div>
      <AddExpenseModal
        expense={null}
        onClose={(refresh) => {
          if (refresh) { setDone(true); navigate('/expenses'); }
          else navigate(-1);
        }}
        inline
      />
    </div>
  );
};

export default AddExpense;
