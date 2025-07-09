import { useEffect, useRef, useState } from "react";
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
  const [searchTerm, setSearchTerm] = useState("");
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
    if (!user || members.length === 0) return;

    let isMounted = true;
    const unsubscribes = [];

    const setupListeners = async () => {
      for (const member of members) {
        if (!user || member.id === user.uid) continue;

        const chatId =
          user.uid < member.id
            ? `${user.uid}_${member.id}`
            : `${member.id}_${user.uid}`;

        const messagesRef = collection(db, "privateChats", chatId, "messages");
        const metadataRef = doc(
          db,
          "privateChats",
          chatId,
          "metadata",
          user.uid
        );

        try {
          const readDoc = await getDoc(metadataRef);
          const lastRead = readDoc.exists()
            ? readDoc.data()?.lastRead?.seconds || 0
            : 0;

          const unsubscribe = onSnapshot(messagesRef, (snap) => {
            if (!isMounted) return;

            let count = 0;
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
          });

          unsubscribes.push(unsubscribe);
        } catch (err) {
          console.error("Error setting up listener for", member.id, err);
        }
      }
    };

    setupListeners();

    return () => {
      isMounted = false;
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [user, members]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        !e.target.closest("[class*='contextMenu']")
      ) {
        setContextMenu({ ...contextMenu, visible: false });
        onClose();
      } else if (
        contextMenu.visible &&
        !e.target.closest("[class*='contextMenu']")
      ) {
        setContextMenu({ ...contextMenu, visible: false });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose, contextMenu]);

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

  const filteredMembers = members.filter((m) =>
    m.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.overlay}>
      <div className={styles.panel} ref={panelRef}>
        <button className={styles.closeBtn} onClick={onClose}>
          ✖
        </button>
        <h3>Members ({members.length})</h3>

        <input
          placeholder="Search members"
          className={styles.search}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <ul className={styles.memberList}>
          {filteredMembers.map((member) => (
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
