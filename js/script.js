
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

    // 現在画面で選んでいる曜日
    let selectedDay = todayIndex;


    // =====================================
    // ③ localStorageからデータを取得
    // =====================================

    function loadWeek() {

        const saved = localStorage.getItem(weekKey);

        if (saved) {
            const data = JSON.parse(saved);

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

        // 新しい週なら前週の項目を引き継ぐ
        const previousMonday = new Date(monday);
        previousMonday.setDate(monday.getDate() - 7);

        const previousKey = "week_" + formatDate(previousMonday);
        const previousSaved = localStorage.getItem(previousKey);

        let tasks = defaultTasks;

        if (previousSaved) {const previousData = JSON.parse(previousSaved);

        if (previousData.tasks) {
        tasks = previousData.tasks.filter(function (task) {
            return task.habit === true;
        });
    }
}

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
        localStorage.setItem(
            weekKey,
            JSON.stringify(weeklyData)
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

            // チェック項目・炎マーク・編集ボタンを並べる
            li.append(label, habitButton, editButton);
            list.append(li);
            });

        });

    }

    // =====================================
    // ⑥ 今日・選択した日の達成率を計算
    // =====================================

    function getDayRate(day) {

    const total = weeklyData.tasks.length;
    const checkedIds = weeklyData.checks[day] || [];

    const done = weeklyData.tasks.filter(function (task) {
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
        updateProgress();
        updateDays();
        updateWeeklyProgress();
    }


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

$("main").on("change", 'input[type="checkbox"][data-id]', function () {

    const checkedIds = [];

    // 達成チェックが入っている項目だけを取得
    $('main input[type="checkbox"][data-id]:checked').each(function () {

        const taskId = $(this).attr("data-id");

        checkedIds.push(taskId);

    });

    // 選択中の曜日のチェック情報を上書き
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
    // ⑭ 最初の画面表示
    // =====================================

    saveWeek();
    render();

});
