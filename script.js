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

    // --- グローバル変数 ---
    let habits = [];
    let timerInterval = null;
    let currentTimerType = 'work'; // 'work' or 'break' - タイマー本体の現在のモード
    let currentSettingDisplayType = 'work'; // 'work' or 'break' - 設定表示の現在のモード
    let remainingTime = 0;
    
    // workTimeTotalSecondsとbreakTimeTotalSecondsのデフォルト値を設定
    // loadTimerSettingsでlocalStorageに値がない場合にこれらの値が設定されます
    let workTimeTotalSeconds = 30 * 60; // デフォルトは30分
    let breakTimeTotalSeconds = 5 * 60; // デフォルトは5分
    
    let timerRecords = [];

    // 通知音ファイルへのパスを設定
    const NOTIFICATION_SOUND = new Audio('notification.mp3'); 

    // --- 共通機能 ---

    // 画面遷移ロジック
    showHabitTrackerButton.addEventListener('click', () => {
        habitTrackerSection.classList.add('active-section');
        habitTrackerSection.classList.remove('hidden-section');
        studyTimerSection.classList.add('hidden-section');
        studyTimerSection.classList.remove('active-section');
        // タブのアクティブ状態を切り替え
        showHabitTrackerButton.classList.add('active');
        showStudyTimerButton.classList.remove('active');
    });

    showStudyTimerButton.addEventListener('click', () => {
        studyTimerSection.classList.add('active-section');
        studyTimerSection.classList.remove('hidden-section');
        habitTrackerSection.classList.add('hidden-section');
        habitTrackerSection.classList.remove('active-section');
        // タイマーセクション表示時にタイマーと設定表示を現在のモードに合わせて更新
        updateTimerDisplay();
        updateSettingDisplay();
        // タブのアクティブ状態を切り替え
        showStudyTimerButton.classList.add('active');
        showHabitTrackerButton.classList.remove('active');
    });

    // 初期タブのアクティブ状態を設定
    // アプリケーションロード時にどちらかのセクションがアクティブになっているはずなので、そのタブをactiveにする
    if (habitTrackerSection.classList.contains('active-section')) {
        showHabitTrackerButton.classList.add('active');
    } else {
        showStudyTimerButton.classList.add('active');
    }

    // --- 習慣トラッカー機能 ---

    // localStorageから習慣をロード
    const loadHabits = () => {
        const storedHabits = localStorage.getItem('habits');
        if (storedHabits) {
            habits = JSON.parse(storedHabits);
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
            // Local Storageにない場合のデフォルト値（30分）
            workTimeTotalSeconds = 30 * 60; 
        }
        workTimeMinutesInput.value = Math.floor(workTimeTotalSeconds / 60);
        workTimeSecondsInput.value = workTimeTotalSeconds % 60;

        // 休憩時間の設定
        if (storedBreakTime !== null) {
            breakTimeTotalSeconds = parseInt(storedBreakTime, 10);
        } else {
            // Local Storageにない場合のデフォルト値（5分）
            breakTimeTotalSeconds = 5 * 60;
        }
        breakTimeMinutesInput.value = Math.floor(breakTimeTotalSeconds / 60);

        // タイマーモードと残り時間の初期設定
        // アプリケーション起動時は常に作業モードで開始し、設定された作業時間を表示
        currentTimerType = 'work';
        currentSettingDisplayType = 'work';
        remainingTime = workTimeTotalSeconds; 

        // 記録のロード
        if (storedTimerRecords) {
            timerRecords = JSON.parse(storedTimerRecords);
        } else {
            timerRecords = [];
        }
        renderTimerRecords(); // 記録リストをUIに描画

        updateTimerDisplay(); // タイマー本体の表示を更新
        updateSettingDisplay(); // 設定入力欄の表示を更新
    };

    // タイマー設定をlocalStorageに保存
    const saveTimerSettings = () => {
        localStorage.setItem('workTime', workTimeTotalSeconds.toString());
        localStorage.setItem('breakTime', breakTimeTotalSeconds.toString());
    };

    // タイマー設定を保存ボタンのイベントリスナー
    saveTimerSettingsButton.addEventListener('click', () => {
        // 各入力フィールドから常に最新の値を読み込む
        const newWorkMinutes = parseInt(workTimeMinutesInput.value, 10);
        const newWorkSeconds = parseInt(workTimeSecondsInput.value, 10);
        const newBreakMinutes = parseInt(breakTimeMinutesInput.value, 10);

        const newWorkTotalSeconds = (newWorkMinutes * 60) + newWorkSeconds;
        const newBreakTotalSeconds = (newBreakMinutes * 60);

        // 設定値のバリデーション
        if (isNaN(newWorkTotalSeconds) || newWorkTotalSeconds < 0 ||
            isNaN(newBreakTotalSeconds) || newBreakTotalSeconds < 0 ||
            isNaN(newWorkSeconds) || newWorkSeconds < 0 || newWorkSeconds > 59) {
            alert('作業時間と休憩時間は正しく設定してください（分は0以上、秒は0〜59）。');
            return;
        }
        if (newWorkTotalSeconds === 0 && newBreakTotalSeconds === 0) {
            alert('作業時間または休憩時間のいずれか一方、または両方を1秒以上に設定してください。');
            return;
        }

        workTimeTotalSeconds = newWorkTotalSeconds;
        breakTimeTotalSeconds = newBreakTotalSeconds;
        saveTimerSettings(); // Local Storageに保存
        
        // 保存後、現在のタイマーモードに合わせて残り時間をリセット
        // ここでcurrentTimerTypeが現在の設定表示タイプと同期していない可能性があるので、
        // 明示的に設定表示タイプに合わせる
        if (currentSettingDisplayType === 'work') {
            currentTimerType = 'work';
            remainingTime = workTimeTotalSeconds;
        } else {
            currentTimerType = 'break';
            remainingTime = breakTimeTotalSeconds;
        }
        pauseTimer(); // タイマーを一時停止
        updateTimerDisplay(); // 表示を更新
        alert('タイマー設定を保存しました。');
    });

    // 設定表示の切り替え（作業時間と休憩時間の設定入力欄の表示を切り替える）
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

    // タイマー表示タイプと残り時間を切り替える機能（設定部の「切り替え」ボタン用）
    toggleDisplayTypeButton.addEventListener('click', () => {
        pauseTimer(); // タイマーが動いていたら停止

        // 設定表示のタイプとタイマー本体のタイプを同期して切り替える
        if (currentSettingDisplayType === 'work') {
            currentSettingDisplayType = 'break';
            currentTimerType = 'break'; // タイマー本体のタイプも連動
            remainingTime = breakTimeTotalSeconds; // 休憩時間の設定値を反映
        } else {
            currentSettingDisplayType = 'work';
            currentTimerType = 'work'; // タイマー本体のタイプも連動
            remainingTime = workTimeTotalSeconds; // 作業時間の設定値を反映
        }
        
        updateSettingDisplay(); // 設定入力欄の表示を更新
        updateTimerDisplay(); // タイマー本体の表示を更新
    });


    // タイマー表示を更新
    const updateTimerDisplay = () => {
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        timerTypeDisplay.textContent = currentTimerType === 'work' ? '作業' : '休憩';
        // ブラウザのタブタイトルも更新
        document.title = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} | ${currentTimerType === 'work' ? '作業' : '休憩'}タイマー`;
    };

    // タイマーを開始
    const startTimer = () => {
        if (timerInterval) return; // すでにタイマーが動作中なら何もしない
        if (remainingTime <= 0) {
            alert('タイマーが0のため開始できません。リセットするか設定を変更してください。');
            return;
        }
        
        timerInterval = setInterval(() => {
            remainingTime--;
            updateTimerDisplay(); // 毎秒表示を更新

            if (remainingTime <= 0) {
                clearInterval(timerInterval); // タイマーを停止
                timerInterval = null;
                playNotificationSound(); // 通知音を鳴らす
                addTimerRecord('auto'); // 自動記録
                alert(`${currentTimerType === 'work' ? '作業' : '休憩'}時間終了！`);
                // 自動終了の場合はタイプを切り替えて、新しいタイマーを自動的に開始
                switchTimerTypeAndStart(true); 
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
        pauseTimer(); // 一時停止
        // currentTimerType に基づいて残り時間をリセット
        if (currentTimerType === 'work') {
            remainingTime = workTimeTotalSeconds;
        } else {
            remainingTime = breakTimeTotalSeconds;
        }
        updateTimerDisplay(); // 表示を更新
    };

    // タイマータイプを切り替えて、必要なら開始する関数 (自動終了時と手動切り替えの両方で使用)
    // isAutoStart: 自動で切り替わった場合 (true) は自動開始、手動 (false/未指定) は自動開始しない
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

    // 通知音を鳴らす
    const playNotificationSound = () => {
        // Audioオブジェクトを再生成することで、短い間隔で複数回鳴らす場合に前の再生が邪魔されないようにする
        new Audio('notification.mp3').play().catch(e => console.error("通知音の再生に失敗しました:", e));
    };

    // タイマー記録をlocalStorageに保存
    const saveTimerRecords = () => {
        localStorage.setItem('timerRecords', JSON.stringify(timerRecords));
    };

    // タイマー記録を追加 (タイプに応じてメッセージを変更)
    const addTimerRecord = (recordType) => {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        // 記録時点の経過時間を正確に計算
        // 現在のモードの総時間 - 残り時間
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
            const recordText = `${recordContent} @ ${timeString}`; // 記録時刻も追加
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
        timerRecordList.scrollTop = timerRecordList.scrollHeight; // スクロールを最下部に
    };

    // タイマー記録をすべて削除
    const clearTimerRecords = () => {
        if (confirm('本当にすべてのタイマー記録を削除しますか？')) {
            timerRecords = [];
            saveTimerRecords(); // Local Storageから削除
            renderTimerRecords();
        }
    };

    // タイマー関連のイベントリスナー
    startTimerButton.addEventListener('click', startTimer);
    pauseTimerButton.addEventListener('click', pauseTimer);
    resetTimerButton.addEventListener('click', resetTimer);
    recordTimerButton.addEventListener('click', () => {
        addTimerRecord('manual'); // 手動記録
    });
    clearTimerRecordsButton.addEventListener('click', clearTimerRecords);

    // タイマー設定の初期ロードと表示
    loadTimerSettings();
});
