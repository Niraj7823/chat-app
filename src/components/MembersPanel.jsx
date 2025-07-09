import React, { useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import styles from "../styles/MembersPanel.module.css";
import { useNavigate } from "react-router-dom";

export default function MembersPanel({ onClose }) {
  const [members, setMembers] = useState([]);
  const user = auth.currentUser;
  const panelRef = useRef(null);
  const navigate = useNavigate();
  const [unreadCounts, setUnreadCounts] = useState({});
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    user: null,
  });

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

  useEffect(() => {
    const unsubscribes = [];

    members.forEach((member) => {
      if (member.id === user.uid) return;

      const chatId =
        user.uid < member.id
          ? `${user.uid}_${member.id}`
          : `${member.id}_${user.uid}`;

      const unsubscribe = onSnapshot(
        collection(db, "privateChats", chatId, "messages"),
        async (snap) => {
          let count = 0;

          const readDoc = await getDoc(
            doc(db, "privateChats", chatId, "metadata", user.uid)
          );
          const lastRead = readDoc.exists()
            ? readDoc.data()?.lastRead?.seconds || 0
            : 0;

          snap.docs.forEach((d) => {
            const msg = d.data();
            const createdAt = msg.createdAt?.seconds || 0;
            if (msg.senderId !== user.uid && createdAt > lastRead) {
              count++;
            }
          });

          setUnreadCounts((prev) => ({
            ...prev,
            [member.id]: count,
          }));
        }
      );

      unsubscribes.push(unsubscribe);
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [members]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        !e.target.closest("[class*='contextMenu']")
      ) {
        onClose();
        setContextMenu({ ...contextMenu, visible: false });
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleRightClick = (e, user) => {
    e.preventDefault();

    const menuWidth = 160;
    const menuHeight = 40;

    const x =
      e.pageX + menuWidth > window.innerWidth
        ? window.innerWidth - menuWidth - 10
        : e.pageX;

    const y =
      e.pageY + menuHeight > window.innerHeight
        ? window.innerHeight - menuHeight - 10
        : e.pageY;

    setContextMenu({
      visible: true,
      x,
      y,
      user,
    });
  };

  const handleStartPersonalChat = (user) => {
    setContextMenu({ ...contextMenu, visible: false });
    onClose();
    navigate(`/chat/${user.id}`);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.panel} ref={panelRef}>
        <button className={styles.closeBtn} onClick={onClose}>
          ✖
        </button>
        <h3>Members ({members.length})</h3>
        <input placeholder="Search members" className={styles.search} />

        <ul className={styles.memberList}>
          {members.map((member) => (
            <li
              key={member.id}
              className={styles.memberItem}
              onContextMenu={(e) => handleRightClick(e, member)}
            >
              <img
                src={
                  member.photoURL ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    member.name
                  )}`
                }
                alt={member.name}
                className={styles.avatar}
              />
              <div>
                <strong>{member.id === user.uid ? "You" : member.name}</strong>

                {unreadCounts[member.id] > 0 && (
                  <span className={styles.unreadBadge}>
                    {unreadCounts[member.id]}
                  </span>
                )}

                <p className={styles.status}>{member.status || "Online"}</p>
              </div>
            </li>
          ))}
        </ul>

        {contextMenu.visible && (
          <ul
            className={styles.contextMenu}
            style={{
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x}px`,
            }}
            onClick={() => setContextMenu({ ...contextMenu, visible: false })}
          >
            <li
              className={styles.hoverEffect}
              onClick={() => handleStartPersonalChat(contextMenu.user)}
            >
              Personal Chat
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
