import React, { useState } from "react";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { Button, TextField, Container, Typography, Box } from "@mui/material";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signInWithGoogle = async () => await signInWithPopup(auth, googleProvider);
  const signUpWithEmail = async () => await createUserWithEmailAndPassword(auth, email, password);
  const signInWithEmail = async () => await signInWithEmailAndPassword(auth, email, password);

  return (
    <Container maxWidth="sm" sx={{ mt: 5, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>Freelancer-Tax 로그인</Typography>
      <Button variant="contained" color="primary" onClick={signInWithGoogle} sx={{ mb: 2 }}>Google 로그인</Button>
      <Box sx={{ borderTop: 1, borderColor: 'grey.300', my: 2 }}></Box>
      <TextField label="Email" fullWidth value={email} onChange={e => setEmail(e.target.value)} sx={{ mb: 2 }} />
      <TextField label="Password" type="password" fullWidth value={password} onChange={e => setPassword(e.target.value)} sx={{ mb: 2 }} />
      <Button variant="outlined" onClick={signUpWithEmail} sx={{ mr: 1 }}>회원가입</Button>
      <Button variant="contained" onClick={signInWithEmail}>로그인</Button>
    </Container>
  );
}
