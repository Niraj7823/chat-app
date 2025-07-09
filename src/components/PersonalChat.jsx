import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { MdContentCopy } from "react-icons/md";
import { MdDelete } from "react-icons/md";
import { FaReply } from "react-icons/fa6";
import { format, isToday, isYesterday } from "date-fns";
import {
  collection,
  query,
  orderBy,
  setDoc,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
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
  const [replyTo, setReplyTo] = useState(null);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    message: null,
  });

  const messagesEndRef = useRef(null);

  const getDayLabel = (date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const chatId =
    currentUser && uid
      ? currentUser.uid < uid
        ? `${currentUser.uid}_${uid}`
        : `${uid}_${currentUser.uid}`
      : null;

  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, "privateChats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    if (currentUser) {
      setDoc(
        doc(db, "privateChats", chatId, "metadata", currentUser.uid),
        { lastRead: serverTimestamp() },
        { merge: true }
      );
    }

    return () => unsubscribe();
  }, [chatId]);

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
    if (!text.trim() || !currentUser || !chatId) return;

    await addDoc(collection(db, "privateChats", chatId, "messages"), {
      text,
      senderId: currentUser.uid,
      receiverId: uid,
      createdAt: serverTimestamp(),
      isDeleted: false,
      replyTo: replyTo
        ? {
            id: replyTo.id,
            text: replyTo.text,
          }
        : null,
    });

    setText("");
    setReplyTo(null);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const targetUser = members.find((m) => m.id === uid);
  if (!currentUser) return <div>Loading...</div>;

  return (
    <div className={styles.chatRoom}>
      <header className={styles.header}>
        <h2>{targetUser ? targetUser.name : "Personal Chat"}</h2>
        <button onClick={() => navigate("/chat")} className={styles.backButton}>
          <span>⬅ Go Back</span>
        </button>
      </header>

      <div className={styles.messages}>
        {(() => {
          let lastDateLabel = null;
          return messages.map((msg) => {
            const createdAt = msg.createdAt?.seconds
              ? new Date(msg.createdAt.seconds * 1000)
              : null;
            const currentLabel = createdAt ? getDayLabel(createdAt) : null;
            const showDateHeader =
              currentLabel && currentLabel !== lastDateLabel;
            if (showDateHeader) lastDateLabel = currentLabel;

            return (
              <div key={msg.id}>
                {showDateHeader && (
                  <div className={styles.daySeparator}>
                    <span>{currentLabel}</span>
                  </div>
                )}
                <div
                  className={
                    msg.senderId === currentUser.uid
                      ? styles.sentWrapper
                      : styles.receivedWrapper
                  }
                >
                  <div
                    className={
                      msg.senderId === currentUser.uid
                        ? styles.sent
                        : styles.received
                    }
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        visible: true,
                        x: e.pageX,
                        y: e.pageY,
                        message: msg,
                      });
                    }}
                  >
                    {msg.replyTo && (
                      <div className={styles.replyBox}>
                        <span className={styles.replyName}>Reply</span>
                        <div className={styles.replyText}>
                          {msg.replyTo.text}
                        </div>
                      </div>
                    )}
                    <p className={msg.isDeleted ? styles.deletedText : ""}>
                      {msg.isDeleted ? "Message deleted" : msg.text}
                    </p>
                    <span className={styles.meta}>
                      {createdAt && format(createdAt, "p")}
                    </span>
                  </div>
                </div>
              </div>
            );
          });
        })()}
        <div ref={messagesEndRef} />

        {/* Context Menu */}
        {contextMenu.visible && contextMenu.message && (
          <ul
            className={styles.contextMenu}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={() => setContextMenu({ ...contextMenu, visible: false })}
          >
            {!contextMenu.message.isDeleted && (
              <>
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
                  <FaReply /> Reply
                </li>
              </>
            )}
            {contextMenu.message.senderId === currentUser.uid &&
              !contextMenu.message.isDeleted && (
                <li
                  onClick={async () => {
                    const confirmDelete = window.confirm(
                      "Delete this message?"
                    );
                    if (confirmDelete) {
                      await updateDoc(
                        doc(
                          db,
                          "privateChats",
                          chatId,
                          "messages",
                          contextMenu.message.id
                        ),
                        { isDeleted: true }
                      );
                      setContextMenu({ ...contextMenu, visible: false });
                    }
                  }}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <MdDelete style={{ fontSize: "18px" }} /> Delete
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
