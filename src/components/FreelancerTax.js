import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, query, where, getDocs, updateDoc, deleteDoc, doc, orderBy } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { Container, Typography, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box } from "@mui/material";

export default function FreelancerTax() {
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ date: "", income: 0, tax: 0, description: "" });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      if (currentUser) fetchEntries(currentUser.uid);
    });
    return () => unsub();
  }, []);

  const fetchEntries = async (uid) => {
    const q = query(collection(db, "freelancer_tax"), where("uid", "==", uid), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const addEntry = async () => {
    if (!user || !form.date) return;
    await addDoc(collection(db, "freelancer_tax"), { ...form, uid: user.uid });
    setForm({ date: "", income: 0, tax: 0, description: "" });
    fetchEntries(user.uid);
  };

  const updateEntry = async (id, updated) => {
    const docRef = doc(db, "freelancer_tax", id);
    await updateDoc(docRef, updated);
    fetchEntries(user.uid);
  };

  const deleteEntry = async (id) => {
    const docRef = doc(db, "freelancer_tax", id);
    await deleteDoc(docRef);
    fetchEntries(user.uid);
  };

  const dailySum = (date) => entries.filter(e => e.date === date).reduce((sum, e) => sum + Number(e.income), 0);
  const monthlySum = (month) => entries.filter(e => e.date.startsWith(month)).reduce((sum, e) => sum + Number(e.income), 0);

  return (
    <Container sx={{ mt: 5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Freelancer-Tax Tracker</Typography>
        <Button variant="outlined" color="secondary" onClick={() => signOut(auth)}>로그아웃</Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField type="date" label="날짜" value={form.date} onChange={e => setForm({...form, date:e.target.value})} />
        <TextField type="number" label="Income" value={form.income} onChange={e => setForm({...form, income:Number(e.target.value)})}/>
        <TextField type="number" label="Tax" value={form.tax} onChange={e => setForm({...form, tax:Number(e.target.value)})}/>
        <TextField label="Description" value={form.description} onChange={e => setForm({...form, description:e.target.value})}/>
        <Button variant="contained" onClick={addEntry}>저장</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>날짜</TableCell>
              <TableCell>Income</TableCell>
              <TableCell>Tax</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>수정</TableCell>
              <TableCell>삭제</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map(e => (
              <TableRow key={e.id}>
                <TableCell>{e.date}</TableCell>
                <TableCell>{e.income}원</TableCell>
                <TableCell>{e.tax}원</TableCell>
                <TableCell>{e.description}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => updateEntry(e.id, {income:e.income+100})}>+100</Button>
                </TableCell>
                <TableCell>
                  <Button size="small" color="error" onClick={() => deleteEntry(e.id)}>삭제</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6">일별 합계</Typography>
        {Array.from(new Set(entries.map(e => e.date))).map(date => (
          <Typography key={date}>{date} : {dailySum(date)}원</Typography>
        ))}

        <Typography variant="h6" sx={{ mt: 2 }}>월별 합계</Typography>
        {Array.from(new Set(entries.map(e => e.date.slice(0,7)))).map(month => (
          <Typography key={month}>{month} : {monthlySum(month)}원</Typography>
        ))}
      </Box>
    </Container>
  );
}
