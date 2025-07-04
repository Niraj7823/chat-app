import { useEffect, useRef, useState } from "react";
import { auth, db } from "../firebase";
import { BsChatText } from "react-icons/bs";
import { MdDelete } from "react-icons/md";
import { FaReply } from "react-icons/fa6";
import { MdContentCopy } from "react-icons/md";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { format, isToday, isYesterday } from "date-fns";
import styles from "../styles/ChatRoom.module.css";

export default function ChatRoom() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    message: null,
  });

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

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu({ ...contextMenu, visible: false });
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [contextMenu]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (text.trim() === "") return;

    try {
      await addDoc(collection(db, "messages"), {
        text,
        createdAt: serverTimestamp(),
        uid: user.uid,
        name: user.displayName || user.email,
        isDeleted: false,
        replyTo: replyTo
          ? {
              id: replyTo.id,
              text: replyTo.text,
              name: replyTo.name,
            }
          : null,
      });
      setText("");
      setReplyTo(null);
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
                    onContextMenu={(e) => {
                      if (msg.isDeleted) return;
                      e.preventDefault();
                      setContextMenu({
                        visible: true,
                        x: e.pageX,
                        y: e.pageY,
                        message: msg,
                      });
                    }}
                    onTouchStart={(e) => {
                      if (msg.isDeleted) return;
                      const touch = e.touches[0];
                      msg._pressTimer = setTimeout(() => {
                        setContextMenu({
                          visible: true,
                          x: touch.pageX,
                          y: touch.pageY,
                          message: msg,
                        });
                      }, 600);
                    }}
                    onTouchEnd={() => clearTimeout(msg._pressTimer)}
                  >
                    {msg.replyTo && (
                      <div className={styles.replyBox}>
                        <span className={styles.replyName}>
                          {msg.replyTo.name}
                        </span>
                        <div className={styles.replyText}>
                          {msg.replyTo.text}
                        </div>
                      </div>
                    )}
                    <p className={msg.isDeleted ? styles.deletedText : ""}>
                      {msg.isDeleted
                        ? msg.uid === user.uid
                          ? "You deleted this message"
                          : "This message was deleted"
                        : msg.text}
                    </p>
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

        {contextMenu.visible && contextMenu.message && (
          <ul
            className={styles.contextMenu}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={() => setContextMenu({ ...contextMenu, visible: false })}
          >
            <li
              onClick={() =>
                navigator.clipboard.writeText(contextMenu.message.text)
              }
            >
              <MdContentCopy /> Copy
            </li>
            <li
              onClick={() => {
                setReplyTo(contextMenu.message);
                setContextMenu({ ...contextMenu, visible: false });
              }}
            >
              <FaReply style={{ fontSize: "15px", paddingRight: "5px" }} />{" "}
              Reply
            </li>
            {contextMenu.message.uid === user.uid && (
              <li
                onClick={async () => {
                  const confirmDelete = window.confirm("Delete this message?");
                  if (confirmDelete) {
                    await updateDoc(
                      doc(db, "messages", contextMenu.message.id),
                      { isDeleted: true }
                    );
                    setContextMenu({ ...contextMenu, visible: false });
                  }
                }}
                style={{ display: "flex", alignItems: "center" }}
              >
                <MdDelete style={{ fontSize: "18px", paddingRight: "5px" }} />{" "}
                Delete
              </li>
            )}
          </ul>
        )}
      </div>

      {replyTo && (
        <div className={styles.replyPreview}>
          <div>
            <strong>Replying to:</strong> {replyTo.text}
          </div>
          <button onClick={() => setReplyTo(null)}>✖</button>
        </div>
      )}

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
