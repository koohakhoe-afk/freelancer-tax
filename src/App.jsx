import React, { useState, useEffect } from "react";
import "./index.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { auth, db } from "./firebase";

function App() {
  const [user, setUser] = useState(null);
  const [income, setIncome] = useState("");
  const [expenseRate, setExpenseRate] = useState("");
  const [taxType, setTaxType] = useState("3.3");
  const [taxRate, setTaxRate] = useState(0.033);
  const [month, setMonth] = useState("");
  const [records, setRecords] = useState([]);
  const [yearFilter, setYearFilter] = useState("");

  /* 로그인 상태 */
  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  /* Firestore에서 기록 불러오기 */
  useEffect(() => {
    if (!user) return setRecords([]);

    const fetchRecords = async () => {
      const q = query(
        collection(db, "records", user.uid, "monthly"),
        orderBy("month", "desc")
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => {
        const r = d.data();
        return {
          month: r.month || "",
          year: r.month ? r.month.slice(0, 4) : "",
          income: Number(r.income) || 0,
          tax: Number(r.tax) || 0,
          netIncome: Number(r.netIncome) || 0,
        };
      });
      setRecords(data);
    };
    fetchRecords();
  }, [user]);

  /* 세율 자동 선택 */
  useEffect(() => {
    if (taxType === "3.3") setTaxRate(0.033);
    if (taxType === "simple") setTaxRate(0.1);
    if (taxType === "general") setTaxRate(0.06);
  }, [taxType]);

  /* 계산 */
  const incomeNum = Number(income) || 0;
  const expenseNum = incomeNum * (Number(expenseRate) / 100 || 0);
  const taxable = incomeNum - expenseNum;
  const tax = Math.round(taxable * taxRate);
  const netIncome = taxable - tax;

  /* 저장 (중복 방지) */
  const saveRecord = async () => {
    if (!user || !month) return;

    const exists = records.find((r) => r.month === month);
    if (exists) {
      if (!window.confirm(`${month} 기록이 이미 있습니다. 덮어쓰시겠습니까?`))
        return;
    }

    const record = {
      month,
      year: month.slice(0, 4),
      income: incomeNum,
      tax,
      netIncome,
    };

    await setDoc(doc(db, "records", user.uid, "monthly", month), record);

    setRecords((prev) => [
      record,
      ...prev.filter((r) => r.month !== month),
    ]);
  };

  /* 연도 필터 적용 */
  const filtered = yearFilter
    ? records.filter((r) => r.year === yearFilter)
    : records;

  const yearOptions = [...new Set(records.map((r) => r.year))].filter(
    Boolean
  );

  const totalIncome = filtered.reduce((sum, r) => sum + (r.income || 0), 0);
  const totalTax = filtered.reduce((sum, r) => sum + (r.tax || 0), 0);
  const totalNet = filtered.reduce((sum, r) => sum + (r.netIncome || 0), 0);

  /* 로그인 */
  const login = async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  /* CSV 다운로드 */
  const downloadCSV = () => {
    if (!filtered.length) return;

    const header = ["월", "수입", "세금", "실수령"];
    const rows = filtered.map((r) => [
      r.month,
      r.income,
      r.tax,
      r.netIncome,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [header, ...rows]
        .map((e) => e.join(","))
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `freelancer_records.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* 전체 삭제 */
  const clearAll = () => {
    if (!window.confirm("모든 기록을 삭제하시겠습니까?")) return;
    setRecords([]);
    // 실제 Firestore 삭제는 구현 필요
  };

  return (
    <div className="container">
      {/* 로그인 */}
      <div className="top">
        {!user ? (
          <button onClick={login}>🔐 Google 로그인</button>
        ) : (
          <>
            <span>{user.displayName}님</span>
            <button onClick={() => signOut(auth)}>로그아웃</button>
          </>
        )}
      </div>

      <h1>프리랜서 실수령 계산기</h1>

      {/* 입력 */}
      <label>월</label>
      <input
        type="month"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
      />

      <label>월 수입</label>
      <input
        type="number"
        inputMode="numeric"
        value={income}
        onChange={(e) => setIncome(e.target.value)}
      />

      <label>경비 비율 (%)</label>
      <input
        type="number"
        inputMode="numeric"
        value={expenseRate}
        onChange={(e) => setExpenseRate(e.target.value)}
      />

      <label>세금 유형</label>
      <select onChange={(e) => setTaxType(e.target.value)} value={taxType}>
        <option value="3.3">3.3% (원천징수)</option>
        <option value="simple">간편 (10%)</option>
        <option value="general">종합소득세 (예시)</option>
      </select>

      <p className="guide">
        {taxType === "3.3" && "✔ 일반적인 프리랜서 원천징수"}
        {taxType === "simple" && "✔ 간편 추정 세율"}
        {taxType === "general" && "✔ 종합소득세 참고용"}
      </p>

      <div className="result">
        <p>세금: {tax.toLocaleString()} 원</p>
        <p>실수령: {netIncome.toLocaleString()} 원</p>
      </div>

      <button className="primary" onClick={saveRecord}>
        월별 기록 저장
      </button>

      {/* 연도 필터 */}
      <label>연도 선택:</label>
      <select
        value={yearFilter}
        onChange={(e) => setYearFilter(e.target.value)}
      >
        <option value="">전체 연도</option>
        {yearOptions.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      {/* 기록 */}
      <ul>
        {filtered.map((r) => (
          <li key={r.month}>
            {r.month} | 수입 {r.income.toLocaleString()}원 | 세금{" "}
            {r.tax.toLocaleString()}원 | 실수령 {r.netIncome.toLocaleString()}원
          </li>
        ))}
      </ul>

      <div className="result">
        <h2>연간 합계</h2>
        <p>총 수입: {totalIncome.toLocaleString()} 원</p>
        <p>총 세금: {totalTax.toLocaleString()} 원</p>
        <p>총 실수령: {totalNet.toLocaleString()} 원</p>
      </div>

      {/* CSV 다운로드 / 전체 삭제 */}
      <div className="actions">
        <button onClick={downloadCSV}>📁 CSV 다운로드</button>
        <button onClick={clearAll}>전체 삭제</button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={filtered.slice().reverse()}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="netIncome" fill="#4CAF50" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default App;
