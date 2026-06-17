/**
 * Firebase 設定・初期化
 * 
 * ★ 重要: 以下の firebaseConfig の値をあなたのFirebaseプロジェクトの設定に書き換えてください。
 *   Firebaseコンソール → プロジェクト設定 → 全般 → マイアプリ → ウェブアプリ の設定値です。
 */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
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
