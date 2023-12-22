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
を共通で読んでいるjs置き場において、初期設定を行う必要があります。
