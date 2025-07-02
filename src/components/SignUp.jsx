import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import "../styles/AuthForm.css";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await updateProfile(userCredential.user, {
        displayName: name,
      });

      await auth.currentUser.reload();

      alert("Signup successful");
      navigate("/chat");
    } catch (error) {
      alert(error.message);
      console.error("Signup error:", error.code, error.message);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <div className="auth-left">
          <h1>💬 ChatVerse</h1>
          <p>Real-time chatting made simple</p>
        </div>

        <div className="auth-divider" />

        <div className="auth-right">
          <h2>Signup</h2>
          <form onSubmit={handleSignup}>
            <input
              type="text"
              placeholder="Name"
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit">Signup</button>
          </form>
          <p>
            Already have an account?{" "}
            <button onClick={() => navigate("/login")}>Go to Login</button>
          </p>
        </div>
      </div>
    </div>
  );
}
