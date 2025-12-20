import React from "react";
import Login from "./components/Login";
import FreelancerTax from "./components/FreelancerTax";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebase";

function App() {
  const [user] = useAuthState(auth);
  return <div>{user ? <FreelancerTax /> : <Login />}</div>;
}

export default App;
