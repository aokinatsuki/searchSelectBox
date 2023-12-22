# searchSelectBox
検索機能つきプルダウンのjsとcssのセットです。

・css, jsファイルを追加。

````
// ****************************************************************************
// 検索セレクトボックス
// ****************************************************************************
function searchSelectOption() {}
$(function () {
    // 検索付きプルダウンの設定
    const searchSelect = new search_select();
    searchSelect.init();

    // 検索付きプルダウンの中身更新
    searchSelectOption.prototype.update = function(node) {
        searchSelect.update(node);
    }
    // 検索付きプルダウン削除
    searchSelectOption.prototype.destroy = function(node) {
        searchSelect.destroy(node);
    }
})
````
上記を共通で読んでいるjs置き場において、初期設定を行う必要があります。


````
// 検索付きプルダウンの中身一旦破壊（検索付きプルダウンがコピーを想定していないため）
new searchSelectOption().destroy($("#セレクトボックスのid"));
````
上記を各画面ごとにおいていただければ検索セレクトボックスの設定を破壊できます。


````
例：
var selem = $("select[×××××]");
if (selem.children("option").length > 0){
    return;
}
selem.append($("<option />").val("").html("選択して下さい"));
for (■■■) {
    selem.append($("<option />").val(△△△);
}
if(◯◯◯){
    selem.val(初期設定を行う場合は値を渡しておく);
}

// 検索付きプルダウンの中身更新
new searchSelectOption().update(selectboxのdom);
````
上記のようにselect(option含む)のdomを渡すとその内容に強制更新できます。
