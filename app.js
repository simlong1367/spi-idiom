document.addEventListener('DOMContentLoaded', () => {
    const LOCAL_STORAGE_KEY = 'spi_known_words';
    // ローカルストレージから覚えた単語のリストを読み込む
    let knownWords = new Set(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || []);
    let allData = [...idiomsData];
    let activeData = [];
    let currentIndex = 0;
    let isMeaningShown = false;

    // DOM要素の取得
    const card = document.getElementById('flashcard');
    const wordEl = document.getElementById('word');
    const furiganaEl = document.getElementById('furigana');
    const meaningEl = document.getElementById('meaning');
    const progressEl = document.getElementById('progress-text');
    
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const knownBtn = document.getElementById('known-btn');

    // ドロワー関連のDOM
    const menuBtn = document.getElementById('menu-btn');
    const overlay = document.getElementById('overlay');
    const drawer = document.getElementById('drawer');
    const closeBtn = document.getElementById('close-btn');
    const unknownListEl = document.getElementById('word-list-unknown');
    const knownListEl = document.getElementById('word-list-known');
    
    // タブ関連のDOM
    const tabUnknown = document.getElementById('tab-unknown');
    const tabKnown = document.getElementById('tab-known');

    // 初期化
    refreshActiveData();
    renderWordList();
    updateCard();

    // ==========================================
    // ドロワー（メニュー）のロジック
    // ==========================================
    
    // タブ切り替え処理
    tabUnknown.addEventListener('click', () => {
        tabUnknown.classList.add('active');
        tabKnown.classList.remove('active');
        unknownListEl.classList.remove('hidden');
        knownListEl.classList.add('hidden');
    });

    tabKnown.addEventListener('click', () => {
        tabKnown.classList.add('active');
        tabUnknown.classList.remove('active');
        knownListEl.classList.remove('hidden');
        unknownListEl.classList.add('hidden');
    });
    menuBtn.addEventListener('click', () => {
        renderWordList(); // 開くたびに最新の状態を描画
        drawer.classList.add('active');
        overlay.classList.add('active');
    });

    function closeDrawer() {
        drawer.classList.remove('active');
        overlay.classList.remove('active');
    }
    closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    function renderWordList() {
        unknownListEl.innerHTML = '';
        knownListEl.innerHTML = '';
        
        allData.forEach((item) => {
            const isKnown = knownWords.has(item.word);
            const li = document.createElement('li');
            if (isKnown) li.classList.add('known');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'word-list-checkbox';
            checkbox.checked = isKnown;
            
            // チェックボックスの状態が変わった時
            checkbox.addEventListener('change', (e) => {
                toggleKnownWord(item.word, e.target.checked);
                // チェック状態が変わったらリストを再描画して移動させる
                renderWordList();
            });

            const infoDiv = document.createElement('div');
            infoDiv.className = 'word-list-info';
            infoDiv.innerHTML = `
                <div class="word-list-title">${item.word} <span class="word-list-furigana">${item.furigana}</span></div>
                <div class="word-list-meaning">${item.meaning}</div>
            `;

            li.appendChild(checkbox);
            li.appendChild(infoDiv);
            
            if (isKnown) {
                knownListEl.appendChild(li);
            } else {
                unknownListEl.appendChild(li);
            }
        });
    }

    // ==========================================
    // データ管理のロジック
    // ==========================================
    function toggleKnownWord(word, isKnown) {
        if (isKnown) {
            knownWords.add(word);
        } else {
            knownWords.delete(word);
        }
        // localStorageに保存
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...knownWords]));
        
        // データを再フィルタリング
        refreshActiveData();
        
        // インデックスの調整
        if (activeData.length > 0 && currentIndex >= activeData.length) {
            currentIndex = 0;
        }
        
        isMeaningShown = false;
        updateCard();
    }

    function refreshActiveData() {
        activeData = allData.filter(item => !knownWords.has(item.word));
    }

    // ==========================================
    // クイズ（フラッシュカード）のロジック
    // ==========================================
    card.addEventListener('click', () => {
        if (activeData.length === 0) return;
        
        if (!isMeaningShown) {
            isMeaningShown = true;
            renderMeaning();
        } else {
            nextBtn.click();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (activeData.length === 0) return;
        
        if (currentIndex < activeData.length - 1) {
            currentIndex++;
        } else {
            currentIndex = 0;
            alert('現在のリストを1周しました！最初に戻ります。');
        }
        isMeaningShown = false;
        updateCard();
    });

    prevBtn.addEventListener('click', () => {
        if (activeData.length === 0) return;
        
        if (currentIndex > 0) {
            currentIndex--;
            isMeaningShown = false;
            updateCard();
        }
    });

    shuffleBtn.addEventListener('click', () => {
        if (activeData.length === 0) return;
        
        if(confirm('未学習の問題をシャッフルしますか？')) {
            shuffleArray(activeData);
            currentIndex = 0;
            isMeaningShown = false;
            updateCard();
        }
    });

    knownBtn.addEventListener('click', () => {
        if (activeData.length === 0) return;
        
        const currentItem = activeData[currentIndex];
        // 覚えたリストに追加（自動的に次へ進む）
        toggleKnownWord(currentItem.word, true);
    });

    function updateCard() {
        if (activeData.length === 0) {
            wordEl.textContent = '🎉 学習完了！';
            furiganaEl.textContent = 'お疲れ様でした';
            meaningEl.textContent = 'メニューからチェックを外すと復習できます';
            meaningEl.classList.remove('hidden');
            progressEl.textContent = '0 / 0';
            return;
        }

        if (currentIndex >= activeData.length) {
            currentIndex = 0;
        }

        const currentItem = activeData[currentIndex];
        wordEl.textContent = currentItem.word;
        furiganaEl.textContent = currentItem.furigana;
        renderMeaning();
        updateProgress();
    }

    function renderMeaning() {
        if (activeData.length === 0) return;
        
        const currentItem = activeData[currentIndex];
        if (isMeaningShown) {
            meaningEl.textContent = currentItem.meaning;
            meaningEl.classList.remove('hidden');
        } else {
            meaningEl.textContent = 'タップして意味を表示';
            meaningEl.classList.add('hidden');
        }
    }

    function updateProgress() {
        if (activeData.length === 0) return;
        progressEl.textContent = `${currentIndex + 1} / ${activeData.length} (残り${activeData.length}語)`;
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
});
