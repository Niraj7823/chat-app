import { useEffect, useRef, useState } from "react";
import { auth, db } from "../firebase";
import { BsChatText } from "react-icons/bs";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { format, isToday, isYesterday } from "date-fns";
import styles from "../styles/ChatRoom.module.css";

export default function ChatRoom() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const messagesEndRef = useRef(null);
  const user = auth.currentUser;

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (text.trim() === "") return;

    try {
      await addDoc(collection(db, "messages"), {
        text,
        createdAt: serverTimestamp(),
        uid: user.uid,
        name: user.displayName || user.email,
      });
      setText("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/login";
  };

  const getDayLabel = (date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  return (
    <div className={styles.chatRoom}>
      <header className={styles.header}>
        <h2>
          <BsChatText /> Chat Room
        </h2>
        <button onClick={handleLogout}>
          <span>Logout</span>
        </button>
      </header>

      <div className={styles.messages}>
        {(() => {
          let lastDateLabel = null;

          return messages.map((msg, index) => {
            const createdAt = msg.createdAt?.seconds
              ? new Date(msg.createdAt.seconds * 1000)
              : null;

            const currentLabel = createdAt ? getDayLabel(createdAt) : null;
            const showDateHeader =
              currentLabel && currentLabel !== lastDateLabel;

            if (showDateHeader) {
              lastDateLabel = currentLabel;
            }

            return (
              <div key={msg.id}>
                {showDateHeader && (
                  <div className={styles.daySeparator}>
                    <span>{currentLabel}</span>
                  </div>
                )}
                <div
                  className={
                    msg.uid === user.uid
                      ? styles.sentWrapper
                      : styles.receivedWrapper
                  }
                >
                  <div
                    className={
                      msg.uid === user.uid ? styles.sent : styles.received
                    }
                  >
                    <p>{msg.text}</p>
                    <span className={styles.meta}>
                      {msg.name} • {createdAt && format(createdAt, "p")}
                    </span>
                  </div>
                </div>
              </div>
            );
          });
        })()}
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
