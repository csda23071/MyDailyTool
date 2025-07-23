document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded! Script execution started.');

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

    // カスタムアラートの要素を取得
    const customAlertModal = document.getElementById('custom-alert-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalOkButton = document.getElementById('modal-ok-button');

    // 要素が正しく取得されているか確認
    console.log('Elements Check:');
    console.log('recordTimerButton:', recordTimerButton);
    console.log('timerRecordList:', timerRecordList);
    console.log('customAlertModal:', customAlertModal);
    // 他の重要な要素も適宜ログに追加して確認できます

    // --- グローバル変数 ---
    let habits = [];
    let timerInterval = null;
    let currentTimerType = 'work';
    let currentSettingDisplayType = 'work';
    let remainingTime = 0;

    let workTimeTotalSeconds = 30 * 60;
    let breakTimeTotalSeconds = 5 * 60;

    let timerRecords = [];

    let notificationAudio = null;

    // --- 共通機能・ヘルパー関数の定義 ---

    // localStorageにタイマー記録を保存
    const saveTimerRecords = () => {
        try {
            localStorage.setItem('timerRecords', JSON.stringify(timerRecords));
            console.log('Timer records saved to localStorage.'); // デバッグ用
        } catch (e) {
            console.error('Failed to save timer records to localStorage:', e);
            showCustomAlert('記録の保存に失敗しました。ブラウザのストレージがいっぱいかもしれません。', null);
        }
    };

    // タイマー記録をUIに描画
    const renderTimerRecords = () => {
        console.log('renderTimerRecords called. Current records:', timerRecords); // デバッグ用
        timerRecordList.innerHTML = '';
        timerRecords.forEach(record => {
            const listItem = document.createElement('li');
            listItem.textContent = record;
            timerRecordList.appendChild(listItem);
        });
        timerRecordList.scrollTop = timerRecordList.scrollHeight;
    };

    // localStorageからタイマー設定と記録をロードし、入力フィールドに反映
    const loadTimerSettings = () => {
        console.log('Loading timer settings and records from localStorage.'); // デバッグ用
        const storedWorkTime = localStorage.getItem('workTime');
        const storedBreakTime = localStorage.getItem('breakTime');
        const storedTimerRecords = localStorage.getItem('timerRecords');

        // 作業時間の設定
        if (storedWorkTime !== null) {
            workTimeTotalSeconds = parseInt(storedWorkTime, 10);
            console.log('Loaded workTime:', workTimeTotalSeconds); // デバッグ用
        } else {
            workTimeTotalSeconds = 30 * 60;
            console.log('No workTime found, setting default:', workTimeTotalSeconds); // デバッグ用
        }
        workTimeMinutesInput.value = Math.floor(workTimeTotalSeconds / 60);
        workTimeSecondsInput.value = workTimeTotalSeconds % 60;

        // 休憩時間の設定
        if (storedBreakTime !== null) {
            breakTimeTotalSeconds = parseInt(storedBreakTime, 10);
            console.log('Loaded breakTime:', breakTimeTotalSeconds); // デバッグ用
        } else {
            breakTimeTotalSeconds = 5 * 60;
            console.log('No breakTime found, setting default:', breakTimeTotalSeconds); // デバッグ用
        }
        breakTimeMinutesInput.value = Math.floor(breakTimeTotalSeconds / 60);

        // タイマーモードと残り時間の初期設定
        currentTimerType = 'work';
        currentSettingDisplayType = 'work';
        remainingTime = workTimeTotalSeconds;

        // 記録のロード
        if (storedTimerRecords) {
            try {
                timerRecords = JSON.parse(storedTimerRecords);
                console.log('Timer records loaded successfully:', timerRecords); // デバッグ用
            } catch (e) {
                console.error("タイマー記録データの読み込みに失敗しました。データをリセットします。", e);
                timerRecords = [];
                saveTimerRecords();
                showCustomAlert('タイマー記録データの読み込みに失敗しました。データが破損している可能性があります。', null);
            }
        } else {
            timerRecords = [];
            console.log('No timer records found in localStorage. Initializing empty array.'); // デバッグ用
        }
        renderTimerRecords();

        updateTimerDisplay();
        updateSettingDisplay();
    };

    // タイマー表示を更新
    const updateTimerDisplay = () => {
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        timerTypeDisplay.textContent = currentTimerType === 'work' ? '作業' : '休憩';
        document.title = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} | ${currentTimerType === 'work' ? '作業' : '休憩'}タイマー`;
        // console.log('Timer Display Updated:', timeDisplay.textContent); // デバッグ用
    };

    // 設定表示の切り替え
    const updateSettingDisplay = () => {
        if (currentSettingDisplayType === 'work') {
            workTimeSettingDiv.classList.add('active-setting');
            workTimeSettingDiv.classList.remove('hidden-setting');
            breakTimeSettingDiv.classList.add('hidden-section'); // ここは hidden-section が正しい
            breakTimeSettingDiv.classList.remove('active-setting');
        } else {
            workTimeSettingDiv.classList.add('hidden-section'); // ここは hidden-section が正しい
            workTimeSettingDiv.classList.remove('active-setting');
            breakTimeSettingDiv.classList.add('active-setting');
            breakTimeSettingDiv.classList.remove('hidden-section');
        }
        // console.log('Setting Display Updated. Current type:', currentSettingDisplayType); // デバッグ用
    };

    // 通知音を鳴らす
    const playNotificationSound = () => {
        console.log('Attempting to play notification sound.'); // デバッグ用
        if (notificationAudio) {
            notificationAudio.pause();
            notificationAudio.currentTime = 0;
        }
        notificationAudio = new Audio('notification.mp3'); // notification.mp3 を用意してください
        notificationAudio.loop = true; // 音をループ再生
        notificationAudio.play().catch(e => console.error("通知音の再生に失敗しました:", e));
    };

    // 通知音を停止する
    const stopNotificationSound = () => {
        console.log('Attempting to stop notification sound.'); // デバッグ用
        if (notificationAudio) {
            notificationAudio.pause();
            notificationAudio.currentTime = 0;
            notificationAudio = null;
        }
    };

    // カスタムポップアップを表示する関数
    let currentAlertCallback = null;

    // OKボタンのイベントリスナーを一度だけ設定
    modalOkButton.addEventListener('click', () => {
        console.log('Alert OK button clicked.'); // デバッグ用
        customAlertModal.classList.remove('active-modal');
        customAlertModal.addEventListener('transitionend', function handler() {
            customAlertModal.classList.add('hidden-modal');
            customAlertModal.removeEventListener('transitionend', handler);
        });

        stopNotificationSound();
        if (currentAlertCallback) {
            currentAlertCallback();
            currentAlertCallback = null;
        }
    });

    const showCustomAlert = (message, onOkCallback) => {
        console.log('Showing custom alert:', message); // デバッグ用
        modalMessage.textContent = message;
        currentAlertCallback = onOkCallback;

        customAlertModal.classList.remove('hidden-modal');
        setTimeout(() => {
            customAlertModal.classList.add('active-modal');
        }, 10);
    };


    // タイマータイプを切り替えて、必要なら開始する関数
    const switchTimerTypeAndStart = (isAutoStart = false) => {
        console.log('switchTimerTypeAndStart called. isAutoStart:', isAutoStart); // デバッグ用
        pauseTimer();

        if (currentTimerType === 'work') {
            currentTimerType = 'break';
            currentSettingDisplayType = 'break';
            remainingTime = breakTimeTotalSeconds;
        } else {
            currentTimerType = 'work';
            currentSettingDisplayType = 'work';
            remainingTime = workTimeTotalSeconds;
        }

        updateTimerDisplay();
        updateSettingDisplay();

        if (isAutoStart && remainingTime > 0) {
            startTimer();
        }
    };

    // タイマー記録を追加 (タイプに応じてメッセージを変更)
    const addTimerRecord = (recordType) => {
        console.log('addTimerRecord called. recordType:', recordType); // デバッグ用
        const now = new Date();
        const timeString = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        let totalTimeForRecord = 0;
        let timePassedForRecord = 0;

        if (recordType === 'auto') {
            totalTimeForRecord = (currentTimerType === 'work') ? workTimeTotalSeconds : breakTimeTotalSeconds;
            timePassedForRecord = totalTimeForRecord;
            console.log(`Auto record - Current Timer Type: ${currentTimerType}, Total Time: ${totalTimeForRecord}, Time Passed: ${timePassedForRecord}`);
        } else { // 'manual' の場合
            totalTimeForRecord = (currentTimerType === 'work') ? workTimeTotalSeconds : breakTimeTotalSeconds;
            timePassedForRecord = totalTimeForRecord - remainingTime;
            console.log(`Manual record - Current Timer Type: ${currentTimerType}, Total Time: ${totalTimeForRecord}, Time Passed: ${timePassedForRecord}, Remaining: ${remainingTime}`);
        }
        
        const elapsedMinutes = Math.floor(timePassedForRecord / 60);
        const elapsedSeconds = timePassedForRecord % 60;
        const formattedElapsedTime = `${elapsedMinutes.toString().padStart(2, '0')}分${elapsedSeconds.toString().padStart(2, '0')}秒`;

        const currentRemainingMinutes = Math.floor(remainingTime / 60);
        const currentRemainingSeconds = remainingTime % 60;
        const formattedCurrentRemainingTime = `${currentRemainingMinutes.toString().padStart(2, '0')}分${currentRemainingSeconds.toString().padStart(2, '0')}秒`;

        let recordContent = '';
        if (recordType === 'auto') {
            recordContent = `自動終了 (${currentTimerType === 'work' ? '作業' : '休憩'}): 経過 ${formattedElapsedTime}`;
        } else if (recordType === 'manual') {
            recordContent = `手動記録 (${currentTimerType === 'work' ? '作業' : '休憩'}): 経過 ${formattedElapsedTime} (残り ${formattedCurrentRemainingTime})`;
        }

        if (recordContent) {
            const recordText = `${recordContent} @ ${timeString}`;
            console.log('Adding record:', recordText); // デバッグ用
            timerRecords.push(recordText);
            saveTimerRecords(); // ここで saveTimerRecords が呼ばれる
            renderTimerRecords();
        } else {
            console.log('Record content was empty, not adding record.'); // デバッグ用
        }
    };

    // タイマー記録をすべて削除
    const clearTimerRecords = () => {
        console.log('clearTimerRecords called.'); // デバッグ用
        if (confirm('本当にすべてのタイマー記録を削除しますか？')) {
            timerRecords = [];
            saveTimerRecords();
            renderTimerRecords();
            console.log('All timer records cleared.'); // デバッグ用
        }
    };

    // --- 共通機能 ---

    // 画面遷移ロジック
    showHabitTrackerButton.addEventListener('click', () => {
        console.log('習慣トラッカーボタンがクリックされました！'); // デバッグ用
        habitTrackerSection.classList.add('active-section');
        habitTrackerSection.classList.remove('hidden-section');
        studyTimerSection.classList.add('hidden-section');
        studyTimerSection.classList.remove('active-section');
        showHabitTrackerButton.classList.add('active');
        showStudyTimerButton.classList.remove('active');
    });

    showStudyTimerButton.addEventListener('click', () => {
        console.log('タイマーボタンがクリックされました！'); // デバッグ用
        studyTimerSection.classList.add('active-section');
        studyTimerSection.classList.remove('hidden-section');
        habitTrackerSection.classList.add('hidden-section');
        habitTrackerSection.classList.remove('active-section');
        updateTimerDisplay();
        updateSettingDisplay();
        showStudyTimerButton.classList.add('active');
        showHabitTrackerButton.classList.remove('active');
    });


    // --- 習慣トラッカー機能 ---

    // localStorageから習慣をロード
    const loadHabits = () => {
        console.log('Loading habits from localStorage.'); // デバッグ用
        const storedHabits = localStorage.getItem('habits');
        if (storedHabits) {
            try {
                habits = JSON.parse(storedHabits);
                console.log('Habits loaded successfully:', habits); // デバッグ用
            } catch (e) {
                console.error("習慣データの読み込みに失敗しました。データをリセットします。", e);
                habits = [];
                saveHabits();
                showCustomAlert('習慣データの読み込みに失敗しました。データが破損している可能性があります。', null);
            }
        } else {
            habits = [];
            console.log('No habits found in localStorage. Initializing empty array.'); // デバッグ用
        }
        renderHabits();
    };

    // 習慣をlocalStorageに保存
    const saveHabits = () => {
        try {
            localStorage.setItem('habits', JSON.stringify(habits));
            console.log('Habits saved to localStorage.'); // デバッグ用
        } catch (e) {
            console.error('Failed to save habits to localStorage:', e);
            showCustomAlert('習慣の保存に失敗しました。ブラウザのストレージがいっぱいかもしれません。', null);
        }
    };

    // 習慣リストをUIに描画
    const renderHabits = () => {
        console.log('renderHabits called. Current habits:', habits); // デバッグ用
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
                console.log(`Habit "${habit.name}" completion status changed to: ${habit.isCompleted}`); // デバッグ用
            });

            const textSpan = document.createElement('span');
            textSpan.textContent = habit.name;
            textSpan.classList.add('habit-text');

            const deleteButton = document.createElement('button');
            deleteButton.textContent = '削除';
            deleteButton.classList.add('delete-habit-button');
            deleteButton.addEventListener('click', () => {
                deleteHabit(habit.id);
                console.log(`Delete button clicked for habit ID: ${habit.id}`); // デバッグ用
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
            console.log('New habit added:', newHabit.name); // デバッグ用
        } else {
            console.log('Attempted to add empty habit.'); // デバッグ用
        }
    };

    // 習慣を削除
    const deleteHabit = (idToDelete) => {
        console.log('Deleting habit with ID:', idToDelete); // デバッグ用
        habits = habits.filter(habit => habit.id !== idToDelete);
        saveHabits();
        renderHabits();
    };

    // すべてのチェックを解除する機能
    const clearAllHabitChecks = () => {
        console.log('Clearing all habit checks.'); // デバッグ用
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

    // タイマー設定をlocalStorageに保存
    const saveTimerSettings = () => {
        try {
            localStorage.setItem('workTime', workTimeTotalSeconds.toString());
            localStorage.setItem('breakTime', breakTimeTotalSeconds.toString());
            console.log('Timer settings saved to localStorage.'); // デバッグ用
        } catch (e) {
            console.error('Failed to save timer settings to localStorage:', e);
            showCustomAlert('設定の保存に失敗しました。ブラウザのストレージがいっぱいかもしれません。', null);
        }
    };

    // タイマー設定を保存ボタンのイベントリスナー
    saveTimerSettingsButton.addEventListener('click', () => {
        console.log('Save Timer Settings button clicked.'); // デバッグ用
        const newWorkMinutes = parseInt(workTimeMinutesInput.value, 10);
        const newWorkSeconds = parseInt(workTimeSecondsInput.value, 10);
        const newBreakMinutes = parseInt(breakTimeMinutesInput.value, 10);

        const newWorkTotalSeconds = (newWorkMinutes * 60) + newWorkSeconds;
        const newBreakTotalSeconds = (newBreakMinutes * 60);

        if (isNaN(newWorkTotalSeconds) || newWorkTotalSeconds < 0 ||
            isNaN(newBreakTotalSeconds) || newBreakTotalSeconds < 0 ||
            isNaN(newWorkSeconds) || newWorkSeconds < 0 || newWorkSeconds > 59) {
            showCustomAlert('作業時間と休憩時間は正しく設定してください（分は0以上、秒は0〜59）。', null);
            console.warn('Invalid timer settings input.'); // デバッグ用
            return;
        }
        if (newWorkTotalSeconds === 0 && newBreakTotalSeconds === 0) {
            showCustomAlert('作業時間または休憩時間のいずれか一方、または両方を1秒以上に設定してください。', null);
            console.warn('Both work and break times are 0.'); // デバッグ用
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
        console.log('Timer settings saved and updated.'); // デバッグ用
    });


    // タイマーを開始
    const startTimer = () => {
        console.log('Start Timer button clicked.'); // デバッグ用
        if (timerInterval) {
            console.log('Timer already running.'); // デバッグ用
            return;
        }
        if (remainingTime <= 0) {
            showCustomAlert('タイマーが0のため開始できません。リセットするか設定を変更してください。', null);
            console.warn('Cannot start timer, remainingTime is 0.'); // デバッグ用
            return;
        }

        timerInterval = setInterval(() => {
            remainingTime--;
            updateTimerDisplay();

            if (remainingTime <= 0) {
                console.log('Timer reached 0. Clearing interval.'); // デバッグ用
                clearInterval(timerInterval);
                timerInterval = null;
                playNotificationSound();

                addTimerRecord('auto');

                showCustomAlert(`${currentTimerType === 'work' ? '作業' : '休憩'}時間終了！`, () => {
                    switchTimerTypeAndStart(true);
                    console.log('Alert OK button clicked, switching to next timer.'); // デバッグ用
                });
            }
        }, 1000);
    };

    // タイマーを一時停止
    const pauseTimer = () => {
        console.log('Pause Timer button clicked. Clearing interval if exists.'); // デバッグ用
        clearInterval(timerInterval);
        timerInterval = null;
    };

    // タイマーをリセット
    const resetTimer = () => {
        console.log('Reset Timer button clicked.'); // デバッグ用
        pauseTimer();
        if (currentTimerType === 'work') {
            remainingTime = workTimeTotalSeconds;
        } else {
            remainingTime = breakTimeTotalSeconds;
        }
        updateTimerDisplay();
        console.log('Timer reset. Remaining time:', remainingTime); // デバッグ用
    };

    // タイマー関連のイベントリスナー
    startTimerButton.addEventListener('click', startTimer);
    pauseTimerButton.addEventListener('click', pauseTimer);
    resetTimerButton.addEventListener('click', resetTimer);
    recordTimerButton.addEventListener('click', () => {
        console.log('Manual Record button clicked.'); // デバッグ用
        addTimerRecord('manual');
    });
    clearTimerRecordsButton.addEventListener('click', clearTimerRecords);

    // タイマー設定の「切り替え」ボタンのイベントリスナー
    toggleDisplayTypeButton.addEventListener('click', () => {
        console.log('Toggle Display Type button clicked.'); // デバッグ用
        pauseTimer();

        if (currentSettingDisplayType === 'work') {
            currentSettingDisplayType = 'break';
            currentTimerType = 'break';
            remainingTime = breakTimeTotalSeconds;
        } else {
            currentSettingDisplayType = 'work';
            currentTimerType = 'work';
            remainingTime = workTimeTotalSeconds;
        }
        
        updateSettingDisplay();
        updateTimerDisplay();
    });

    // タイマー設定の初期ロードと表示
    loadTimerSettings();
    console.log('Initial loadTimerSettings completed.'); // デバッグ用
});
