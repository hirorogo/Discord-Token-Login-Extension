if (document.querySelector('.discord-token-login-popup')) {

    const discordLink = document.querySelector('#discord-link');
    if (discordLink) {
        discordLink.addEventListener('click', () => {
            window.open('https://discord.ozeu.net', '_blank');
        });
    }
      const tokenInput = document.querySelector('#token');
    const submitBtn = document.querySelector('#submit');
    const saveToggle = document.querySelector('#save-toggle');
    const savedAccountsTrigger = document.querySelector('#saved-accounts-trigger');
    const accountListContainer = document.querySelector('#account-list-container');
    const accountList = document.querySelector('#account-list');
    const errorMessage = document.querySelector('#error-message');
    
    // 大量インポート関連の要素
    const bulkImportTrigger = document.querySelector('#bulk-import-trigger');
    const bulkImportContainer = document.querySelector('#bulk-import-container');
    const tokenFileInput = document.querySelector('#token-file-input');
    const uploadFileBtn = document.querySelector('#upload-file-btn');
    const bulkTokenInput = document.querySelector('#bulk-token-input');
    const processTokensBtn = document.querySelector('#process-tokens-btn');
    const bulkProgress = document.querySelector('#bulk-progress');
    const progressCount = document.querySelector('#progress-count');
    const progressTotal = document.querySelector('#progress-total');
    const progressFill = document.querySelector('#progress-fill');
    const bulkResult = document.querySelector('#bulk-result');

    chrome.storage.local.get(['isSaveEnabled'], (result) => {
        saveToggle.checked = result.isSaveEnabled || false;
    });

    saveToggle.addEventListener('change', () => {
        chrome.storage.local.set({ isSaveEnabled: saveToggle.checked });
    });    savedAccountsTrigger.addEventListener('click', () => {
        const isOpen = accountListContainer.classList.contains('open');
        
        if (!isOpen) {
            renderSavedAccounts();
            accountListContainer.classList.add('open');
            savedAccountsTrigger.textContent = 'Hide Saved Accounts ▲';
            // 大量インポートが開いていたら閉じる
            if (bulkImportContainer.classList.contains('open')) {
                bulkImportContainer.classList.remove('open');
                bulkImportTrigger.textContent = 'Bulk Import Tokens ▼';
            }
        } else {
            accountListContainer.classList.remove('open');
            savedAccountsTrigger.textContent = 'Show Saved Accounts ▼';
        }
    });

    // 大量インポート機能のイベントリスナー
    bulkImportTrigger.addEventListener('click', () => {
        const isOpen = bulkImportContainer.classList.contains('open');
        
        if (!isOpen) {
            bulkImportContainer.classList.add('open');
            bulkImportTrigger.textContent = 'Hide Bulk Import ▲';
            // アカウント一覧が開いていたら閉じる
            if (accountListContainer.classList.contains('open')) {
                accountListContainer.classList.remove('open');
                savedAccountsTrigger.textContent = 'Show Saved Accounts ▼';
            }
        } else {
            bulkImportContainer.classList.remove('open');
            bulkImportTrigger.textContent = 'Bulk Import Tokens ▼';
        }
    });

    // 大量インポートトリガーイベント
    document.getElementById('bulk-import-trigger').addEventListener('click', function() {
        console.log('Bulk import trigger clicked'); // デバッグ用
        
        const container = document.getElementById('bulk-import-container');
        const trigger = document.getElementById('bulk-import-trigger');
        
        console.log('Container:', container); // デバッグ用
        console.log('Current classes:', container.className); // デバッグ用
        
        if (container.classList.contains('open')) {
            container.classList.remove('open');
            trigger.textContent = 'Bulk Import Tokens ▼';
        } else {
            container.classList.add('open');
            trigger.textContent = 'Bulk Import Tokens ▲';
        }
    });

    uploadFileBtn.addEventListener('click', () => {
        tokenFileInput.click();
    });

    tokenFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (e) => {
                bulkTokenInput.value = e.target.result;
            };
            reader.readAsText(file);
        }
    });

    processTokensBtn.addEventListener('click', async () => {
        const text = bulkTokenInput.value.trim();
        if (!text) {
            showBulkResult('エラー: トークンが入力されていません', 'error');
            return;
        }

        const tokens = parseTokens(text);
        if (tokens.length === 0) {
            showBulkResult('エラー: 有効なトークンが見つかりませんでした', 'error');
            return;
        }

        await processBulkTokens(tokens);
    });

    tokenInput.addEventListener('input', () => {
        tokenInput.style.border = '1px solid #1E1F22';
        hideError();
    });

    submitBtn.addEventListener('click', async () => {
        const token = tokenInput.value.trim().replace(/^"|"$/g, '');
        hideError();

        if (token === '') {
            triggerShake();
            tokenInput.style.border = '1px solid #f23f42';
            return;
        }

        tokenInput.style.border = '1px solid #5865f2';

        if (saveToggle.checked) {
            // const isAlreadySaved = await checkTokenExists(token);
            // if (!isAlreadySaved) {
            const success = await fetchAndSaveUser(token);
            //    if (!success) return; 
            // } else {
            //    console.log("Token already saved");
            // }
            if (!success) return;
        }

        login(token);
    });

    function login(token) {
        window.open("https://discord.com/channels/@me?discordtoken=" + token, '_blank');
    }

    // function checkTokenExists(token) {
    //     return new Promise((resolve) => {
    //         chrome.storage.local.get(['accounts'], (result) => {
    //             const accounts = result.accounts || [];
    //             const exists = accounts.some(acc => acc.token === token);
    //             resolve(exists);
    //         });
    //     });
    // }

    async function fetchAndSaveUser(token) {
        try {
            const response = await fetch('https://discord.com/api/v9/users/@me', {
                headers: { 'Authorization': token }
            });

            if (response.status === 401) {
                showError("(401: unauthorized)");
                triggerShake();
                return false;
            }

            if (!response.ok) {
                showError(`Error: ${response.status}`);
                triggerShake();
                return false;
            }

            const data = await response.json();
            const avatarUrl = getAvatarUrl(data.id, data.avatar, data.discriminator);
            
            const userInfo = {
                id: data.id,
                username: data.username,
                global_name: data.global_name,
                avatar: avatarUrl,
                token: token,
                savedAt: Date.now()
            };

            await saveToStorage(userInfo);
            return true;

        } catch (e) {
            showError(e);
            triggerShake();
            return false;
        }
    }

    function triggerShake() {
        tokenInput.classList.remove('shake');
        void tokenInput.offsetWidth;
        tokenInput.classList.add('shake');

        setTimeout(() => {
            tokenInput.classList.remove('shake');
        }, 400);
    }

    function showError(text) {
        tokenInput.style.border = '1px solid #f23f42';
        errorMessage.textContent = text;
        errorMessage.classList.add('visible');
    }

    function hideError() {
        errorMessage.classList.remove('visible');
        setTimeout(() => {
            if(!errorMessage.classList.contains('visible')) errorMessage.textContent = '';
        }, 300);
    }

    function getAvatarUrl(userId, avatarHash, discriminator) {
        if (avatarHash) {
            return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`;
        }
        const index = BigInt(userId) % 5n;
        return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    }

    function saveToStorage(newAccount) {
        return new Promise((resolve) => {
            chrome.storage.local.get(['accounts'], (result) => {
                let accounts = result.accounts || [];
                const existingIndex = accounts.findIndex(acc => acc.id === newAccount.id);

                if (existingIndex !== -1) {
                    accounts[existingIndex] = newAccount;
                } else {
                    accounts.push(newAccount);
                }

                chrome.storage.local.set({ accounts: accounts }, resolve);
            });
        });
    }

    function renderSavedAccounts() {
        accountList.innerHTML = '';
        
        chrome.storage.local.get(['accounts'], (result) => {
            const accounts = result.accounts || [];
            
            if (accounts.length === 0) {
                accountList.innerHTML = '<div style="padding:10px; font-size:12px; text-align:center; color:#949ba4;">No accounts saved</div>';
                return;
            }

            accounts.forEach(acc => {
                const item = document.createElement('div');
                item.className = 'account-item';
                
                item.innerHTML = `
                    <img src="${acc.avatar}" class="account-avatar" alt="icon">
                    <div class="account-info">
                        <span class="account-username">${acc.global_name || acc.username}</span>
                        <span class="account-id">${acc.username}</span>
                    </div>
                    <div class="delete-btn" title="Remove">×</div>
                `;

                const deleteBtn = item.querySelector('.delete-btn');

                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();

                    item.classList.add('deleting');

                    setTimeout(() => {
                        removeAccount(acc.id);
                    }, 500);
                });

                item.addEventListener('click', () => {
                    login(acc.token);
                });

                accountList.appendChild(item);
            });
        });
    }

    function removeAccount(userId) {
        chrome.storage.local.get(['accounts'], (result) => {
            let accounts = result.accounts || [];
            accounts = accounts.filter(acc => acc.id !== userId);
            chrome.storage.local.set({ accounts: accounts }, () => {
                renderSavedAccounts();
            });
        });
    }

    // 大量トークン処理用の関数群
    function parseTokens(text) {
        const tokens = [];
        const lines = text.split(/\r?\n/);
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
                continue; // 空行やコメント行をスキップ
            }
            
            // 各種フォーマットに対応
            let lineTokens = [];
            
            // カンマ区切り: token,token
            if (trimmedLine.includes(',')) {
                lineTokens = trimmedLine.split(',');
            }
            // スラッシュ区切り: token/token
            else if (trimmedLine.includes('/')) {
                lineTokens = trimmedLine.split('/');
            }
            // スペース区切り: token token
            else if (trimmedLine.includes(' ')) {
                lineTokens = trimmedLine.split(/\s+/);
            }
            // 単一トークン
            else {
                lineTokens = [trimmedLine];
            }
            
            // トークンを整形して追加
            for (const token of lineTokens) {
                const cleanToken = token.trim().replace(/^["']|["']$/g, '');
                if (cleanToken && isValidTokenFormat(cleanToken)) {
                    tokens.push(cleanToken);
                }
            }
        }
        
        // 重複を除去
        return [...new Set(tokens)];
    }

    function isValidTokenFormat(token) {
        // Discordトークンの基本的な形式チェック
        // 実際のトークンは複雑な形式を持つが、基本的な長さと文字種をチェック
        return token.length > 50 && /^[A-Za-z0-9\-_\.]+$/.test(token);
    }

    async function processBulkTokens(tokens) {
        showBulkProgress(true);
        updateProgress(0, tokens.length);
        
        let successCount = 0;
        let failCount = 0;
        const failedTokens = [];
        
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            updateProgress(i + 1, tokens.length);
            
            try {
                const success = await fetchAndSaveUser(token);
                if (success) {
                    successCount++;
                } else {
                    failCount++;
                    failedTokens.push(token.substring(0, 20) + '...');
                }
            } catch (error) {
                failCount++;
                failedTokens.push(token.substring(0, 20) + '...');
            }
            
            // APIレート制限を考慮して少し待機
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        showBulkProgress(false);
        showBulkResult(
            `処理完了: 成功 ${successCount}件, 失敗 ${failCount}件${failCount > 0 ? '\n失敗したトークン: ' + failedTokens.slice(0, 3).join(', ') + (failedTokens.length > 3 ? '...' : '') : ''}`,
            successCount > 0 ? 'success' : 'warning'
        );
        
        // 保存したアカウント一覧を更新
        if (accountListContainer.classList.contains('open')) {
            renderSavedAccounts();
        }
    }

    function showBulkProgress(show) {
        if (show) {
            bulkProgress.classList.remove('hidden');
            bulkResult.classList.add('hidden');
        } else {
            bulkProgress.classList.add('hidden');
        }
    }

    function updateProgress(current, total) {
        progressCount.textContent = current;
        progressTotal.textContent = total;
        const percentage = (current / total) * 100;
        progressFill.style.width = percentage + '%';
    }

    function showBulkResult(message, type = 'info') {
        bulkResult.classList.remove('hidden');
        const resultText = bulkResult.querySelector('.result-text');
        resultText.textContent = message;
        
        // 結果タイプに応じてスタイルを変更
        bulkResult.className = 'bulk-result ' + type;
        
        if (type === 'error') {
            bulkResult.style.borderLeftColor = '#f23f42';
        } else if (type === 'success') {
            bulkResult.style.borderLeftColor = '#3ba55c';
        } else if (type === 'warning') {
            bulkResult.style.borderLeftColor = '#faa61a';
        } else {
            bulkResult.style.borderLeftColor = '#5865f2';
        }
    }
}