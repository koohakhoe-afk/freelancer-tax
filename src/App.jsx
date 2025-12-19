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

  // 로그인 상태 확인
  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Firestore에서 기록 불러오기
  useEffect(() => {
    if (!user) return setRecords([]);

    const fetchRecords = async () => {
      const q = query(
        collection(db, "records", user.uid, "daily"),
        orderBy("date", "desc")
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => {
        const r = d.data();
        return {
          ...r,
          income: Number(r.income),
          tax: Number(r.tax),
          netIncome: Number(r.netIncome),
        };
      });
      setRecords(data);
    };
    fetchRecords();
  }, [user]);

  // 세율 자동 선택
  useEffect(() => {
    if (taxType === "3.3") setTaxRate(0.033);
    if (taxType === "simple") setTaxRate(0.1);
    if (taxType === "general") setTaxRate(0.06);
  }, [taxType]);

  // 계산
  const incomeNum = Number(income);
  const expenseNum = incomeNum * (Number(expenseRate) / 100);
  const taxable = incomeNum - expenseNum;
  const tax = Math.round(taxable * taxRate);
  const netIncome = taxable - tax;

  // 저장 (일자별/건별)
  const saveRecord = async () => {
    if (!user || !month || !income) return;

    const today = new Date();
    const timestamp = today.getTime(); // 고유 ID
    const record = {
      date: today.toISOString().slice(0, 10),
      month,
      income: incomeNum,
      tax,
      netIncome,
    };

    // Firestore 저장
    await setDoc(
      doc(db, "records", user.uid, "daily", timestamp.toString()),
      record
    );

    // 로컬 상태 업데이트
    setRecords((prev) => [record, ...prev]);
    setIncome("");
    setExpenseRate("");
  };

  // 연도 필터 적용
  const filtered = yearFilter
    ? records.filter((r) => r.month?.startsWith(yearFilter))
    : records;

  // 월별 합계 계산
  const monthlyMap = {};
  filtered.forEach((r) => {
    if (!monthlyMap[r.month])
      monthlyMap[r.month] = { income: 0, tax: 0, netIncome: 0 };
    monthlyMap[r.month].income += r.income;
    monthlyMap[r.month].tax += r.tax;
    monthlyMap[r.month].netIncome += r.netIncome;
  });

  // 연간 합계
  const totalIncome = filtered.reduce((s, r) => s + r.income, 0);
  const totalTax = filtered.reduce((s, r) => s + r.tax, 0);
  const totalNet = filtered.reduce((s, r) => s + r.netIncome, 0);

  // 로그인
  const login = async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
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
        기록 저장
      </button>

      {/* 연도 필터 */}
      <label>연도 선택:</label>
      <select
        onChange={(e) => setYearFilter(e.target.value)}
        value={yearFilter}
      >
        <option value="">전체 연도</option>
        {[...new Set(records.map((r) => r.month?.slice(0, 4)))].filter(Boolean)
          .sort()
          .map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
      </select>

      {/* 기록 테이블 */}
      <table className="record-table">
        <thead>
          <tr>
            <th>일자</th>
            <th>월</th>
            <th>수입(원)</th>
            <th>세금(원)</th>
            <th>실수령(원)</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r, idx) => (
            <tr key={idx}>
              <td>{r.date}</td>
              <td>{r.month}</td>
              <td>{r.income.toLocaleString()}</td>
              <td>{r.tax.toLocaleString()}</td>
              <td>{r.netIncome.toLocaleString()}</td>
            </tr>
          ))}

          {/* 월별 합계 행 */}
          {Object.entries(monthlyMap).map(([m, sum]) => (
            <tr key={m} className="total-row">
              <td colSpan={1}>합계 ({m})</td>
              <td></td>
              <td>{sum.income.toLocaleString()}</td>
              <td>{sum.tax.toLocaleString()}</td>
              <td>{sum.netIncome.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="result">
        <h2>연간 합계</h2>
        <p>총 수입: {totalIncome.toLocaleString()} 원</p>
        <p>총 세금: {totalTax.toLocaleString()} 원</p>
        <p>총 실수령: {totalNet.toLocaleString()} 원</p>
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
