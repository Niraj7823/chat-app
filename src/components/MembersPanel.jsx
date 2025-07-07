import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import styles from "../styles/MembersPanel.module.css";

export default function MembersPanel({ onClose }) {
  const [members, setMembers] = useState([]);
  const user = auth.currentUser;

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

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <button className={styles.closeBtn} onClick={onClose}>
          ✖
        </button>
        <h3>Members ({members.length})</h3>
        <input placeholder="Search members" className={styles.search} />
        <ul className={styles.memberList}>
          {members.map((member) => (
            <li key={member.id} className={styles.memberItem}>
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
                <p className={styles.status}>{member.status}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
