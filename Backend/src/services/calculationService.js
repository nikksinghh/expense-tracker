/**
 * Calculation service for expenses, splits, settlements, and budgets.
 * All amounts are rounded to 2 decimal places (paise accuracy).
 */

const roundToPaise = (num) => {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
};

/**
 * Validate and calculate participants list for an expense.
 * @param {Object} params
 * @param {number} params.amount - Total expense amount
 * @param {string} params.type - 'shared' or 'personal'
 * @param {string} params.splitMode - 'equal' or 'custom'
 * @param {string} params.payerId - Payer's user id
 * @param {Array<string>} params.roomMemberIds - List of user ids in room (max 2)
 * @param {Array<Object>} [params.customParticipants] - Provided custom participants
 */
const calculateExpenseParticipants = ({
  amount,
  type,
  splitMode,
  payerId,
  roomMemberIds,
  customParticipants = []
}) => {
  const total = roundToPaise(amount);
  if (total <= 0) {
    throw new Error('Expense amount must be greater than zero');
  }

  // 1. Personal expense: 100% assigned to payer
  if (type === 'personal') {
    return [
      {
        user: payerId,
        shareAmount: total,
        sharePercent: 100
      }
    ];
  }

  // 2. Shared expense - Equal split
  if (splitMode === 'equal') {
    const members = roomMemberIds && roomMemberIds.length > 0 ? roomMemberIds : [payerId];
    const count = members.length;
    if (count === 1) {
      return [
        {
          user: members[0],
          shareAmount: total,
          sharePercent: 100
        }
      ];
    }

    // Split equally between 2 roommates
    const half = roundToPaise(total / count);
    const remainder = roundToPaise(total - half * (count - 1));

    return members.map((memberId, idx) => ({
      user: memberId,
      shareAmount: idx === 0 ? remainder : half,
      sharePercent: roundToPaise(100 / count)
    }));
  }

  // 3. Shared expense - Custom split
  if (splitMode === 'custom') {
    if (!customParticipants || customParticipants.length === 0) {
      throw new Error('Custom split requires participant breakdown');
    }

    let sum = 0;
    const formatted = customParticipants.map((p) => {
      const share = roundToPaise(p.shareAmount || 0);
      sum += share;
      return {
        user: p.user || p.userId,
        shareAmount: share,
        sharePercent: total > 0 ? roundToPaise((share / total) * 100) : 0
      };
    });

    sum = roundToPaise(sum);
    // Allow minor floating epsilon (e.g. 0.05)
    if (Math.abs(sum - total) > 0.05) {
      throw new Error(
        `Custom split total (₹${sum}) must equal the expense amount (₹${total})`
      );
    }

    return formatted;
  }

  throw new Error(`Unsupported split mode: ${splitMode}`);
};

/**
 * Calculate net balance between room members from shared expenses and settlements.
 * Personal expenses are EXCLUDED from settlement calculation.
 *
 * @param {Array<Object>} sharedExpenses - Shared expenses in the room
 * @param {Array<Object>} settlements - Completed settlements in the room
 * @param {Array<string>} memberIds - Room member IDs
 * @param {string} currentUserId - Logged in user ID
 */
const calculateNetBalances = (sharedExpenses, settlements, memberIds, currentUserId) => {
  const balances = {};
  memberIds.forEach((id) => {
    balances[id.toString()] = 0;
  });

  // 1. Process shared expenses
  sharedExpenses.forEach((exp) => {
    if (exp.type !== 'shared') return; // strictly skip personal expenses

    const payerStr = (exp.payer?._id || exp.payer).toString();
    const amount = roundToPaise(exp.amount);

    if (balances[payerStr] === undefined) {
      balances[payerStr] = 0;
    }

    // Payer initially gets credit for the entire amount they paid
    balances[payerStr] = roundToPaise(balances[payerStr] + amount);

    // Each participant owes their share
    if (Array.isArray(exp.participants)) {
      exp.participants.forEach((part) => {
        const userStr = (part.user?._id || part.user).toString();
        const share = roundToPaise(part.shareAmount);

        if (balances[userStr] === undefined) {
          balances[userStr] = 0;
        }
        balances[userStr] = roundToPaise(balances[userStr] - share);
      });
    }
  });

  // 2. Process recorded settlements
  settlements.forEach((st) => {
    if (st.status !== 'completed') return;

    const payerStr = (st.payer?._id || st.payer).toString();
    const receiverStr = (st.receiver?._id || st.receiver).toString();
    const amount = roundToPaise(st.amount);

    // The payer paid money to settle their debt, so their balance improves (+ amount)
    if (balances[payerStr] !== undefined) {
      balances[payerStr] = roundToPaise(balances[payerStr] + amount);
    }
    // The receiver received money, so their balance decreases (- amount)
    if (balances[receiverStr] !== undefined) {
      balances[receiverStr] = roundToPaise(balances[receiverStr] - amount);
    }
  });

  // 3. Format result relative to current user and roommate
  const currentIdStr = currentUserId.toString();
  const roommateId = memberIds.find((id) => id.toString() !== currentIdStr);
  const roommateIdStr = roommateId ? roommateId.toString() : null;

  const currentUserNet = balances[currentIdStr] ? roundToPaise(balances[currentIdStr]) : 0;

  let relationship = 'settled';
  let netAmount = 0;
  let text = 'All settled up';

  if (roommateIdStr) {
    if (currentUserNet > 0.01) {
      relationship = 'roommate_owes_you';
      netAmount = Math.abs(currentUserNet);
      text = `Overall, Roommate owes you`;
    } else if (currentUserNet < -0.01) {
      relationship = 'you_owe_roommate';
      netAmount = Math.abs(currentUserNet);
      text = `Overall, You owe Roommate`;
    } else {
      relationship = 'settled';
      netAmount = 0;
      text = 'All settled up';
    }
  }

  return {
    balances,
    currentUserNet,
    roommateId: roommateIdStr,
    relationship,
    netAmount,
    text
  };
};

module.exports = {
  roundToPaise,
  calculateExpenseParticipants,
  calculateNetBalances
};
