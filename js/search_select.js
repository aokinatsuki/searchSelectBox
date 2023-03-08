// **各classについて**
// selectを囲む親div selectのid + "_parent"
// プルダウンの中身のul selectのid + "_box"
// プルダウンの中身のli selectのid + "_content" + index, classは search_select_content
// 生きている項目のclass search_select_content_active
// プルダウンの中身なしの場合用の項目li selectのid + "_notselect", classは search_select_not_text
// 検索input selectのid + "_input", classは search_select_input
// .search_select_add_content select選択中以外はhiddenのもの
// . selectのid + search_select_focus 選択中のclass
// .add_search_select 付与したselectにつけるclass

// **独自イベントについて**
// 対象のselectのクリックイベント: targetSelectClickBefore, targetSelectClickAfter
// リストクリックイベント: listClickBefore, listClickAfter
// 入力イベント: searchInput
// 選択後一覧非表示イベント: contentHide, contentHideAfter
// 中身更新後のイベント: selectContentUpdateAfter

// **外から呼び出せるメソッドについて**
// const 変数 = new search_select();
// 変数.init() のように呼び出せます
// 初期設定: init() option{class: 指定のクラス, notContentText: 0件の場合に表示させる文字}
// 中身更新用: update() ※必ず更新するnodeを渡す※
// 破壊用: destroy() ※必ず更新するnodeを渡す※

const search_select = function(){
    // デフォルトのオプション設定
    const defaultOption = {selector: '.search_select', notContentText: "なし"};
    let selector = "";
    let setOptionlist = {};
    // 選択中のselectのnode
    let targetSelect = null;
    // 選択中のselectのid
    let targetSelectId = "";
    // 一覧の中身監視用
    let list = [];
    // activeなクラス名
    let selectClass = "";
    // selectをクリックして機能使用中かどうかのフラグ
    let start_flg = false;
    // 開いた後入力を行なったかのフラグ
    let input_flg = false;
    // 初期設定と更新と破壊のフラグ
    let isInitFlg = false;
    let isUpdateFlg = false;
    let isDeleteFlg = false;
    let isChange = false;

    // 初期設定
    search_select.prototype.init = function(options={}){
        isInitFlg = true;
        let setOption = {};
        $.each(Object.keys(defaultOption), function(idx, val){
            // 独自で設定があればその設定をセットする
            setOption[val] = val in options ? options[val] : defaultOption[val];
        });
        setOptionlist = setOption;
        init(setOption);
        isInitFlg = false;
    }
    // 中身更新用
    search_select.prototype.update = function(elm=null){
        isUpdateFlg = true;
        if(elm === null){return error_log();}

        let self = $(elm);
        $(self).children('option').hide();
        // 選択状態を保存
        targetSelect = $(self);
        // idまたはname指定になるようにした方がいいかも
        targetSelectId = targetSelect.attr('id');
        // 選択中のclassを保存
        selectClass = targetSelectId + "_search_select_focus";

        // 中身をセットし直す
        list[targetSelectId] = setContent(targetSelect, targetSelectId);

        // 初期フォーカス
        moveNextContent();
        // 処理後の独自イベント
        targetSelect.trigger('selectContentUpdateAfter');

        // active位置が表示枠の範囲外の場合は自動スクロール
        scrollsBeyondTheActivePosition();
        isUpdateFlg = false;
    }
    // 破壊
    search_select.prototype.destroy = function(elm=null){
        isDeleteFlg = true;
        if(elm === null){return error_log();}

        // selectにid指定なしの場合は強制的に追加
        if($(elm).attr('id') == null){
            $(elm).attr('id', $(elm).attr('name'));
        }
        var selectId = $(elm).attr('id');

        // 元々select自体にcolが付いていたかどうかのチェック
        const parentClass = $("#" + selectId + "_parent").attr('class');
        if(parentClass.indexOf("move_col") !== -1){
            var parentClasslist = parentClass.split(' ');
            // select内のcol取得
            let getClassIndex = parentClasslist.findIndex(element => element.indexOf("col-") !== -1);
            if(getClassIndex !== -1){
                // 元々select自体にcolが付いていた場合は戻す
                $(elm).addClass(parentClasslist[getClassIndex]);
            }
        }

        // まず親div削除してからselect以外の中身削除
        $(elm).unwrap("[id^='" + selectId + "_']");
        $("[id^='" + selectId + "_']").not('select').remove();
        // class削除
        $(elm).removeClass("add_search_select");
        // イベントリスナー削除
        $(elm)[0].removeEventListener('click', targetSelectClick, false);
        $(elm).children('option').show();
        $(elm).show();
        isDeleteFlg = false;
    }
    // 非表示設定
    search_select.prototype.hide = function(elm){
        // まだ検索付きプルダウンが付与されていない場合はエラー
        if(!$(elm).hasClass('add_search_select')){
            return error_log('not add node');
        }

        const select_id = $(elm).attr('id');
        // 親ごと非表示
        $("#" + select_id + "_parent").css('display', 'none');
    }
    // 非表示設定
    search_select.prototype.show = function(elm){
        // まだ検索付きプルダウンが付与されていない場合はエラー
        if(!$(elm).hasClass('add_search_select')){
            return error_log('not add node');
        }

        const select_id = $(elm).attr('id');
        // 親ごと表示
        $("#" + select_id + "_parent").css('display', 'block');
    }

    function init(options){
        selector = options.selector;
        // 0件時の表示テキスト
        const notContentText = options.notContentText;

        // 各selectに検索用のhtmlタグを追加
        $.each($(selector), function(idx, elm){
            addHtml(elm, notContentText);
            // console.log(list);
        });

        // ** 監視処理 **
        // 監視対象を全体に指定
        let parentDivId = $('html').find('div').eq(0).attr('id');
        const checkParent = document.getElementById(parentDivId);
        // オブザーバーの作成
        const observer = new MutationObserver(records => {
            records.forEach(record => {
                Array.from(record.addedNodes)
                    .filter(node => $(node).find(selector).not(".add_search_select").length > 0)
                    .forEach(newSelect => {
                        // まだ追加されていないプルダウンに検索付きのhtml追加
                        $.each($(newSelect).find(selector), function(idx, val){
                            addHtml(val, setOptionlist.notContentText);
                        })
                    })

                // selectの表示非表示切り替えに対応
                if(record.addedNodes.length === 0){
                    $.each($(selector), function(idx, val){
                        if($(val).parent('div').attr('id') !== undefined){
                            // id違いの場合は破壊して再生
                            if($(val).parent('div').attr('id').indexOf($(val).attr('id')) === -1){
                                let base = $(val).parent('div').attr('id').split('_parent')[0];
                                // id更新
                                idUpdate(val, base);
                            }
                        }
                        if($(selector).hasClass('add_search_select')){
                            let select_id = $(val).attr('id');
                            let parent_id = "#" + select_id + "_parent";
                            // 開いている際のnoneは除外
                            if(!start_flg){
                                // selectの状態を見て表示非表示切り替え
                                if($(val).css('display') === 'none' && $(parent_id).css('display') !== 'none'){
                                    $(parent_id).css('display', 'none');
                                }
                                if($(val).css('display') === 'block' && $(parent_id).css('display') !== 'block'){
                                    $(parent_id).css('display', 'block');
                                }
                            }
                        }
                    })
                }
            })
        })
        // 監視の開始
        observer.observe(checkParent, {
            childList: true,
            subtree: true,
        })
    }

    // idの更新
    function idUpdate(elm, base=""){
        const newId = $(elm).attr('id');
        $.each($("[id^='" + base + "_']"), function(idx, val){
            let changeId = $(val).attr('id').split(base)[1];
            // console.log(changeId)
            $(val).attr('id', newId + changeId);
        })
        $("." + base + "_search_select_focus").removeClass(base + "_search_select_focus").addClass(newId + "_search_select_focus");
    }

    function addHtml(elm, notContentText){
        var contentIds = [];
        // クリックした時に項目が一瞬表示されるのを防ぐため非表示
        $(elm).children('option').hide();

        // selectにid指定なしの場合は強制的に追加
        if($(elm).attr('id') == null){
            $(elm).attr('id', $(elm).attr('name'));
        }
        var selectId = $(elm).attr('id');

        var selectParentId = selectId + "_parent";

        // まだ追加されていない場合は追加
        if(!$(elm).hasClass("add_search_select")){
            var selectParentId = selectId + "_parent";
            $(elm).addClass("add_search_select");

            // select自体にcolが付いている場合はdivに移動
            let classlist = $(elm).attr('class').split(' ');
            // select内のcol取得
            let getClassIndex = classlist.findIndex(element => element.indexOf("col-") !== -1);
            var addDivClass = "";
            if(getClassIndex !== -1){
                // colの部分だけ取ってきてdivに追加する
                $(elm).removeClass(classlist[getClassIndex]);
                // 念の為破壊した時に戻せるようにclass付与
                addDivClass = classlist[getClassIndex] + " move_col";
            }

            // セレクト囲み用
            var parent_tag = "<div class='search_select_parent w-100 " + addDivClass + "' id='" + selectParentId + "'>";
            $(elm).wrap(parent_tag);

            // 幅指定
            let parentWidth = $("#" + selectParentId).width();
            let widthStyle = "100% !important";
            if(parentWidth > 0){
                widthStyle = parentWidth + "px !important";
            }

            // 入力欄
            var input_tag = "<input id='" + selectId + "_input' class='search_select_add_content search_select_input form-control' style='display:none; width: " + widthStyle + "' type='text'>";
            $(elm).after(input_tag);

            // 選択肢一覧のボックス
            var content_box_tag = "<ul class='search_select_box search_select_add_content w-100' id='"+ selectId + "_box' style='display:none; width: " + widthStyle + "'></ul>";
            $("#" + selectParentId).append(content_box_tag);

            // 中身なし用li
            let content_tag = "<li class='search_select_not_text' id='" + selectId + "_notselect' style='display:none;' value=''>" + notContentText + "</li>";
            $("#" + selectId + "_box").append(content_tag);

            // 中身をセット
            contentIds = setContent(elm, selectId);

            // 各selectにclickイベントを付与
            $(elm)[0].addEventListener('click', targetSelectClick, false);

            list[selectId] = contentIds;
        }
    }

    function setContent(elm, selectId){
        var contentIds = [];
        $("#" + selectId + "_box").children("li").not('.search_select_not_text').remove();
        var content_tag = "";
        // 中身をセット
        $.each($(elm).children('option'), function(idx2, option_elm){
            // 項目名
            var text = $(option_elm).text();
            // 値
            var val = $(option_elm).val();
            // liのid
            var contentId = selectId + "_content" + idx2;
            // 選択中のものがある場合はそれを選択
            let activeClass = $(elm).val() === val ? selectId + "_search_select_focus" : "";
            content_tag += "<li class='search_select_content search_select_content_active " + activeClass + "' id='" + contentId + "' value='" + val + "'>" + text + "</li>";

            contentIds.push(contentId);
        })
        $("#" + selectId + "_box").append(content_tag);

        // 絞り込んで0件になったかのチェックをし0件時項目の表示非表示を制御
        if($("#" + selectId + "_box").find('.search_select_content_active').length === 0){
            $("#" + selectId + "_box").find('.search_select_not_text').show();
        } else {
            $("#" + selectId + "_box").find('.search_select_not_text').hide();
        }

        return contentIds;
    }

    // 対象のselectのクリックイベント
    function targetSelectClick(event){
        // すでに開いている場合は閉じる
        if(targetSelect !== null){
            $("#" + targetSelectId + "_parent").find(".search_select_add_content").trigger("contentHide");
        }

        // 開く毎に入力フラグを初期化
        input_flg = false;
        // 表示中フラグ
        start_flg = true;
        // 選択したselectのnode取得
        let self = $("#" + event.currentTarget.id);
        // 中身非表示（漏れを回収するため）
        $(self).children('option').hide();

        // console.log($(self));

        // 処理前の独自イベント
        $(self).trigger('targetSelectClickBefore');
        // select非表示
        $(self).hide();
        // 選択状態を保存
        targetSelect = $(self);
        // idまたはname指定になるようにした方がいいかも
        targetSelectId = targetSelect.attr('id');
        // 選択中のclassを保存
        selectClass = targetSelectId + "_search_select_focus";

        // 対象のselectboxがreadnlyまたはdisabledの場合はセレクトボックスを表示しない
        if($(self).attr('readonly') !== undefined || $(self).attr('disabled')  !== undefined){
            $("#" + targetSelectId + "_parent").find(".search_select_add_content").trigger("contentHide");
            $(self).blur();
        }

        // console.log([targetSelectId + "_parent", $("#" + targetSelectId + "_parent")]);
        // 念の為追加されているかのチェック
        if($("#" + targetSelectId + "_parent").length === 0){
            init(setOptionlist);
        }

        // 幅指定
        let parentWidth = $("#" + targetSelectId + "_parent").width();
        let widthStyle = "100% !important";
        if(parentWidth > 0){
            widthStyle = parentWidth + "px !important";
        }

        $("#" + targetSelectId + "_input").css("width", widthStyle);
        $("#" + targetSelectId + "_box").css("width", widthStyle);

        // 現在liの中にある項目数
        let now_select_content_length = $("#" + targetSelectId + "_box").children("li").not(".search_select_not_text").length;
        let select_options_length = $(self).children("option").length;

        // 中身の数が大元のselectと違う場合かつ更新中ではない場合は中身を最新化
        if(now_select_content_length != select_options_length && !isUpdateFlg){
            // コンテンツ入れ直し
            list[targetSelectId] = setContent(self, targetSelectId);
        }

        // 擬似プルダウンの選択内容とselectの選択内容に相違がある場合は再セットを行う
        if(Number($("." + selectClass).val()) != targetSelect.val()){
            setValue(targetSelect.val());
        }

        // 初期フォーカス
        moveNextContent();

        // 選択ボックス表示・inputにフォーカス当てる
        $("#" + targetSelectId + "_parent").find(".search_select_add_content").show();
        $("#" + targetSelectId + "_input").focus();

        // 処理後の独自イベント
        $(self).trigger('targetSelectClickAfter');

        // active位置が表示枠の範囲外の場合は自動スクロール
        scrollsBeyondTheActivePosition();
    }

    // リスト選択
    $(document).on('click', '.search_select_content', function(){
        $(this).trigger('listClickBefore');

        // 正常に作動していない場合は何もしない
        if(targetSelect === null){return error_log();}

        // 選択内容をselectにセット
        $(targetSelect).val($(this).attr('value'));

        // active設定
        $("." + selectClass).removeClass(selectClass);
        $("#" + $(this).attr('id')).addClass(selectClass);

        isChange = true;

        // 選択box非表示
        $("#" + targetSelectId + "_parent").find(".search_select_add_content").trigger("contentHide");

        $(this).trigger('listClickAfter');
    })

    // 入力イベント
    $(document).on('change input', '.search_select_input', function(){
        $('.search_select_input').trigger('searchInput');

        // 入力フラグを立てる
        input_flg = true;

        // 正常に作動していない場合は何もしない
        if(targetSelect === null){return error_log();}

        // 選択の箱のid
        let drop_box = targetSelectId + "_box";
        // 入力内容
        let searchText = $(this).val();

        let newList = [];
        // 中のリストから入力内容に沿った中身のみになるようチェック
        $.each($("#"+drop_box).children("li"), function(idx, elm){
            // console.log({check_result: $(elm).text().indexOf(searchText), text: searchText, hikaku: $(elm).text()});
            // ０件時項目以外をチェック対象とする
            if(!$(elm).hasClass('search_select_not_text')){
                // ひっかかった場合は表示
                if($(elm).text().indexOf(searchText) !== -1){
                    $(elm).show();
                    $(elm).addClass("search_select_content_active");
                    newList.push($(elm).attr('id'));
                } else {
                    $(elm).hide();
                    $(elm).removeClass("search_select_content_active");
                }
            }
        })

        // 一覧表示中の内容を更新
        list[targetSelectId] = newList;
        // activeし直し
        moveNextContent();

        // 絞り込んで0件になったかのチェックをし0件時項目の表示非表示を制御
        if($("#"+drop_box).find('.search_select_content_active').length === 0){
            $("#"+drop_box).find('.search_select_not_text').show();
        } else {
            $("#"+drop_box).find('.search_select_not_text').hide();

            // active位置が表示枠の範囲外の場合は自動スクロール
            scrollsBeyondTheActivePosition();
        }
    })

    // key入力の監視
    $(document).on('keydown', function(e){
        // 正常に作動していない場合は何もしない
        if(targetSelect === null){return error_log();}

        // console.log({表示中: checkSearchSelectIsShow()});
        // 選択一覧が表示されている場合のみ監視
        if(checkSearchSelectIsShow()){
            // 矢印操作
            if(e.key === "ArrowUp"){
                $('#' + targetSelectId + "_input").blur();
                moveNextContent(-1);
                // active位置が表示枠の範囲外の場合は自動スクロール
                scrollsBeyondTheActivePosition(-1);
                // 画面スクロール禁止(プルダウンの中身のみ移動させたいため)
                e.preventDefault()
            } else if(e.key === "ArrowDown"){
                $('#' + targetSelectId + "_input").blur();
                moveNextContent(1);
                // active位置が表示枠の範囲外の場合は自動スクロール
                scrollsBeyondTheActivePosition(1);
                // 画面スクロール禁止(プルダウンの中身のみ移動させたいため)
                e.preventDefault()
            } else if(e.key === "Enter"){
                // inputにフォーカスが当たっていない場合または表示後入力なしエンター
                if(!$('#' + targetSelectId + "_input").is(':focus') || !input_flg){
                    // 選択中のものがある場合はそれをselectにセット
                    if($("." + selectClass).length > 0){
                        $(targetSelect).val($("." + selectClass).attr('value'));
                    }
                    isChange = true;
                    // 閉じる
                    $("#" + targetSelectId + "_parent").find(".search_select_add_content").trigger("contentHide");
                    // エンターを押下するとsubmitされるのを防ぐ
                    e.preventDefault();
                }
            }
        }
    })

    // 範囲外クリックチェック
    $(document).on('click',function(e) {
        // 選択一覧非表示の場合はチェック対象外
        if(!checkSearchSelectIsShow()){ return }

        if(!$(e.target).closest('#' + targetSelectId + "_parent").length) {
            // ボックスの外側をクリックした時は選択終了
            $("#" + targetSelectId + "_parent").find(".search_select_add_content").trigger("contentHide");
        }
    });

    // 閉じイベント
    $(document).on("contentHide", ".search_select_add_content", function(){
        // select表示選択一覧非表示
        $(targetSelect).show();
        $("#" + targetSelectId + "_parent").find(".search_select_add_content").hide();

        // 非表示にしてからchangeイベント発火
        if(isChange){
            // 本来のselectのchangeイベントを発生
            $(targetSelect).trigger('change');
            isChange = false;
        }

        // 選択状態初期化
        start_flg = false;
        targetSelect = null;
        targetSelectId = "";
        selectClass = "";

        // 閉じた後の処理を行う独自イベント
        $(selector).trigger('contentHideAfter');
    })

    // 項目の移動
    // moveAngle: int(±) 上に移動: -1, 下に移動: 1
    function moveNextContent(moveAngle=0){
        // activeされていない場合はlistひとつめの項目をactive
        if($("." + selectClass).length === 0){
            firstFocus();
        }
        // 移動でない場合はここで終了
        if(moveAngle === 0){return;}

        // 現在選択中の項目が表示項目なのかどうか(表示:0以上, 非表示:-1)
        let nowIndex = $.inArray($("." + selectClass).eq(0).attr('id'), list[targetSelectId]);

        // 非表示になった項目が選択されていた場合
        if (nowIndex === -1){
            // listひとつめの項目をactive
            firstFocus();
        } else {
            // 次の移動先index
            let nextIndex = Number(nowIndex) + moveAngle;
            // 次の移動先idがある場合はそれをactive
            if(nextIndex in list[targetSelectId]){
                // 次の移動先id
                let nextId = list[targetSelectId][nextIndex];
                if($("#" + nextId).length > 0){
                    $("." + selectClass).removeClass(selectClass);
                    $("#" + nextId).addClass(selectClass);
                }
            }
        }
    }

    // 項目の一つ目をフォーカス状態にする
    function firstFocus(){
        // ひとつ目を取得するためactive項目の数をチェック
        if(list[targetSelectId].length > 0) {
            // ひとつ目のacviteな項目のidを取得
            let activeid = list[targetSelectId][0];
            $("." + selectClass).removeClass(selectClass);
            $("#" + activeid).addClass(selectClass);
            return;
        }
    }

    // 指定の値の項目にフォーカスを当てる
    function setValue(val){
        let setElm = $(`#${targetSelectId}_box li[value='${val}']`);
        if(setElm.length > 0){
            $("." + selectClass).removeClass(selectClass);
            setElm.addClass(selectClass);
        }
    }

    // 選択中の項目の位置が枠の範囲外に行った場合は自動スクロールを行い範囲内に表示されるように調整する
    function scrollsBeyondTheActivePosition(moveAngle=0){
        // 中身がなければ何もしない
        if($("." + selectClass).length === 0){return;}

        const scroll = $("#" + targetSelectId + "_box").scrollTop();
        // 枠の高さ
        const maxBoxHeight = $("#" + targetSelectId + "_box").height();
        // コンテンツの位置
        var contentPosition = $("." + selectClass).eq(0).position();
        // コンテンツの高さ
        const contentHeight = $("." + selectClass).eq(0).outerHeight(true);
        // 項目のbottomとtop位置
        const contentBottom = contentPosition.top + contentHeight;
        const contentTop = contentPosition.top;
        // console.log({top: contentTop, bottom: contentBottom, content_height: contentHeight, box_height: maxBoxHeight, scroll_position: scroll});
        let isTopOrver = contentTop < 0;
        let isBottomOrver = maxBoxHeight < contentBottom;

        // 初期表示または上移動の場合はtopの位置が超えていないかチェック
        if(isTopOrver && moveAngle <= 0){
            $("#" + targetSelectId + "_box").scrollTop(scroll + contentTop);
        }
        // 初期表示または下移動の場合はbottomの位置が超えていないかチェック
        if(isBottomOrver && moveAngle >= 0){
            $("#" + targetSelectId + "_box").scrollTop((contentBottom + scroll) - maxBoxHeight);
        }
    }

    // 選択一覧が表示されているかのチェック
    // return: bool
    function checkSearchSelectIsShow(){
        return $("#" + targetSelectId + "_parent").find(".search_select_add_content").css('display') !== "none";
    }

    // エラーログ用
    function error_log(msg=''){
        // 指定のメッセージがある場合はそれをログに出す
        if(msg.length > 0){
            console.error(msg);
        }

        // 更新の時に指定のnodeが渡されていない場合はエラー
        if(isUpdateFlg){
            isUpdateFlg = false;
            console.error('Error[search_select]: not select update node');
        }

        // 破壊の時に指定のnodeが渡されていない場合はエラー
        if(isDeleteFlg){
            isDeleteFlg = false;
            console.error('Error[search_select]: not select destroy node');
        }

        // まだ選択開始していない場合は終了
        if(!start_flg){return}

        // 正常に初期設定が行われていない場合は何もしない
        if(targetSelect === null){
            console.error('Error[search_select]: not init');
        }
        return;
    }
}
