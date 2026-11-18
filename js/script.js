
 // チェックボックスが変更されたら実行
 $('input[type="checkbox"]').on("change", function() {

     // チェック項目の総数
     const total = $('input[type="checkbox"]').length;

     // チェック済みの項目数
     const checked = $('input[type="checkbox"]:checked').length;

     // 達成率を計算
     const rate = Math.round((checked / total) * 100);

     // 達成率を画面に表示
     $("#today-rate").text(rate + "%");

     // 完了数を表示
     $("#today-count").text(checked + " / " + total + " 完了");

     // 円グラフを更新
     $(".progress-circle").css(
         "background",
         `conic-gradient(#ffcd45 ${rate}%, #fff0ca ${rate}%)`
     );

 });

 // 今日の日付を取得
const today = new Date();

// 曜日を取得（日曜=0、月曜=1、...土曜=6）
const dayNumber = today.getDay();

// 月曜日始まりの番号に変換（月=0、...日=6）
const weekIndex = (dayNumber + 6) % 7;

// 今週の曜日ボタンを取得
const dayButtons = $(".week-days button");

// 今日の曜日だけ色を変更
dayButtons.eq(weekIndex).css({
    "background-color": "#ffcd45",
    "color": "#6b4b19"
});