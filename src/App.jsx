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
import { collection, doc, setDoc, getDocs, query, orderBy } from "firebase/firestore";
import { auth, db } from "./firebase";

function App() {
  const [user, setUser] = useState(null);
  const [income, setIncome] = useState("");
  const [expenseRate, setExpenseRate] = useState("");
  const [taxRate, setTaxRate] = useState(0.033);
  const [month, setMonth] = useState("");
  const [records, setRecords] = useState([]);

  // 로그인 상태 감지
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // Firestore에서 기록 불러오기
  useEffect(() => {
    if (!user) {
      setRecords([]);
      return;
    }

    const fetchRecords = async () => {
      try {
        const q = query(
          collection(db, "records", user.uid, "monthly"),
          orderBy("month", "desc")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => doc.data());
        setRecords(data);
      } catch (err) {
        console.error("Firestore 불러오기 실패", err);
      }
    };

    fetchRecords();
  }, [user]);

  // 계산
  const incomeNum = Number(income);
  const expenseNum = incomeNum * (Number(expenseRate) / 100);
  const taxable = incomeNum - expenseNum;
  const tax = taxable * taxRate;
  const netIncome = taxable - tax;

  // 로그인 / 로그아웃
  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("로그인 실패", err);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  // 기록 저장
  const saveRecord = async () => {
    if (!user) {
      alert("로그인 후 기록 저장이 가능합니다");
      return;
    }
    if (!month || !incomeNum) return;

    const newRecord = {
      month,
      income: incomeNum,
      tax: Math.round(tax),
      netIncome: Math.round(netIncome),
    };

    setRecords([newRecord, ...records]);

    try {
      await setDoc(doc(db, "records", user.uid, "monthly", month), newRecord);
    } catch (err) {
      console.error("Firestore 저장 실패", err);
    }
  };

  const deleteRecord = (index) => {
    setRecords(records.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    if (window.confirm("모든 기록을 삭제할까요?")) {
      setRecords([]);
    }
  };

  const downloadCSV = () => {
  const header = "월,수입,세금,실수령\n";
  const rows = records
    .map((r) => `${r.month},${r.income},${r.tax},${r.netIncome}`)
    .join("\n");

  // UTF-8 BOM (Byte Order Mark) 추가
  const bom = "\uFEFF";
  const blob = new Blob([bom + header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "freelance_records.csv";
  a.click();
};


  // 연간 합계
  const totalIncome = records.reduce((sum, r) => sum + r.income, 0);
  const totalTax = records.reduce((sum, r) => sum + r.tax, 0);
  const totalNet = records.reduce((sum, r) => sum + r.netIncome, 0);

  return (
    <div className="container">
      {/* 로그인 UI */}
      <div style={{ textAlign: "right", marginBottom: "10px" }}>
        {!user ? (
          <button onClick={login}>🔐 Google 로그인</button>
        ) : (
          <>
            <span>{user.displayName}님</span>
            <button onClick={logout} style={{ marginLeft: "8px" }}>로그아웃</button>
          </>
        )}
      </div>

      <h1>프리랜서 실수령 계산기</h1>

      {/* 입력 폼 */}
      <label>월</label>
      <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />

      <label>월 수입 (원)</label>
      <input type="number" value={income} onChange={(e) => setIncome(e.target.value)} />

      <label>경비 비율 (%)</label>
      <input type="number" value={expenseRate} onChange={(e) => setExpenseRate(e.target.value)} />

      <label>세율</label>
      <select onChange={(e) => setTaxRate(Number(e.target.value))}>
        <option value="0.033">3.3%</option>
        <option value="0.1">간편</option>
      </select>

      <div className="result">
        <p>세금: {isNaN(tax) ? 0 : tax.toLocaleString()} 원</p>
        <p>실수령: {isNaN(netIncome) ? 0 : netIncome.toLocaleString()} 원</p>
      </div>

      <button onClick={saveRecord}>월별 기록 저장</button>
      {records.length > 0 && (
        <>
          <button onClick={clearAll} style={{ marginLeft: "10px" }}>전체 삭제</button>
          <button onClick={downloadCSV} style={{ marginLeft: "10px" }}>📁 CSV 다운로드</button>
        </>
      )}

      <h2>📅 월별 기록</h2>
      <ul>
        {records.map((r, i) => (
          <li key={i}>
            <strong>{r.month}</strong> | 수입 {r.income.toLocaleString()}원 |
            세금 {r.tax.toLocaleString()}원 | 실수령 {r.netIncome.toLocaleString()}원
            <button onClick={() => deleteRecord(i)} style={{ marginLeft: "8px" }}>❌</button>
          </li>
        ))}
      </ul>

      {records.length > 0 && (
        <>
          <div className="result">
            <h2>📊 연간 합계</h2>
            <p>총 수입: {totalIncome.toLocaleString()} 원</p>
            <p>총 세금: {totalTax.toLocaleString()} 원</p>
            <p>총 실수령: {totalNet.toLocaleString()} 원</p>
          </div>

          <h2>📈 월별 실수령 차트</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={records.slice().reverse()}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="netIncome" fill="#4CAF50" />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}

export default App;
