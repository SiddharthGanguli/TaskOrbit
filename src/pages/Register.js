import { useState } from "react";
import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { collection, doc, setDoc, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      // Check if username is already taken
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      const usernames = usersSnapshot.docs.map((doc) => doc.data().username);

      if (usernames.includes(username)) {
        setError("Username already taken. Try another one.");
        return;
      }

      // Register user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });

      // Save user info to Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        username,
        email
      });

      alert("Registration successful!");
      navigate("/dashboard");
    } catch (err) {
      console.error("Registration Error:", err.message);
      setError(err.message);
    }
  };

  return (
    <div className="register-container">
      <form onSubmit={handleRegister}>
        <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Register</button>
      </form>
      {error && <p>{error}</p>}
    </div>
  );
};

export default Register;
