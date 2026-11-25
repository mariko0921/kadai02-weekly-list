
$(function () {

    // =====================================
    // ① 4カテゴリの初期項目をHTMLから取得
    // =====================================

    const categoryIds = [
        "housework",
        "programming",
        "study",
        "health"
    ];

    const defaultTasks = [];

    categoryIds.forEach(function (category) {

        $("#" + category + " li").each(function (index) {

            defaultTasks.push({
                id: category + "_" + index,
                category: category,
                name: $(this).text().trim()
            });

        });

    });


    // =====================================
    // ② 今週の月曜日と保存キーを取得
    // =====================================

    const today = new Date();

    function formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");

        return y + "-" + m + "-" + d;
    }

    const monday = new Date(today);
    const todayIndex = (today.getDay() + 6) % 7;

    monday.setDate(today.getDate() - todayIndex);

    const weekKey = "week_" + formatDate(monday);
    const habitKey = "yaru_habits";

    // 現在画面で選んでいる曜日
    let selectedDay = todayIndex;

    // 現在開いているタブ（"all"＝すべて／"habit"＝習慣化）
    let currentTab = "all";


    // =====================================
    // ③ localStorageからデータを取得
    // =====================================

    // 保存されている週のデータを、今の形式 { tasks, checks } にそろえる
    // （昔のコードで保存した形式も読めるようにする）
    function normalizeWeek(data) {

        // 新しいデータ形式
        if (data.tasks && data.checks) {
            return data;
        }

        // 前回のコードで保存した形式を引き継ぐ
        const oldChecks = {};

        const ids = defaultTasks.map(function (task) {
            return task.id;
        });

        for (let day = 0; day < 7; day++) {

            const oldIndices = data[day] || [];

            oldChecks[day] = oldIndices
                .map(function (index) {
                    return ids[index];
                })
                .filter(Boolean);

        }

        return {
            tasks: defaultTasks,
            checks: oldChecks
        };
    }

    function loadWeek() {

        const saved = localStorage.getItem(weekKey);

        if (saved) {
            return normalizeWeek(JSON.parse(saved));
        }

        // 新しい週なら習慣化項目を引き継ぐ
        const savedHabits = localStorage.getItem(habitKey);

        let tasks = defaultTasks;

        if (savedHabits !== null) {

            // 習慣化専用の保存場所から取得
            tasks = JSON.parse(savedHabits);

        } else {

            // 初回のみ、過去の保存データから引き継ぐ
            const previousKeys = Object.keys(localStorage)
                .filter(function (key) {
                    return /^week_\d{4}-\d{2}-\d{2}$/.test(key)
                        && key < weekKey;
                })
                .sort()
                .reverse();

            if (previousKeys.length > 0) {

                const previousData = JSON.parse(
                    localStorage.getItem(previousKeys[0])
                );

                if (previousData.tasks) {
                    tasks = previousData.tasks.filter(function (task) {
                        return task.habit === true;
                    });
                }

            }

        }

        // 新しい週はチェックを未達成にする
        return {
            tasks: tasks,
            checks: {}
        };
    }

    let weeklyData = loadWeek();


    // =====================================
    // ④ データを保存する関数
    // =====================================

    function saveWeek() {

        // ① 今週のデータを保存
        localStorage.setItem(
            weekKey,
            JSON.stringify(weeklyData)
        );

        // ② 習慣化したい項目だけを取り出す
        const habits = weeklyData.tasks.filter(function (task) {
            return task.habit === true;
        });

        // ③ 習慣化専用の保存場所に保存
        localStorage.setItem(
            habitKey,
            JSON.stringify(habits)
        );

    }


    // =====================================
    // ⑤ チェックリストを表示する関数
    // =====================================

    function renderTasks() {

        categoryIds.forEach(function (category) {

            const list = $("#" + category + " ul");

            // 表示中のリストを一度空にする
            list.empty();

            // カテゴリに属する項目を取り出す
            const tasks = weeklyData.tasks.filter(function (task) {
                return task.category === category;
            });

            // 選択中の曜日のチェック情報
            const checkedIds = weeklyData.checks[selectedDay] || [];

            tasks.forEach(function (task) {

                // HTMLの要素を作る
                const li = $("<li>");
                const label = $("<label>");

                const checkbox = $("<input>")
                    .attr("type", "checkbox")
                    .attr("data-id", task.id);

                checkbox.prop(
                    "checked",
                    checkedIds.includes(task.id)
                );

                const text = $("<span>").text(task.name);

                label.append(checkbox, text);

            // 習慣化ボタンを作る
            const habitButton = $("<button>")
            .attr("type", "button")
            .attr("data-id", task.id)
            .attr("aria-label", "習慣化の設定")
            .attr("aria-pressed", !!task.habit)
            .addClass("habit-button")
            .text("🔥");

            // 習慣化対象の場合は色をつける
            if (task.habit === true) {
                habitButton.addClass("habit-active");
            }

            // 編集ボタンを作る
            const editButton = $("<button>")
                .attr("type", "button")
                .attr("data-id", task.id)
                .attr("aria-label", "項目名を編集")
                .addClass("edit-button")
                .text("✏️");

            // 削除ボタンを作る
            const deleteButton = $("<button>")
                .attr("type", "button")
                .attr("data-id", task.id)
                .attr("aria-label", "項目を削除")
                .addClass("delete-button")
                .text("🗑️");

            // チェック項目と各ボタンを並べる
            li.append(label, habitButton, editButton, deleteButton);
            list.append(li);
                        });

        });

    }

    // =====================================
    // ⑥ 今日・選択した日の達成率を計算
    // =====================================

    // tasks を渡すとその項目だけで計算する（省略したら全項目）
    function getDayRate(day, tasks) {

        const targetTasks = tasks || weeklyData.tasks;

        const total = targetTasks.length;
        const checkedIds = weeklyData.checks[day] || [];

        const done = targetTasks.filter(function (task) {
            return checkedIds.includes(task.id);
        }).length;

        const rate = total === 0
            ? 0
            : Math.round(done / total * 100);

        return {
            total: total,
            done: done,
            rate: rate
        };
    }

    // =====================================
    // ⑦ 達成率と円グラフを更新
    // =====================================

    function updateProgress() {

        const result = getDayRate(selectedDay);

        $("#today-rate").text(result.rate + "%");

        $("#today-count").text(
            result.done + " / " + result.total + " 完了"
        );

        $(".progress-circle").css(
            "background",
            `conic-gradient(
                #ffcd45 ${result.rate}%,
                #fff0ca ${result.rate}%
            )`
        );

    }


    // =====================================
    // ⑧ 曜日ボタンを更新する
    // =====================================

    function updateDays() {

        $(".week-days button").each(function (index) {

            const result = getDayRate(index);

            $(this).toggleClass(
                "active-day",
                index === selectedDay
            );

            // すでにある達成率表示を削除
            $(this).find(".day-rate").remove();

            // 達成率を追加
            const rateText = $("<span>")
                .addClass("day-rate")
                .text(result.rate + "%");

            $(this).append(rateText);

        });

    }


    // =====================================
    // ⑨ 今週全体の進み具合を計算
    // =====================================

    function updateWeeklyProgress() {

        const total = weeklyData.tasks.length * 7;

        let done = 0;

        for (let day = 0; day < 7; day++) {
            done += getDayRate(day).done;
        }

        const rate = total === 0
            ? 0
            : Math.round(done / total * 100);

        $("#weekly-rate").text(rate + "%");
        $("#weekly-bar-fill").css("width", rate + "%");

    }


    // =====================================
    // ⑩ 画面全体を更新する
    // =====================================

    function render() {
        renderTasks();
        renderHabitList();
        updateProgress();
        updateDays();
        updateWeeklyProgress();
    }


    // =====================================
    // 習慣化タブの一覧を表示する
    // =====================================

    function renderHabitList() {

        const habits = weeklyData.tasks.filter(function (task) {
            return task.habit === true;
        });

        // 🔥項目が1つもないときだけ案内文を出す
        $("#habit-list .habit-empty").toggle(habits.length === 0);

    }


    // =====================================
    // タブを切り替える
    // =====================================

    function switchTab(tabName) {

        currentTab = tabName;

        // body に目印のクラスをつけ、CSSで表示・非表示を切り替える
        $("body").toggleClass("tab-habit", tabName === "habit");

        // 選択中のタブボタンに色をつける
        $(".tab-bar button").each(function () {
            $(this).toggleClass(
                "tab-active",
                $(this).attr("data-tab") === tabName
            );
        });

        render();

    }

    $(".tab-bar button").on("click", function () {
        switchTab($(this).attr("data-tab"));
    });


    // =====================================
    // ⑪ 曜日をクリックしたとき
    // =====================================

    $(".week-days button").on("click", function () {

        selectedDay = $(this).index();

        render();

    });


    // =====================================
    // ⑫ チェックを変更したら保存
    // =====================================

    // 押された1項目だけを、選択中の曜日の記録に追加・削除する
    // （習慣化タブにも同じ項目が表示されるため、画面全体を集め直さない）
    $("main").on("change", 'input[type="checkbox"][data-id]', function () {

        const taskId = $(this).attr("data-id");
        const isChecked = $(this).prop("checked");

        // 選択中の曜日のチェック情報（いったん対象の項目を取り除く）
        const checkedIds = (weeklyData.checks[selectedDay] || [])
            .filter(function (id) {
                return id !== taskId;
            });

        // チェックが入ったなら追加する
        if (isChecked) {
            checkedIds.push(taskId);
        }

        weeklyData.checks[selectedDay] = checkedIds;

        // localStorageに保存
        saveWeek();

        // 画面を更新
        render();

    });

    // =====================================
    // ⑬ 項目追加ボタンをクリック
    // =====================================

    categoryIds.forEach(function (category) {

        const section = $("#" + category);
        const addButton = section.children("button");

        addButton.on("click", function () {

            // 入力欄がすでにあれば追加しない
            if (section.find(".add-task-form").length > 0) {
                return;
            }

            const form = $("<div>").addClass("add-task-form");

            const input = $("<input>")
                .attr("type", "text")
                .attr("placeholder", "新しい項目を入力");

            // 習慣化するかどうかのチェック欄
            const habitCheckbox = $("<input>")
            .attr("type", "checkbox")
            .addClass("habit-setting");

            // チェック欄の説明 
            const habitLabel = $("<label>")
            .addClass("habit-setting-label")
            .append(habitCheckbox, " 🔥 毎日続けたい・習慣化したい");

            // 追加ボタン
            const saveButton = $("<button>")
            .attr("type", "button")
            .text("追加");

            // 入力欄・習慣化チェック・追加ボタンを表示
            form.append(input, habitLabel, saveButton);
            addButton.after(form);

            input.trigger("focus");

            saveButton.on("click", function () {

                const name = input.val().trim();

                if (name === "") {
                    return;
                }

                // 新しい項目を作成
                const newTask = {
                    id: category + "_" + Date.now()
                    + "_" + Math.random().toString(36).slice(2, 7),
                    category: category,
                    name: name,
                    habit: habitCheckbox.prop("checked")
                };

                // 配列に追加
                weeklyData.tasks.push(newTask);

                // localStorageに保存
                saveWeek();

                // 入力欄を閉じる
                form.remove();

                // 画面を更新
                render();

            });

        });

    });


    // =====================================
    // ⑭ 習慣化ボタンをクリックしたとき
    // =====================================

$("main").on("click", ".habit-button", function () {

    // 押された項目のIDを取得
    const taskId = $(this).attr("data-id");

    // IDが一致する項目を探す
    const task = weeklyData.tasks.find(function (item) {
        return item.id === taskId;
    });

    if (task) {

        // 習慣化のON・OFFを切り替える
        task.habit = !task.habit;

        // localStorageに保存
        saveWeek();

        // 画面を更新
        render();

    }

});

// =====================================
// 項目を編集する
// =====================================

$("main").on("click", ".edit-button", function () {

    // 編集する項目のIDを取得
    const taskId = $(this).attr("data-id");

    // IDが一致する項目を探す
    const task = weeklyData.tasks.find(function (item) {
        return item.id === taskId;
    });

    if (task) {

        // 現在の項目名を表示して編集する
        const newName = prompt("項目名を変更してください", task.name);

        // キャンセルや空欄の場合は変更しない
        if (newName === null || newName.trim() === "") {
            return;
        }

        // 項目名を変更
        task.name = newName.trim();

        // localStorageに保存
        saveWeek();

        // 画面を更新
        render();

    }

});

// =====================================
// 項目を削除する
// =====================================

$("main").on("click", ".delete-button", function () {

    const taskId = $(this).attr("data-id");

    const task = weeklyData.tasks.find(function (item) {
        return item.id === taskId;
    });

    if (!task) {
        return;
    }

    // 削除する前に確認する
    const message = task.habit
        ? "「" + task.name + "」を習慣化リストからも削除しますか？"
        : "「" + task.name + "」を削除しますか？";

    if (!confirm(message)) {
        return;
    }

    // 対象の項目をリストから削除
    weeklyData.tasks = weeklyData.tasks.filter(function (item) {
        return item.id !== taskId;
    });

    // 月曜日〜日曜日のチェック記録からも削除
    for (let day = 0; day < 7; day++) {

        weeklyData.checks[day] =
            (weeklyData.checks[day] || []).filter(function (id) {
                return id !== taskId;
            });

    }

    // localStorageに保存
    saveWeek();

    // 画面と達成率を更新
    render();

});

    // =====================================
    // ⑭ 最初の画面表示
    // =====================================

    saveWeek();
    render();

});
