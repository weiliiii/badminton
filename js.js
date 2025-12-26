// ===== 固定成員名單（季繳成員）=====
const FIXED_MEMBERS = [
    "SHIU",
    "學長", 
    "聖勛",
    "小馬",
    "Pota",
    "信華",
    "P+",
    "41",
    "維尼",
    "宥蓁"
];

// ===== Firebase 設定 =====
const FIRESTORE_DOC = "games/badminton"; // Firestore 文件路徑
let isOnline = false;
let unsubscribe = null; // 用於取消監聽

function createPlayer(name, isFixed = false) {
    const div = document.createElement("div");
    div.className = "player-box";
    if (isFixed) {
        div.classList.add("fixed-member");
    }
    div.draggable = true;
    div.innerText = name;
    div.addEventListener("click", onPlayerClick);
    return div;
}

const MAX_PLAYERS_PER_COURT = 4;
const MAX_PLAYERS_PER_WAIT = 4;

// ===== Firebase 儲存（即時同步）=====
function savePlayers() {
    const allPlayers = {};
    document.querySelectorAll(".player-box").forEach(box => {
        const name = box.innerText;
        const parentId = box.parentElement.id;
        allPlayers[name] = parentId;
    });
    
    // 儲存到 Firebase
    db.doc(FIRESTORE_DOC).set({
        players: allPlayers,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        console.log("✅ 資料已同步到雲端");
    }).catch(error => {
        console.error("❌ 同步失敗:", error);
        // 失敗時備份到 localStorage
        localStorage.setItem("badminton-backup", JSON.stringify(allPlayers));
    });
}

// ===== Firebase 載入（即時監聽）=====
function loadPlayers() {
    showLoadingIndicator();
    
    // 設定即時監聽
    unsubscribe = db.doc(FIRESTORE_DOC).onSnapshot(
        (doc) => {
            isOnline = true;
            updateConnectionStatus(true);
            
            if (doc.exists) {
                const data = doc.data();
                const positions = data.players || {};
                renderPlayers(positions);
                console.log("📥 收到雲端資料更新");
            } else {
                // 文件不存在，初始化固定成員
                console.log("📝 初始化資料...");
                initializeDefaultPlayers();
            }
            
            hideLoadingIndicator();
        },
        (error) => {
            console.error("❌ 監聽錯誤:", error);
            isOnline = false;
            updateConnectionStatus(false);
            
            // 離線時從 localStorage 載入
            loadFromLocalBackup();
            hideLoadingIndicator();
        }
    );
}

// 渲染玩家（根據位置資料）
function renderPlayers(positions) {
    const areas = {
        "rest": document.getElementById("rest"),
        "court1": document.getElementById("court1"),
        "court2": document.getElementById("court2"),
        "court3": document.getElementById("court3"),
        "wait1": document.getElementById("wait1"),
        "wait2": document.getElementById("wait2"),
        "wait3": document.getElementById("wait3")
    };
    
    // 清空所有區域
    Object.values(areas).forEach(area => {
        if (area) area.innerHTML = "";
    });
    
    // 1. 先載入固定成員
    FIXED_MEMBERS.forEach(name => {
        const areaId = positions[name] || "rest";
        if (areas[areaId]) {
            areas[areaId].appendChild(createPlayer(name, true));
        } else {
            areas.rest.appendChild(createPlayer(name, true));
        }
    });
    
    // 2. 再載入非固定成員
    Object.entries(positions).forEach(([name, areaId]) => {
        if (FIXED_MEMBERS.includes(name)) return;
        
        if (areas[areaId]) {
            areas[areaId].appendChild(createPlayer(name, false));
        } else {
            areas.rest.appendChild(createPlayer(name, false));
        }
    });
    
    initDragDrop();
    updatePlayerCounts();
}

// 初始化預設玩家（首次使用）
function initializeDefaultPlayers() {
    const defaultPositions = {};
    FIXED_MEMBERS.forEach(name => {
        defaultPositions[name] = "rest";
    });
    
    db.doc(FIRESTORE_DOC).set({
        players: defaultPositions,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// 從本地備份載入
function loadFromLocalBackup() {
    const backup = localStorage.getItem("badminton-backup");
    if (backup) {
        const positions = JSON.parse(backup);
        renderPlayers(positions);
        console.log("📂 從本地備份載入");
    } else {
        // 沒有備份，載入固定成員
        const defaultPositions = {};
        FIXED_MEMBERS.forEach(name => {
            defaultPositions[name] = "rest";
        });
        renderPlayers(defaultPositions);
    }
}

// 連線狀態指示器
function updateConnectionStatus(online) {
    let indicator = document.getElementById("connection-status");
    if (!indicator) {
        indicator = document.createElement("div");
        indicator.id = "connection-status";
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 6px;
        `;
        document.body.appendChild(indicator);
    }
    
    if (online) {
        indicator.innerHTML = '<span style="color: #2ecc71;">●</span> 已同步';
        indicator.style.background = "rgba(46, 204, 113, 0.2)";
        indicator.style.color = "#27ae60";
    } else {
        indicator.innerHTML = '<span style="color: #e74c3c;">●</span> 離線模式';
        indicator.style.background = "rgba(231, 76, 60, 0.2)";
        indicator.style.color = "#c0392b";
    }
}

// 載入中指示器
function showLoadingIndicator() {
    let loader = document.getElementById("loading-indicator");
    if (!loader) {
        loader = document.createElement("div");
        loader.id = "loading-indicator";
        loader.innerHTML = "⏳ 連線中...";
        loader.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 20px 40px;
            background: white;
            border-radius: 15px;
            box-shadow: 0 5px 30px rgba(0,0,0,0.2);
            font-size: 18px;
            z-index: 10000;
        `;
        document.body.appendChild(loader);
    }
}

function hideLoadingIndicator() {
    const loader = document.getElementById("loading-indicator");
    if (loader) loader.remove();
}

function addPlayer() {
    const input = document.getElementById("playerInput");
    const name = input.value.trim();
    if (!name) return;
    document.getElementById("rest").appendChild(createPlayer(name));
    input.value = "";
    savePlayers();
    initDragDrop();
    updatePlayerCounts();
}

function resetAll() {
    if (!confirm("確定要重置所有資料嗎？這會影響所有人的畫面！")) return;
    
    document.querySelectorAll(".list").forEach(list => list.innerHTML = "");
    
    // 重置為固定成員
    const defaultPositions = {};
    FIXED_MEMBERS.forEach(name => {
        defaultPositions[name] = "rest";
    });
    
    db.doc(FIRESTORE_DOC).set({
        players: defaultPositions,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    updatePlayerCounts();
}

let selectedPlayers = [];

function removePlayer() {
    showDeleteModal();
}

function showDeleteModal() {
    const modal = document.getElementById("deleteModal");
    const playerList = document.getElementById("playerList");
    
    playerList.innerHTML = "";
    selectedPlayers = [];
    
    function getAreaName(areaId) {
        if (areaId === "rest") return "休息區";
        if (areaId.startsWith("court")) return `場地 ${areaId.replace("court", "")}`;
        if (areaId.startsWith("wait")) return `等待 ${areaId.replace("wait", "")}`;
        return areaId;
    }
    
    document.querySelectorAll(".player-box").forEach(box => {
        const name = box.innerText;
        const area = box.parentElement.id;
        const isFixed = FIXED_MEMBERS.includes(name);
        
        const div = document.createElement("div");
        div.className = "player-checkbox";
        
        const fixedBadge = isFixed ? '<span class="fixed-badge">季繳</span>' : '';
        const fixedNote = isFixed ? ' <small style="color:#999">(重開瀏覽器會恢復)</small>' : '';
        
        div.innerHTML = `
            <input type="checkbox" id="player_${name}" value="${name}">
            <label for="player_${name}">${fixedBadge}${name} (${getAreaName(area)})${fixedNote}</label>
        `;
        
        div.querySelector("input").addEventListener("change", function() {
            if (this.checked) {
                selectedPlayers.push(name);
            } else {
                selectedPlayers = selectedPlayers.filter(p => p !== name);
            }
        });
        
        playerList.appendChild(div);
    });
    
    modal.style.display = "flex";
}

function deleteSelectedPlayers() {
    if (selectedPlayers.length === 0) {
        alert("請至少選擇一位隊員");
        return;
    }
    
    if (confirm(`確定要刪除 ${selectedPlayers.length} 位隊員嗎？\n${selectedPlayers.join(", ")}`)) {
        selectedPlayers.forEach(name => {
            document.querySelectorAll(".player-box").forEach(box => {
                if (box.innerText === name) box.remove();
            });
        });
        savePlayers();
        closeDeleteModal();
        updatePlayerCounts();
        console.log(`${selectedPlayers.length} 位隊員已刪除`);
    }
}

function closeDeleteModal() {
    document.getElementById("deleteModal").style.display = "none";
    selectedPlayers = [];
}

function onPlayerClick(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (e.preventDefault) e.preventDefault();
    
    const player = e.target.closest ? e.target.closest(".player-box") : e.target;
    if (!player || !player.classList.contains("player-box")) return;
    
    const now = Date.now();
    if (now - lastClickTime < 300) {
        console.log("防止重複點擊");
        return;
    }
    lastClickTime = now;
    lastClickedPlayer = player;
    
    const playerName = player.innerText;
    const parentId = player.parentElement ? player.parentElement.id : null;
    
    if (!parentId) return;
    
    if (parentId === "rest") {
        const targetCourt = findAvailableCourt();
        if (targetCourt) {
            targetCourt.appendChild(player);
            console.log(`${playerName} 進入 ${targetCourt.id}`);
        } else {
            alert("所有場地都滿了！請等待。");
            return;
        }
    } else if (parentId.startsWith("court")) {
        document.getElementById("rest").appendChild(player);
        console.log(`${playerName} 返回休息區`);
    } else {
        return;
    }
    
    savePlayers();
    updatePlayerCounts();
}

function endMatch(courtId) {
    const court = document.getElementById(courtId);
    if (!court) return;

    const rest = document.getElementById("rest");
    const playersOnCourt = Array.from(court.querySelectorAll(".player-box"));
    playersOnCourt.forEach(p => rest.appendChild(p));
    console.log(`${courtId} 比賽結束，${playersOnCourt.length}人返回休息區`);

    moveWait1ToCourt(court);
    rearrangeWaitingQueues();
    
    savePlayers();
    updatePlayerCounts();
}

function moveWait1ToCourt(court) {
    const wait1 = document.getElementById("wait1");
    if (!wait1 || wait1.children.length === 0) return;

    while (court.children.length < MAX_PLAYERS_PER_COURT && 
           wait1.children.length > 0) {
        court.appendChild(wait1.firstElementChild);
    }
}

function rearrangeWaitingQueues() {
    const wait1 = document.getElementById("wait1");
    const wait2 = document.getElementById("wait2");
    const wait3 = document.getElementById("wait3");
    
    // 將 wait2 的人移到 wait1
    if (wait2 && wait2.children.length > 0) {
        while (wait2.children.length > 0) {
            wait1.appendChild(wait2.firstElementChild);
        }
    }
    
    // 將 wait3 的人移到 wait2
    if (wait3 && wait3.children.length > 0) {
        while (wait3.children.length > 0) {
            wait2.appendChild(wait3.firstElementChild);
        }
    }
}

function findAvailableCourt() {
    const courts = ["court1", "court2", "court3"];
    
    for (let courtId of courts) {
        const court = document.getElementById(courtId);
        if (court.children.length < MAX_PLAYERS_PER_COURT) {
            return court;
        }
    }
    return null;
}

// ===== 拖拉功能 =====
let draggedElement = null;
let dropZonesInitialized = false;

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let isTouchDragging = false;
let touchClone = null;
let isTouchActive = false;

let lastClickTime = 0;
let lastClickedPlayer = null;

function initDragDrop() {
    document.querySelectorAll(".player-box").forEach(box => {
        const newBox = box.cloneNode(true);
        box.parentNode.replaceChild(newBox, box);
        
        newBox.addEventListener("click", function(e) {
            if (Date.now() - lastClickTime < 500) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            onPlayerClick(e);
        });
        
        newBox.addEventListener("dragstart", dragStart);
        newBox.addEventListener("dragend", dragEnd);
        
        newBox.addEventListener("touchstart", touchStart, { passive: false });
        newBox.addEventListener("touchmove", touchMove, { passive: false });
        newBox.addEventListener("touchend", touchEnd, { passive: false });
        newBox.addEventListener("touchcancel", touchCancel, { passive: false });
    });
    
    if (!dropZonesInitialized) {
        const dropZones = document.querySelectorAll(".list");
        dropZones.forEach(zone => {
            zone.addEventListener("dragover", allowDrop);
            zone.addEventListener("drop", drop);
            zone.addEventListener("dragleave", dragLeave);
        });
        dropZonesInitialized = true;
    }
}

function touchCancel(e) {
    if (touchClone) {
        touchClone.remove();
        touchClone = null;
    }
    if (draggedElement) {
        draggedElement.style.opacity = "1";
    }
    draggedElement = null;
    isTouchDragging = false;
    isTouchActive = false;
    clearDragOver();
    document.body.classList.remove("touch-dragging-active");
}

function dragStart(e) {
    const player = e.target.closest(".player-box");
    if (!player) return;
    
    draggedElement = player;
    e.dataTransfer.setData("text/plain", player.innerText);
    e.dataTransfer.effectAllowed = "move";
    
    setTimeout(() => {
        player.style.opacity = "0.5";
    }, 0);
}

function dragEnd(e) {
    const player = e.target.closest(".player-box");
    if (player) {
        player.style.opacity = "1";
    }
    draggedElement = null;
    clearDragOver();
}

function allowDrop(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    e.currentTarget.classList.add("drag-over");
}

function drop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const dropZone = e.currentTarget;
    
    if (draggedElement && dropZone) {
        dropZone.appendChild(draggedElement);
        draggedElement.style.opacity = "1";
        draggedElement = null;
        savePlayers();
        updatePlayerCounts();
    }
    clearDragOver();
}

function dragLeave(e) {
    e.currentTarget.classList.remove("drag-over");
}

function clearDragOver() {
    document.querySelectorAll(".drag-over").forEach(el => {
        el.classList.remove("drag-over");
    });
}

function touchStart(e) {
    if (isTouchActive) {
        e.preventDefault();
        e.stopPropagation();
        return;
    }
    
    const player = e.target.closest(".player-box");
    if (!player) return;
    
    isTouchActive = true;
    
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
    isTouchDragging = false;
    
    draggedElement = player;
    
    e.stopPropagation();
}

function touchMove(e) {
    if (!draggedElement) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);
    
    if (deltaX > 10 || deltaY > 10) {
        isTouchDragging = true;
        e.preventDefault();
        e.stopPropagation();
        
        if (!touchClone) {
            touchClone = draggedElement.cloneNode(true);
            touchClone.classList.add("touch-dragging");
            touchClone.style.position = "fixed";
            touchClone.style.pointerEvents = "none";
            touchClone.style.zIndex = "9999";
            touchClone.style.opacity = "0.9";
            touchClone.style.transform = "scale(1.1)";
            touchClone.style.boxShadow = "0 5px 20px rgba(0,0,0,0.3)";
            document.body.appendChild(touchClone);
            
            document.body.classList.add("touch-dragging-active");
            
            draggedElement.style.opacity = "0.3";
        }
        
        const boxWidth = touchClone.offsetWidth;
        const boxHeight = touchClone.offsetHeight;
        touchClone.style.left = (touch.clientX - boxWidth / 2) + "px";
        touchClone.style.top = (touch.clientY - boxHeight / 2) + "px";
        
        highlightDropZone(touch.clientX, touch.clientY);
    }
}

function touchEnd(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedElement || !isTouchActive) {
        isTouchActive = false;
        draggedElement = null;
        isTouchDragging = false;
        return;
    }
    
    const touchDuration = Date.now() - touchStartTime;
    const currentPlayer = draggedElement;
    
    draggedElement = null;
    isTouchDragging = false;
    
    if (touchClone) {
        const touch = e.changedTouches[0];
        const dropZone = getDropZoneAtPoint(touch.clientX, touch.clientY);
        
        if (dropZone && dropZone !== currentPlayer.parentElement) {
            dropZone.appendChild(currentPlayer);
            savePlayers();
            updatePlayerCounts();
            console.log(`${currentPlayer.innerText} 移動到 ${dropZone.id}`);
        }
        
        touchClone.remove();
        touchClone = null;
        currentPlayer.style.opacity = "1";
        clearDragOver();
        
        document.body.classList.remove("touch-dragging-active");
        
    } else if (touchDuration < 300) {
        handlePlayerTap(currentPlayer);
    }
    
    setTimeout(() => {
        isTouchActive = false;
    }, 100);
}

function handlePlayerTap(player) {
    if (!player || !player.parentElement) return;
    
    const playerName = player.innerText;
    const parentId = player.parentElement.id;
    
    const now = Date.now();
    if (now - lastClickTime < 500) {
        console.log("防止重複點擊（觸控）", playerName);
        return;
    }
    lastClickTime = now;
    lastClickedPlayer = player;
    
    console.log(`處理點擊: ${playerName}, 位置: ${parentId}`);
    
    if (parentId === "rest") {
        const targetCourt = findAvailableCourt();
        if (targetCourt) {
            targetCourt.appendChild(player);
            console.log(`${playerName} 進入 ${targetCourt.id}（觸控）`);
            savePlayers();
            updatePlayerCounts();
        } else {
            alert("所有場地都滿了！請等待。");
        }
    } else if (parentId.startsWith("court")) {
        document.getElementById("rest").appendChild(player);
        console.log(`${playerName} 返回休息區（觸控）`);
        savePlayers();
        updatePlayerCounts();
    }
}

function getDropZoneAtPoint(x, y) {
    if (touchClone) {
        touchClone.style.display = "none";
    }
    
    const elementsAtPoint = document.elementsFromPoint(x, y);
    
    if (touchClone) {
        touchClone.style.display = "";
    }
    
    for (const el of elementsAtPoint) {
        if (el.classList.contains("list")) {
            return el;
        }
        const listParent = el.closest(".list");
        if (listParent) {
            return listParent;
        }
    }
    return null;
}

function highlightDropZone(x, y) {
    clearDragOver();
    const dropZone = getDropZoneAtPoint(x, y);
    if (dropZone) {
        dropZone.classList.add("drag-over");
    }
}

// ===== 人數顯示 =====
function updatePlayerCounts() {
    const areas = {
        rest: { title: "rest-title", max: null },
        court1: { title: "court1-title", max: 4 },
        court2: { title: "court2-title", max: 4 },
        court3: { title: "court3-title", max: 4 },
        wait1: { title: "wait1-title", max: 4 },
        wait2: { title: "wait2-title", max: 4 },
        wait3: { title: "wait3-title", max: 4 }
    };
    
    let totalPlayers = 0;
    
    Object.entries(areas).forEach(([areaId, config]) => {
        const area = document.getElementById(areaId);
        const titleEl = document.getElementById(config.title);
        if (!area || !titleEl) return;
        
        const currentCount = area.children.length;
        totalPlayers += currentCount;
        
        let displayName = areaId;
        if (areaId.includes("court")) {
            displayName = `場地 ${areaId.replace('court', '')}`;
        } else if (areaId.includes("wait")) {
            displayName = `等待順位 ${areaId.replace('wait', '')}`;
        }
        
        const maxText = config.max ? `(${currentCount}/${config.max})` : `(${currentCount})`;
        titleEl.innerHTML = `${displayName} <span class="count">${maxText}</span>`;
        
        const countSpan = titleEl.querySelector(".count");
        if (config.max && currentCount >= config.max) {
            countSpan.style.color = "#e74c3c";
        } else if (config.max && currentCount >= config.max - 1) {
            countSpan.style.color = "#f39c12";
        } else {
            countSpan.style.color = "#339cc2";
        }
    });
    
    const restTitle = document.getElementById("rest-title");
    if (restTitle) {
        const restCount = document.getElementById("rest")?.children.length || 0;
        restTitle.innerHTML = `休息區 <span class="count">(${restCount}/${totalPlayers})</span>`;
    }
}

// ===== 季繳成員名單 Modal =====
function showMemberList() {
    const modal = document.getElementById("memberModal");
    const memberList = document.getElementById("memberList");
    
    memberList.innerHTML = "";
    
    FIXED_MEMBERS.forEach((name, index) => {
        const div = document.createElement("div");
        div.className = "member-item";
        div.innerHTML = `<span class="member-num">${index + 1}</span> ${name}`;
        memberList.appendChild(div);
    });
    
    modal.style.display = "flex";
}

function closeMemberModal() {
    document.getElementById("memberModal").style.display = "none";
}

// Modal 點擊外部關閉
window.onclick = function(event) {
    const deleteModal = document.getElementById("deleteModal");
    const memberModal = document.getElementById("memberModal");
    
    if (event.target === deleteModal) {
        closeDeleteModal();
    }
    if (event.target === memberModal) {
        closeMemberModal();
    }
}

window.onload = function() {
    loadPlayers();
};

// 頁面關閉時取消監聽
window.onbeforeunload = function() {
    if (unsubscribe) {
        unsubscribe();
    }
};
