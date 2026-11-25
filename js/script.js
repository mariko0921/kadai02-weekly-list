
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

                const li = $("<li>");

                // チェック欄と各ボタンを並べる
                li.append(createTaskRow(task, checkedIds, ""));
                list.append(li);

            });

        });

    }


    // =====================================
    // 1つの項目（チェック欄＋🔥✏️🗑️ボタン）を作る
    // Todoリストと習慣化タブの両方で使う
    // =====================================

    // カテゴリごとの絵文字（習慣化タブで項目名の前につける）
    const categoryIcons = {
        housework: "🏠",
        programming: "💻",
        study: "📚",
        health: "❤️"
    };

    function createTaskRow(task, checkedIds, icon) {

        const label = $("<label>");

        const checkbox = $("<input>")
            .attr("type", "checkbox")
            .attr("data-id", task.id)
            .prop("checked", checkedIds.includes(task.id));

        // icon が空でなければ項目名の前につける
        const text = $("<span>")
            .addClass("task-name")
            .text(icon ? icon + " " + task.name : task.name);

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

        // jQueryの要素の集まりとして返す
        return $().add(label)
            .add(habitButton)
            .add(editButton)
            .add(deleteButton);

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

        // ① 全体の達成率（Todoリストタブで表示）
        const result = getDayRate(selectedDay);

        $("#today-rate").text(result.rate + "%");

        $("#today-count").text(
            result.done + " / " + result.total + " 完了"
        );

        $("#all-circle").css(
            "background",
            `conic-gradient(
                #ffcd45 ${result.rate}%,
                #fff0ca ${result.rate}%
            )`
        );

        // ② 習慣化の達成率（習慣化タブで表示）
        const habits = weeklyData.tasks.filter(function (task) {
            return task.habit === true;
        });

        const habitResult = getDayRate(selectedDay, habits);

        $("#habit-rate").text(habitResult.rate + "%");

        $("#habit-count").text(
            habitResult.done + " / " + habitResult.total + " 完了"
        );

        $("#habit-circle").css(
            "background",
            `conic-gradient(
                #ff9f43 ${habitResult.rate}%,
                #ffe3c4 ${habitResult.rate}%
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

        // 21日達成した項目があればお祝いを出す
        showNextCelebration();
    }


    // =====================================
    // 21日達成のお祝いと🏆の記録
    // =====================================

    // 保存場所：{ 項目ID: { trophies, lastMilestone, milestoneDate } }
    //   trophies      … 🏆の累計
    //   lastMilestone … 最後にお祝いした節目（21, 42, 63…）
    //   milestoneDate … その節目に届いた日（同じ連続記録か見分けるのに使う）
    const challengeKey = "yaru_challenge";

    let challengeData = {};

    try {
        challengeData = JSON.parse(localStorage.getItem(challengeKey)) || {};
    } catch (error) {
        challengeData = {};
    }

    function saveChallenge() {
        localStorage.setItem(challengeKey, JSON.stringify(challengeData));
    }

    // これから表示するお祝いの順番待ち
    const celebrationQueue = [];

    function checkMilestone(task, info) {

        // 今届いている節目（20日なら0、21〜41日なら21、42〜62日なら42…）
        const milestone = Math.floor(info.current / CHALLENGE_DAYS)
            * CHALLENGE_DAYS;

        if (milestone === 0) {
            return;
        }

        const record = challengeData[task.id] || {
            trophies: 0,
            lastMilestone: 0,
            milestoneDate: null
        };

        // 前回お祝いした日が、今の連続の中に入っていれば「同じ連続記録」
        const isSameStreak = record.milestoneDate !== null
            && info.start <= record.milestoneDate;

        // 同じ連続記録で、もうお祝いした節目なら何もしない
        if (isSameStreak && milestone <= record.lastMilestone) {
            return;
        }

        // 新しく届いた節目の数だけ🏆を増やす
        const newTrophies = isSameStreak
            ? (milestone - record.lastMilestone) / CHALLENGE_DAYS
            : milestone / CHALLENGE_DAYS;

        record.trophies += newTrophies;
        record.lastMilestone = milestone;
        record.milestoneDate = formatDate(
            addDays(parseDate(info.start), milestone - 1)
        );

        challengeData[task.id] = record;
        saveChallenge();

        celebrationQueue.push({
            name: task.name,
            milestone: milestone
        });

    }

    // 順番待ちのお祝いを1つ表示する
    function showNextCelebration() {

        if ($("#celebration").hasClass("is-open")) {
            return;
        }

        const item = celebrationQueue.shift();

        if (!item) {
            return;
        }

        const round = item.milestone / CHALLENGE_DAYS;

        $("#celebration-title").text(
            "「" + item.name + "」" + item.milestone + "日連続達成！"
        );

        $("#celebration-message").text(
            round === 1
                ? "習慣化おめでとう！🔥"
                : round + "回目の21日チャレンジクリア！すごい！"
        );

        $("#celebration").addClass("is-open");
        $("#celebration-close").trigger("focus");

        launchConfetti();

    }

    function closeCelebration() {

        $("#celebration").removeClass("is-open");
        $("#celebration .confetti").empty();

        // 次のお祝いがあれば続けて表示
        showNextCelebration();

    }

    $("#celebration-close").on("click", closeCelebration);

    // Escキーでも閉じられるようにする
    $(document).on("keydown", function (event) {
        if (event.key === "Escape" && $("#celebration").hasClass("is-open")) {
            closeCelebration();
        }
    });

    // 紙吹雪を降らせる
    function launchConfetti() {

        const area = $("#celebration .confetti");
        area.empty();

        // 「動きを減らす」設定の人には紙吹雪を出さない
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }

        const colors = ["#ffcd45", "#ff9f43", "#f28a00", "#ff6b6b", "#7ed6a5", "#6fb1ff"];

        for (let i = 0; i < 80; i++) {

            const piece = $("<span>")
                .addClass("confetti-piece")
                .css({
                    left: Math.random() * 100 + "%",
                    backgroundColor: colors[i % colors.length],
                    animationDelay: Math.random() * 0.8 + "s",
                    animationDuration: 2.2 + Math.random() * 1.5 + "s",
                    transform: "rotate(" + Math.random() * 360 + "deg)"
                });

            area.append(piece);
        }

    }


    // =====================================
    // 習慣化タブの一覧を表示する
    // =====================================

    // 前回表示したときの連続日数（スタンプの「ポン」の判定に使う）
    const previousStreaks = {};

    function renderHabitList() {

        const habits = weeklyData.tasks.filter(function (task) {
            return task.habit === true;
        });

        // 🔥項目が1つもないときだけ案内文を出す
        $("#habit-list .habit-empty").toggle(habits.length === 0);

        const list = $("#habit-list ul");
        list.empty();

        // 選択中の曜日のチェック情報
        const checkedIds = weeklyData.checks[selectedDay] || [];

        // 過去の週も含めた「日付→チェックしたID」の表
        const history = buildCheckHistory();

        habits.forEach(function (task) {

            // 1行目：チェック欄・項目名・ボタン
            const row = $("<div>")
                .addClass("habit-row")
                .append(createTaskRow(
                    task,
                    checkedIds,
                    categoryIcons[task.category]
                ));

            // 2行目以降：連続日数と21マス
            const info = getStreakInfo(task.id, history);

            // 前回より連続日数が増えていたら、最新のスタンプを「ポン」とさせる
            const isNewStamp = previousStreaks[task.id] !== undefined
                && info.current > previousStreaks[task.id];

            previousStreaks[task.id] = info.current;

            // 21の倍数に届いていたらお祝い（🏆の数もここで更新される）
            checkMilestone(task, info);

            const trophies = challengeData[task.id]
                ? challengeData[task.id].trophies
                : 0;

            const li = $("<li>")
                .addClass("habit-item")
                .append(row, createChallenge(info, isNewStamp, trophies));

            list.append(li);

        });

    }


    // =====================================
    // 21日チャレンジの表示（連続日数・最高記録・21マス）を作る
    // =====================================

    const CHALLENGE_DAYS = 21;

    function createChallenge(info, isNewStamp, trophies) {

        // 埋まるマスの数：21日目は21マス全部、22日目は次の周の1マス目
        const filled = info.current === 0
            ? 0
            : (info.current - 1) % CHALLENGE_DAYS + 1;

        // 何周目のチャレンジか（1〜21日目＝1周目、22〜42日目＝2周目…）
        const round = info.current === 0
            ? 1
            : Math.floor((info.current - 1) / CHALLENGE_DAYS) + 1;

        // ① 連続日数・最高記録
        const stats = $("<p>").addClass("habit-stats");

        stats.append(
            $("<span>").addClass("streak-count")
                .append("🔥 ", $("<strong>").text(info.current), " 日連続"),
            $("<span>").text("最高 " + info.best + " 日")
        );

        if (round >= 2) {
            stats.append($("<span>").text(round + "周目"));
        }

        // これまでに21日を達成した回数（途切れても消えない）
        if (trophies > 0) {
            stats.append(
                $("<span>").addClass("trophy-count").text("🏆×" + trophies)
            );
        }

        // ② 21マスのスタンプ
        const grid = $("<div>").addClass("stamp-grid");

        for (let i = 1; i <= CHALLENGE_DAYS; i++) {

            const stamp = $("<span>").addClass("stamp");

            if (i <= filled) {
                stamp.addClass("stamp-filled").text("🔥");
            }

            // いちばん新しく増えたマスにだけアニメーションをつける
            if (isNewStamp && i === filled) {
                stamp.addClass("stamp-new");
            }

            grid.append(stamp);
        }

        // ③ あと何日か
        const remaining = CHALLENGE_DAYS - filled;

        const message = $("<p>")
            .addClass("habit-remaining")
            .text(
                remaining === 0
                    ? "🎉 21日達成！"
                    : "あと " + remaining + " 日！"
            );

        return $("<div>")
            .addClass("habit-challenge")
            .append(stats, grid, message);

    }


    // =====================================
    // 日付の計算に使う小さな関数
    // =====================================

    // "2026-11-24" のような文字列を Date に変換する
    function parseDate(text) {
        const parts = text.split("-");
        return new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2])
        );
    }

    // date の n 日後（マイナスなら n 日前）を返す
    function addDays(date, n) {
        const result = new Date(date);
        result.setDate(result.getDate() + n);
        return result;
    }


    // =====================================
    // 過去の週も含めた「日付→チェックしたID」の表を作る
    // 例：{ "2026-11-24": ["health_0", "study_1"], ... }
    // =====================================

    function buildCheckHistory() {

        const history = {};

        // 1週間分のデータを表に書き込む
        function addWeek(mondayText, data) {

            const mondayDate = parseDate(mondayText);

            for (let day = 0; day < 7; day++) {

                const ids = data.checks[day] || [];

                if (ids.length > 0) {
                    const dateText = formatDate(addDays(mondayDate, day));
                    history[dateText] = ids;
                }

            }

        }

        // 保存されている過去の週（今週は下で別に追加する）
        Object.keys(localStorage).forEach(function (key) {

            if (!/^week_\d{4}-\d{2}-\d{2}$/.test(key) || key === weekKey) {
                return;
            }

            try {
                const data = normalizeWeek(JSON.parse(localStorage.getItem(key)));
                addWeek(key.replace("week_", ""), data);
            } catch (error) {
                // 壊れたデータがあっても、ほかの週の計算は続ける
            }

        });

        // 今週は画面で使っている最新のデータを使う
        addWeek(formatDate(monday), weeklyData);

        return history;

    }


    // =====================================
    // 連続達成日数と最高記録を計算する
    // =====================================

    function getStreakInfo(taskId, history) {

        const todayText = formatDate(today);

        function isChecked(date) {
            return (history[formatDate(date)] || []).includes(taskId);
        }

        // ① 今の連続日数
        //    今日チェック済みなら今日から、まだなら昨日から1日ずつさかのぼる
        let cursor = new Date(today);

        if (!isChecked(cursor)) {
            cursor = addDays(cursor, -1);
        }

        let current = 0;

        // 今の連続が始まった日（連続0日なら null）
        let start = null;

        while (isChecked(cursor)) {
            current++;
            start = formatDate(cursor);
            cursor = addDays(cursor, -1);
        }

        // ② 最高記録
        //    チェックした日を古い順に並べ、前の日の翌日なら連続とみなす
        //    （未来の日のチェックは数えない）
        const checkedDates = Object.keys(history)
            .filter(function (dateText) {
                return dateText <= todayText
                    && history[dateText].includes(taskId);
            })
            .sort();

        let best = 0;
        let run = 0;
        let previousText = null;

        checkedDates.forEach(function (dateText) {

            const isNextDay = previousText !== null
                && formatDate(addDays(parseDate(previousText), 1)) === dateText;

            run = isNextDay ? run + 1 : 1;
            best = Math.max(best, run);
            previousText = dateText;

        });

        return {
            current: current,
            best: Math.max(best, current),
            start: start
        };

    }


    // =====================================
    // タブを切り替える
    // =====================================

    // tabName は "all"（Todoリスト）か "habit"（習慣化）
    function switchTab(tabName) {

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
    // 今月のカレンダーを作る（今日の日付に色をつける）
    // =====================================

    function renderCalendar() {

        const year = today.getFullYear();
        const month = today.getMonth(); // 0＝1月 … 11＝12月

        $("#calendar-title").text(year + "年 " + (month + 1) + "月");

        const grid = $("#calendar-grid");
        grid.empty();

        // ① 曜日の見出し（アプリの曜日ボタンに合わせて月曜はじまり）
        ["月", "火", "水", "木", "金", "土", "日"].forEach(function (name, index) {

            const head = $("<span>")
                .addClass("calendar-weekday")
                .text(name);

            if (index === 5) {
                head.addClass("is-saturday");
            }
            if (index === 6) {
                head.addClass("is-sunday");
            }

            grid.append(head);
        });

        // ② 1日が何曜日か（月曜＝0 … 日曜＝6）だけ、空白を入れる
        const firstDay = new Date(year, month, 1);
        const blankCount = (firstDay.getDay() + 6) % 7;

        for (let i = 0; i < blankCount; i++) {
            grid.append($("<span>").addClass("calendar-blank"));
        }

        // ③ 1日〜月末までの日付を並べる
        //    （来月の0日目＝今月の最終日、という書き方で月末を出す）
        const lastDate = new Date(year, month + 1, 0).getDate();

        for (let date = 1; date <= lastDate; date++) {

            const cell = $("<span>")
                .addClass("calendar-day")
                .text(date);

            const weekdayIndex = (blankCount + date - 1) % 7;

            if (weekdayIndex === 5) {
                cell.addClass("is-saturday");
            }
            if (weekdayIndex === 6) {
                cell.addClass("is-sunday");
            }

            // 今日の日付だけ色を変える
            if (date === today.getDate()) {
                cell.addClass("calendar-today")
                    .attr("aria-current", "date");
            }

            grid.append(cell);
        }

    }


    // =====================================
    // ⑮ 最初の画面表示
    // =====================================

    saveWeek();
    renderCalendar();
    render();

});
