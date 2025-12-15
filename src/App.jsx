import React, { useState } from "react";
import "./index.css";

function App() {
  const [income, setIncome] = useState("");
  const [expenseRate, setExpenseRate] = useState("");
  const [taxRate, setTaxRate] = useState(0.033);

  const incomeNum = Number(income);
  const expenseNum = incomeNum * (Number(expenseRate) / 100);
  const taxable = incomeNum - expenseNum;
  const tax = taxable * taxRate;
  const netIncome = taxable - tax;

  return (
    <div className="container">
      <h1>프리랜서 실수령 계산기</h1>

      <label>월 수입 (원)</label>
      <input
        type="number"
        value={income}
        onChange={(e) => setIncome(e.target.value)}
      />

      <label>경비 비율 (%)</label>
      <input
        type="number"
        value={expenseRate}
        onChange={(e) => setExpenseRate(e.target.value)}
      />

      <label>세율 선택</label>
      <select onChange={(e) => setTaxRate(Number(e.target.value))}>
        <option value="0.033">3.3%</option>
        <option value="0.1">간편</option>
      </select>

      <div className="result">
        <p>세금: {isNaN(tax) ? 0 : tax.toLocaleString()} 원</p>
        <p>실수령: {isNaN(netIncome) ? 0 : netIncome.toLocaleString()} 원</p>
      </div>
    </div>
  );
}

export default App;
