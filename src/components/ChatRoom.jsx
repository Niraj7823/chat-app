import { useEffect, useRef, useState } from "react";
import { auth, db } from "../firebase";
import { BsChatText } from "react-icons/bs";
import { MdDelete } from "react-icons/md";
import { FaReply } from "react-icons/fa6";
import { MdContentCopy } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import MembersPanel from "./MembersPanel";
const CONTEXT_MENU_WIDTH = 160;
const CONTEXT_MENU_HEIGHT = 130;

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
  const chatContainerRef = useRef(null);
  const [replyTo, setReplyTo] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const membersPanelRef = useRef(null);
  const inputRef = useRef(null);
  const [allUsers, setAllUsers] = useState([]);
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
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const users = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllUsers(users);
    });

    return () => unsubscribe();
  }, []);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        membersPanelRef.current &&
        !membersPanelRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setShowMembers(false);
      }
    };

    if (showMembers) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMembers]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    const handleScroll = () => {
      if (contextMenu.visible) {
        setContextMenu({ ...contextMenu, visible: false });
      }
    };

    const chatEl = chatContainerRef.current;
    if (chatEl) {
      chatEl.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (chatEl) {
        chatEl.removeEventListener("scroll", handleScroll);
      }
    };
  }, [contextMenu]);

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

  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
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
          <BsChatText />{" "}
          <button onClick={() => setShowMembers(true)}>
            <span>Chat Room</span>{" "}
          </button>
        </h2>
        <button onClick={handleLogout}>
          <span>Logout</span>
        </button>
      </header>

      <div className={styles.messages} ref={chatContainerRef}>
        {(() => {
          let lastDateLabel = null;

          return messages.map((msg) => {
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
                      const x =
                        e.pageX + CONTEXT_MENU_WIDTH > window.innerWidth
                          ? window.innerWidth - CONTEXT_MENU_WIDTH - 10
                          : e.pageX;

                      const y =
                        e.pageY + CONTEXT_MENU_HEIGHT > window.innerHeight
                          ? window.innerHeight - CONTEXT_MENU_HEIGHT - 10
                          : e.pageY;

                      setContextMenu({
                        visible: true,
                        x,
                        y,
                        message: msg,
                      });
                    }}
                    onTouchStart={(e) => {
                      if (msg.isDeleted) return;
                      const touch = e.touches[0];
                      msg._pressTimer = setTimeout(() => {
                        const x =
                          touch.pageX + CONTEXT_MENU_WIDTH > window.innerWidth
                            ? window.innerWidth - CONTEXT_MENU_WIDTH - 10
                            : touch.pageX;

                        const y =
                          touch.pageY + CONTEXT_MENU_HEIGHT > window.innerHeight
                            ? window.innerHeight - CONTEXT_MENU_HEIGHT - 10
                            : touch.pageY;

                        setContextMenu({
                          visible: true,
                          x,
                          y,
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
          ref={inputRef}
          placeholder="Type your message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>

      {showMembers && (
        <div ref={membersPanelRef}>
          <MembersPanel
            onClose={() => setShowMembers(false)}
            members={allUsers}
          />
        </div>
      )}
    </div>
  );
}
