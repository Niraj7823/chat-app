import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import styles from "../styles/ChatRoom.module.css";

export default function PersonalChat() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [members, setMembers] = useState([]);
  const messagesEndRef = useRef(null);

  // ✅ Wait for the user to be loaded first
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Only run hooks that depend on currentUser AFTER it is loaded
  useEffect(() => {
    if (!currentUser) return;

    const chatId =
      currentUser.uid < uid
        ? `${currentUser.uid}_${uid}`
        : `${uid}_${currentUser.uid}`;

    const q = query(
      collection(db, "privateChats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [currentUser, uid]);

  useEffect(() => {
    const fetchUsers = async () => {
      const querySnapshot = await getDocs(collection(db, "users"));
      const users = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMembers(users);
    };
    fetchUsers();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !currentUser) return;

    const chatId =
      currentUser.uid < uid
        ? `${currentUser.uid}_${uid}`
        : `${uid}_${currentUser.uid}`;

    await addDoc(collection(db, "privateChats", chatId, "messages"), {
      text,
      senderId: currentUser.uid,
      receiverId: uid,
      createdAt: serverTimestamp(),
    });

    setText("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!currentUser) return <div>Loading...</div>;

  const targetUser = members.find((m) => m.id === uid);

  return (
    <div className={styles.chatRoom}>
      <header className={styles.header}>
        <h2>{targetUser ? targetUser.name : "Personal Chat"}</h2>
        <button onClick={() => navigate("/chat")} className={styles.backButton}>
          ⬅ Go Back
        </button>
      </header>

      <div className={styles.messages}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.senderId === currentUser.uid
                ? styles.sentWrapper
                : styles.receivedWrapper
            }
          >
            <div
              className={
                msg.senderId === currentUser.uid ? styles.sent : styles.received
              }
            >
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className={styles.form}>
        <input
          type="text"
          placeholder="Type your message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
