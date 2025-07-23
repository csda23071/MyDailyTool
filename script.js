document.addEventListener('DOMContentLoaded', () => {
    // --- 要素の取得 ---
    const showHabitTrackerButton = document.getElementById('show-habit-tracker');
    const showStudyTimerButton = document.getElementById('show-study-timer');
    const habitTrackerSection = document.getElementById('habit-tracker-section');
    const studyTimerSection = document.getElementById('study-timer-section');

    // 習慣トラッカー関連
    const newHabitInput = document.getElementById('new-habit-input');
    const addHabitButton = document.getElementById('add-habit-button');
    const habitListUl = document.getElementById('habit-list');
    const clearAllChecksButton = document.getElementById('clear-all-checks-button');

    // タイマー関連
    const workTimeSettingDiv = document.getElementById('work-time-setting');
    const breakTimeSettingDiv = document.getElementById('break-time-setting');
    const workTimeMinutesInput = document.getElementById('work-time-minutes-input');
    const workTimeSecondsInput = document.getElementById('work-time-seconds-input');
    const breakTimeMinutesInput = document.getElementById('break-time-minutes-input');
    const saveTimerSettingsButton = document.getElementById('save-timer-settings');
    const toggleDisplayTypeButton = document.getElementById('toggle-display-type-button');
    const timerTypeDisplay = document.getElementById('timer-type');
    const timeDisplay = document.getElementById('time-display');
    const startTimerButton = document.getElementById('start-timer-button');
    const pauseTimerButton = document.getElementById('pause-timer-button');
    const resetTimerButton = document.getElementById('reset-timer-button');
    const recordTimerButton = document.getElementById('record-timer-button');
    const timerRecordList = document.getElementById('timer-record-list');
    const clearTimerRecordsButton = document.getElementById('clear-timer-records-button');

    // ★追加：カスタムアラートの要素を取得
    const customAlertModal = document.getElementById('custom-alert-modal');
    let modalMessage = document.getElementById('modal-message'); // let に変更
    let modalOkButton = document.getElementById('modal-ok-button'); // let に変更

    // --- グローバル変数 ---
    let habits = [];
    let timerInterval = null;
    let currentTimerType = 'work';
    let currentSettingDisplayType = 'work';
    let remainingTime = 0;

    let workTimeTotalSeconds = 30 * 60;
    let breakTimeTotalSeconds = 5 * 60;

    let timerRecords = [];

    // 通知音をグローバルスコープで管理できるように変更
    // nullで初期化し、必要になったらAudioオブジェクトを割り当てる
    let notificationAudio = null;

    // --- 共通機能・ヘルパー関数の定義 ---

    // タイマー表示を更新
    const updateTimerDisplay = () => {
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        timerTypeDisplay.textContent = currentTimerType === 'work' ? '作業' : '休憩';
        document.title = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} | ${currentTimerType === 'work' ? '作業' : '休憩'}タイマー`;
    };

    // 設定表示の切り替え
    const updateSettingDisplay = () => {
        if (currentSettingDisplayType === 'work') {
            workTimeSettingDiv.classList.add('active-setting');
            workTimeSettingDiv.classList.remove('hidden-setting');
            breakTimeSettingDiv.classList.add('hidden-setting');
            breakTimeSettingDiv.classList.remove('active-setting');
        } else {
            workTimeSettingDiv.classList.add('hidden-setting');
            workTimeSettingDiv.classList.remove('active-setting');
            breakTimeSettingDiv.classList.add('active-setting');
            breakTimeSettingDiv.classList.remove('hidden-setting');
        }
    };

    // 通知音を鳴らす（変更あり）
    const playNotificationSound = () => {
        // 既存のAudioオブジェクトがあれば停止し、新しいものを作成して再生
        if (notificationAudio) {
            notificationAudio.pause();
            notificationAudio.currentTime = 0; // 最初から再生
        }
        notificationAudio = new Audio('notification.mp3');
        notificationAudio.loop = true; // ★追加：音をループ再生
        notificationAudio.play().catch(e => console.error("通知音の再生に失敗しました:", e));
    };

    // 通知音を停止する（新規追加）
    const stopNotificationSound = () => {
        if (notificationAudio) {
            notificationAudio.pause();
            notificationAudio.currentTime = 0; // 再生位置を最初に戻す
            notificationAudio = null; // リソース解放のためnullにする
        }
    };

    // カスタムポップアップを表示する関数（新規追加）
    const showCustomAlert = (message, onOkCallback) => {
        modalMessage.textContent = message;
        customAlertModal.classList.remove('hidden-modal'); // display: none を解除
        // setTimeoutで少し遅延させてactive-modalを追加し、CSSアニメーションをトリガー
        setTimeout(() => {
            customAlertModal.classList.add('active-modal');
        }, 10); // わずかな遅延

        // OKボタンのイベントリスナーを一度だけ追加（複数回呼ばれるのを防ぐ）
        // cloneNode(true) で既存の要素を複製し、古いイベントリスナーを削除する
        const oldModalOkButton = modalOkButton;
        const newModalOkButton = oldModalOkButton.cloneNode(true);
        oldModalOkButton.parentNode.replaceChild(newModalOkButton, oldModalOkButton);
        modalOkButton = newModalOkButton; // 新しい要素を再割り当て

        modalOkButton.addEventListener('click', () => {
            customAlertModal.classList.remove('active-modal');
            // アニメーション完了後にdisplay: none; に戻す
            customAlertModal.addEventListener('transitionend', function handler() {
                customAlertModal.classList.add('hidden-modal');
                customAlertModal.removeEventListener('transitionend', handler); // イベントリスナーを削除
            });

            stopNotificationSound(); // 音を停止
            if (onOkCallback) {
                onOkCallback(); // OK後の処理を実行
            }
        });
    };


    // タイマータイプを切り替えて、必要なら開始する関数 (自動終了時と手動切り替えの両方で使用)
    const switchTimerTypeAndStart = (isAutoStart = false) => {
        pauseTimer(); // 切り替える前に必ずタイマーを停止

        if (currentTimerType === 'work') {
            currentTimerType = 'break';
            currentSettingDisplayType = 'break'; // 設定表示のタイプも連動
            remainingTime = breakTimeTotalSeconds;
        } else {
            currentTimerType = 'work';
            currentSettingDisplayType = 'work'; // 設定表示のタイプも連動
            remainingTime = workTimeTotalSeconds;
        }

        updateTimerDisplay(); // タイマー本体の表示を更新
        updateSettingDisplay(); // 設定入力欄の表示を更新

        // isAutoStart が true で、かつ残り時間が0より大きい場合にのみ、新しいタイマーを自動的に開始
        if (isAutoStart && remainingTime > 0) {
            startTimer();
        }
    };

    // タイマー記録を追加 (タイプに応じてメッセージを変更)
    const addTimerRecord = (recordType) => {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // 記録時点の経過時間を正確に計算
        const totalTimeForCurrentType = currentTimerType === 'work' ? workTimeTotalSeconds : breakTimeTotalSeconds;
        const actualElapsedTime = totalTimeForCurrentType - remainingTime;

        const elapsedMinutes = Math.floor(actualElapsedTime / 60);
        const elapsedSeconds = actualElapsedTime % 60;
        const formattedElapsedTime = `${elapsedMinutes.toString().padStart(2, '0')}分${elapsedSeconds.toString().padStart(2, '0')}秒`;

        // 記録時点の残り時間
        const remainingMinutes = Math.floor(remainingTime / 60);
        const remainingSeconds = remainingTime % 60;
        const formattedRemainingTime = `${remainingMinutes.toString().padStart(2, '0')}分${remainingSeconds.toString().padStart(2, '0')}秒`;

        let recordContent = '';
        if (recordType === 'auto') {
            recordContent = `自動記録 (${currentTimerType === 'work' ? '作業' : '休憩'}): 経過 ${formattedElapsedTime} (残り ${formattedRemainingTime})`;
        } else if (recordType === 'manual') {
            recordContent = `手動記録 (${currentTimerType === 'work' ? '作業' : '休憩'}): 経過 ${formattedElapsedTime} (残り ${formattedRemainingTime})`;
        }

        if (recordContent) {
            const recordText = `${recordContent} @ ${timeString}`;
            timerRecords.push(recordText);
            saveTimerRecords(); // Local Storageに保存
            renderTimerRecords();
        }
    };

    // タイマー記録をUIに描画
    const renderTimerRecords = () => {
        timerRecordList.innerHTML = '';
        timerRecords.forEach(record => {
            const listItem = document.createElement('li');
            listItem.textContent = record;
            timerRecordList.appendChild(listItem);
        });
        timerRecordList.scrollTop = timerRecordList.scrollHeight;
    };

    // タイマー記録をすべて削除
    const clearTimerRecords = () => {
        if (confirm('本当にすべてのタイマー記録を削除しますか？')) {
            timerRecords = [];
            saveTimerRecords();
            renderTimerRecords();
        }
    };

    // --- 共通機能 ---

    // 画面遷移ロジック
    showHabitTrackerButton.addEventListener('click', () => {
        habitTrackerSection.classList.add('active-section');
        habitTrackerSection.classList.remove('hidden-section');
        studyTimerSection.classList.add('hidden-section');
        studyTimerSection.classList.remove('active-section');
        showHabitTrackerButton.classList.add('active');
        showStudyTimerButton.classList.remove('active');
    });

    showStudyTimerButton.addEventListener('click', () => {
        studyTimerSection.classList.add('active-section');
        studyTimerSection.classList.remove('hidden-section');
        habitTrackerSection.classList.add('hidden-section');
        habitTrackerSection.classList.remove('active-section');
        updateTimerDisplay();
        updateSettingDisplay();
        showStudyTimerButton.classList.add('active');
        showHabitTrackerButton.classList.remove('active');
    });

    // 初期タブのアクティブ状態を設定
    // CSSでactiveクラスを初期設定にしているので、ここでは不要
    // if (habitTrackerSection.classList.contains('active-section')) {
    //     showHabitTrackerButton.classList.add('active');
    // } else {
    //     showStudyTimerButton.classList.add('active');
    // }

    // --- 習慣トラッカー機能 ---

    // localStorageから習慣をロード
    const loadHabits = () => {
        const storedHabits = localStorage.getItem('habits');
        if (storedHabits) {
            try { // JSON.parseのエラーハンドリングを追加
                habits = JSON.parse(storedHabits);
            } catch (e) {
                console.error("習慣データの読み込みに失敗しました。データをリセットします。", e);
                habits = []; // データが不正な場合はリセット
                saveHabits(); // 空のデータを保存して次回以降のエラーを防ぐ
            }
        } else {
            habits = [];
        }
        renderHabits();
    };

    // 習慣をlocalStorageに保存
    const saveHabits = () => {
        localStorage.setItem('habits', JSON.stringify(habits));
    };

    // 習慣リストをUIに描画
    const renderHabits = () => {
        habitListUl.innerHTML = '';
        habits.forEach(habit => {
            const listItem = document.createElement('li');
            if (habit.isCompleted) {
                listItem.classList.add('completed');
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = habit.isCompleted;
            checkbox.addEventListener('change', () => {
                habit.isCompleted = checkbox.checked;
                if (habit.isCompleted) {
                    listItem.classList.add('completed');
                } else {
                    listItem.classList.remove('completed');
                }
                saveHabits();
            });

            const textSpan = document.createElement('span');
            textSpan.textContent = habit.name;
            textSpan.classList.add('habit-text');

            const deleteButton = document.createElement('button');
            deleteButton.textContent = '削除';
            deleteButton.classList.add('delete-habit-button');
            deleteButton.addEventListener('click', () => {
                deleteHabit(habit.id);
            });

            listItem.appendChild(checkbox);
            listItem.appendChild(textSpan);
            listItem.appendChild(deleteButton);
            habitListUl.appendChild(listItem);
        });
    };

    // 新しい習慣を追加
    const addHabit = () => {
        const habitText = newHabitInput.value.trim();
        if (habitText) {
            const newHabit = {
                id: Date.now().toString(),
                name: habitText,
                isCompleted: false
            };
            habits.push(newHabit);
            newHabitInput.value = '';
            saveHabits();
            renderHabits();
        }
    };

    // 習慣を削除
    const deleteHabit = (idToDelete) => {
        habits = habits.filter(habit => habit.id !== idToDelete);
        saveHabits();
        renderHabits();
    };

    // すべてのチェックを解除する機能
    const clearAllHabitChecks = () => {
        habits.forEach(habit => {
            habit.isCompleted = false;
        });
        saveHabits();
        renderHabits();
    };

    // 習慣トラッカーのイベントリスナー
    addHabitButton.addEventListener('click', addHabit);
    newHabitInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addHabit();
        }
    });
    clearAllChecksButton.addEventListener('click', clearAllHabitChecks);

    // 習慣トラッカーの初期ロード
    loadHabits();

    // --- タイマー機能 ---

    // localStorageからタイマー設定と記録をロードし、入力フィールドに反映
    const loadTimerSettings = () => {
        const storedWorkTime = localStorage.getItem('workTime');
        const storedBreakTime = localStorage.getItem('breakTime');
        const storedTimerRecords = localStorage.getItem('timerRecords');

        // 作業時間の設定
        if (storedWorkTime !== null) {
            workTimeTotalSeconds = parseInt(storedWorkTime, 10);
        } else {
            workTimeTotalSeconds = 30 * 60;
        }
        workTimeMinutesInput.value = Math.floor(workTimeTotalSeconds / 60);
        workTimeSecondsInput.value = workTimeTotalSeconds % 60;

        // 休憩時間の設定
        if (storedBreakTime !== null) {
            breakTimeTotalSeconds = parseInt(storedBreakTime, 10);
        } else {
            breakTimeTotalSeconds = 5 * 60;
        }
        breakTimeMinutesInput.value = Math.floor(breakTimeTotalSeconds / 60);

        // タイマーモードと残り時間の初期設定
        currentTimerType = 'work';
        currentSettingDisplayType = 'work';
        remainingTime = workTimeTotalSeconds;

        // 記録のロード
        if (storedTimerRecords) {
            try { // JSON.parseのエラーハンドリングを追加
                timerRecords = JSON.parse(storedTimerRecords);
            } catch (e) {
                console.error("タイマー記録データの読み込みに失敗しました。データをリセットします。", e);
                timerRecords = []; // データが不正な場合はリセット
                saveTimerRecords(); // 空のデータを保存して次回以降のエラーを防ぐ
            }
        } else {
            timerRecords = [];
        }
        renderTimerRecords();

        updateTimerDisplay();
        updateSettingDisplay();
    };

    // タイマー設定をlocalStorageに保存
    const saveTimerSettings = () => {
        localStorage.setItem('workTime', workTimeTotalSeconds.toString());
        localStorage.setItem('breakTime', breakTimeTotalSeconds.toString());
    };

    // タイマー設定を保存ボタンのイベントリスナー
    saveTimerSettingsButton.addEventListener('click', () => {
        const newWorkMinutes = parseInt(workTimeMinutesInput.value, 10);
        const newWorkSeconds = parseInt(workTimeSecondsInput.value, 10);
        const newBreakMinutes = parseInt(breakTimeMinutesInput.value, 10);

        const newWorkTotalSeconds = (newWorkMinutes * 60) + newWorkSeconds;
        const newBreakTotalSeconds = (newBreakMinutes * 60);

        if (isNaN(newWorkTotalSeconds) || newWorkTotalSeconds < 0 ||
            isNaN(newBreakTotalSeconds) || newBreakTotalSeconds < 0 ||
            isNaN(newWorkSeconds) || newWorkSeconds < 0 || newWorkSeconds > 59) {
            showCustomAlert('作業時間と休憩時間は正しく設定してください（分は0以上、秒は0〜59）。', null);
            return;
        }
        if (newWorkTotalSeconds === 0 && newBreakTotalSeconds === 0) {
            showCustomAlert('作業時間または休憩時間のいずれか一方、または両方を1秒以上に設定してください。', null);
            return;
        }

        workTimeTotalSeconds = newWorkTotalSeconds;
        breakTimeTotalSeconds = newBreakTotalSeconds;
        saveTimerSettings();

        if (currentSettingDisplayType === 'work') {
            currentTimerType = 'work';
            remainingTime = workTimeTotalSeconds;
        } else {
            currentTimerType = 'break';
            remainingTime = breakTimeTotalSeconds;
        }
        pauseTimer();
        updateTimerDisplay();
        showCustomAlert('タイマー設定を保存しました。', null);
    });


    // タイマーを開始
    const startTimer = () => {
        if (timerInterval) return;
        if (remainingTime <= 0) {
            showCustomAlert('タイマーが0のため開始できません。リセットするか設定を変更してください。', null);
            return;
        }

        timerInterval = setInterval(() => {
            remainingTime--;
            updateTimerDisplay();

            if (remainingTime <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                playNotificationSound(); // 音を鳴らす

                showCustomAlert(`${currentTimerType === 'work' ? '作業' : '休憩'}時間終了！`, () => {
                    addTimerRecord('auto'); // 自動記録
                    switchTimerTypeAndStart(true);
                });
            }
        }, 1000);
    };

    // タイマーを一時停止
    const pauseTimer = () => {
        clearInterval(timerInterval);
        timerInterval = null;
    };

    // タイマーをリセット
    const resetTimer = () => {
        pauseTimer();
        if (currentTimerType === 'work') {
            remainingTime = workTimeTotalSeconds;
        } else {
            remainingTime = breakTimeTotalSeconds;
        }
        updateTimerDisplay();
    };

    // タイマー関連のイベントリスナー
    startTimerButton.addEventListener('click', startTimer);
    pauseTimerButton.addEventListener('click', pauseTimer);
    resetTimerButton.addEventListener('click', resetTimer);
    recordTimerButton.addEventListener('click', () => {
        addTimerRecord('manual');
    });
    clearTimerRecordsButton.addEventListener('click', clearTimerRecords);

    // タイマー設定の初期ロードと表示
    loadTimerSettings();
});
