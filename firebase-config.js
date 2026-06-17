/**
 * Firebase 設定・初期化
 * 
 * ★ 重要: 以下の firebaseConfig の値をあなたのFirebaseプロジェクトの設定に書き換えてください。
 *   Firebaseコンソール → プロジェクト設定 → 全般 → マイアプリ → ウェブアプリ の設定値です。
 */

const firebaseConfig = {
  apiKey: "AIzaSyA9oFKj089Pki9327M-3OZKd8CpgAVI5xA",
  authDomain: "exam-manage-8eebc.firebaseapp.com",
  projectId: "exam-manage-8eebc",
  storageBucket: "exam-manage-8eebc.firebasestorage.app",
  messagingSenderId: "438433376508",
  appId: "1:438433376508:web:7ad5b823280b1ea128cf79"
};

// Firebase 初期化
firebase.initializeApp(firebaseConfig);

// Firestore & Auth インスタンス
const db = firebase.firestore();
const auth = firebase.auth();

// オフライン永続性を有効化（PWA対応）
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence: 複数タブが開いています。永続性は1つのタブでのみ有効です。');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence: このブラウザではオフライン永続性がサポートされていません。');
  }
});

console.log('[Firebase] 初期化完了');
