/**
 * Firebase Bridge
 * localStorage ↔ Firestore 同期レイヤー
 * 
 * - 認証状態の監視
 * - Firestoreからデータ読み込み → localStorageに反映
 * - localStorage書き込みをインターセプトしてFirestoreに同期
 * - 既存localStorageデータのマイグレーション
 */

(function () {
  'use strict';

  // 管理対象のlocalStorageキー
  const SYNC_KEYS = ['subjects', 'achievements', 'reviews'];

  // 同期のデバウンス時間（ミリ秒）
  const DEBOUNCE_MS = 800;

  // マイグレーション済みフラグのキー
  const MIGRATION_KEY = '__firebase_migrated';

  // デバウンスタイマー
  const debounceTimers = {};

  // 同期中フラグ（Firestore→localStorageの書き込み時にループを防ぐ）
  let isSyncingFromFirestore = false;

  // 現在のユーザーID
  let currentUserId = null;

  // Firestore リアルタイムリスナーの解除関数
  let unsubscribeSnapshot = null;

  // アプリ（bundle.js）ロード済みフラグ
  let appLoaded = false;

  // ─── originalのlocalStorage メソッドを保存 ───
  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalGetItem = localStorage.getItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);

  // ─── Firestoreにデータを保存（デバウンス付き） ───
  function syncToFirestore(key, value) {
    if (!currentUserId || isSyncingFromFirestore) return;

    clearTimeout(debounceTimers[key]);
    debounceTimers[key] = setTimeout(async () => {
      try {
        const docRef = db.collection('users').doc(currentUserId);
        const updateData = {};
        updateData[key] = value;
        updateData['updatedAt'] = firebase.firestore.FieldValue.serverTimestamp();
        await docRef.set(updateData, { merge: true });
        console.log(`[Bridge] Firestore同期完了: ${key}`);
      } catch (err) {
        console.error(`[Bridge] Firestore同期エラー (${key}):`, err);
      }
    }, DEBOUNCE_MS);
  }

  // ─── localStorageのsetItemをオーバーライド ───
  localStorage.setItem = function (key, value) {
    // まず通常通りlocalStorageに保存
    originalSetItem(key, value);

    // 管理対象キーならFirestoreにも同期
    if (SYNC_KEYS.includes(key) && !isSyncingFromFirestore) {
      syncToFirestore(key, value);
    }
  };

  // ─── Firestoreからデータを読み込んでlocalStorageに反映 ───
  async function loadFromFirestore(userId) {
    try {
      const docRef = db.collection('users').doc(userId);
      const doc = await docRef.get();

      if (doc.exists) {
        const data = doc.data();
        isSyncingFromFirestore = true;

        SYNC_KEYS.forEach(key => {
          if (data[key] !== undefined && data[key] !== null) {
            originalSetItem(key, data[key]);
            console.log(`[Bridge] Firestore→localStorage: ${key}`);
          }
        });

        isSyncingFromFirestore = false;
        return true; // データあり
      }
      return false; // データなし
    } catch (err) {
      console.error('[Bridge] Firestore読み込みエラー:', err);
      isSyncingFromFirestore = false;
      return false;
    }
  }

  // ─── 既存localStorageデータをFirestoreにマイグレーション ───
  async function migrateLocalDataToFirestore(userId) {
    const migrationFlag = originalGetItem(MIGRATION_KEY);
    if (migrationFlag === userId) {
      console.log('[Bridge] マイグレーション済み（スキップ）');
      return;
    }

    const localData = {};
    let hasData = false;

    SYNC_KEYS.forEach(key => {
      const val = originalGetItem(key);
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localData[key] = val;
            hasData = true;
          }
        } catch {
          // JSON解析失敗 → スキップ
        }
      }
    });

    if (!hasData) {
      console.log('[Bridge] マイグレーション対象データなし');
      originalSetItem(MIGRATION_KEY, userId);
      return;
    }

    // Firestoreに既にデータがあるか確認
    const docRef = db.collection('users').doc(userId);
    const doc = await docRef.get();

    if (doc.exists) {
      const existingData = doc.data();
      const hasExistingData = SYNC_KEYS.some(key => {
        if (!existingData[key]) return false;
        try {
          const parsed = JSON.parse(existingData[key]);
          return Array.isArray(parsed) && parsed.length > 0;
        } catch {
          return false;
        }
      });

      if (hasExistingData) {
        // Firestoreにもローカルにもデータがある場合
        const shouldMerge = confirm(
          'このデバイスに保存されたデータと、サーバーに保存されたデータの両方が見つかりました。\n\n' +
          '「OK」→ サーバーのデータを使用（このデバイスのデータは破棄）\n' +
          '「キャンセル」→ このデバイスのデータをサーバーにアップロード'
        );

        if (shouldMerge) {
          // サーバーデータを使用
          console.log('[Bridge] サーバーデータを使用');
          await loadFromFirestore(userId);
          originalSetItem(MIGRATION_KEY, userId);
          return;
        }
        // ローカルデータをアップロード（以下で実行）
      }
    }

    // ローカルデータをFirestoreにアップロード
    try {
      const uploadData = { updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
      SYNC_KEYS.forEach(key => {
        if (localData[key]) {
          uploadData[key] = localData[key];
        }
      });
      await docRef.set(uploadData, { merge: true });
      console.log('[Bridge] マイグレーション完了: ローカルデータをFirestoreにアップロード');
      originalSetItem(MIGRATION_KEY, userId);
    } catch (err) {
      console.error('[Bridge] マイグレーションエラー:', err);
    }
  }

  // ─── Firestoreリアルタイムリスナー開始 ───
  function startRealtimeSync(userId) {
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }

    const docRef = db.collection('users').doc(userId);
    unsubscribeSnapshot = docRef.onSnapshot((doc) => {
      if (!doc.exists) return;
      const data = doc.data();

      // ローカルの書き込みから発火した場合はスキップ
      // (metadata.hasPendingWrites が true の場合はローカル書き込みの反映)
      if (doc.metadata.hasPendingWrites) return;

      isSyncingFromFirestore = true;
      let changed = false;

      SYNC_KEYS.forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          const currentLocal = originalGetItem(key);
          if (currentLocal !== data[key]) {
            originalSetItem(key, data[key]);
            changed = true;
            console.log(`[Bridge] リアルタイム同期: ${key}`);
          }
        }
      });

      isSyncingFromFirestore = false;

      // データが変更された場合、Reactの状態を更新するためにページをリロード
      // （別デバイスからの変更を反映するため）
      if (changed && appLoaded) {
        console.log('[Bridge] 別デバイスからの変更を検出。リロードします。');
        location.reload();
      }
    }, (err) => {
      console.error('[Bridge] リアルタイムリスナーエラー:', err);
    });
  }

  // ─── bundle.js のロードを制御 ───
  // index.htmlでbundle.jsのscriptタグに id="app-bundle" を付与し、
  // 初期状態では type="text/plain" にしておく（実行を防ぐ）。
  // 認証・データ同期完了後にここでロードする。
  function loadAppBundle() {
    if (appLoaded) return;
    appLoaded = true;

    const bundleScript = document.getElementById('app-bundle');
    if (bundleScript) {
      // 新しいscriptタグを作成して実行
      const newScript = document.createElement('script');
      newScript.src = bundleScript.getAttribute('data-src');
      newScript.onload = () => {
        console.log('[Bridge] アプリバンドル読み込み完了');
      };
      newScript.onerror = () => {
        console.error('[Bridge] アプリバンドル読み込みエラー');
      };
      document.body.appendChild(newScript);
    }
  }

  // ─── 認証状態の監視（メインフロー） ───
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      // ─── ログイン済み ───
      currentUserId = user.uid;
      console.log('[Bridge] ユーザー認証済み:', user.email);

      // 1. マイグレーション（初回のみ）
      await migrateLocalDataToFirestore(user.uid);

      // 2. Firestoreからデータ読み込み
      await loadFromFirestore(user.uid);

      // 3. リアルタイム同期開始
      startRealtimeSync(user.uid);

      // 4. 認証UI非表示
      if (window.__firebaseAuthUI) {
        window.__firebaseAuthUI.hideLoading();
        window.__firebaseAuthUI.hideLogin();
      }

      // 5. アプリ（bundle.js）をロード
      loadAppBundle();

    } else {
      // ─── 未ログイン ───
      currentUserId = null;

      // リアルタイムリスナー解除
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      // ログインUI表示
      if (window.__firebaseAuthUI) {
        window.__firebaseAuthUI.hideLoading();
        window.__firebaseAuthUI.showLogin();
      }
    }
  });

  console.log('[Bridge] 初期化完了');
})();
