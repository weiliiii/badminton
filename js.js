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

const STORAGE_KEY = "badminton-players";
const MAX_PLAYERS_PER_COURT = 4;
const MAX_PLAYERS_PER_WAIT = 4;

function savePlayers() {
    const allPlayers = {};
    document.querySelectorAll(".player-box").forEach(box => {
        const name = box.innerText;
        const parentId = box.parentElement.id;
        allPlayers[name] = parentId;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allPlayers));
}

function loadPlayers() {
    const data = localStorage.getItem(STORAGE_KEY);
    const positions = data ? JSON.parse(data) : {};
    
    const areas = {
        "rest": document.getElementById("rest"),
        "court1": document.getElementById("court1"),
        "court2": document.getElementById("court2"),
        "court3": document.getElementById("court3"),
        "wait1": document.getElementById("wait1"),
        "wait2": document.getElementById("wait2"),
        "wait3": document.getElementById("wait3")
    };
    
    // 1. 先載入固定成員（每次開啟都會出現）
    FIXED_MEMBERS.forEach(name => {
        const areaId = positions[name] || "rest";
        if (areas[areaId]) {
            areas[areaId].appendChild(createPlayer(name, true));
        } else {
            areas.rest.appendChild(createPlayer(name, true));
        }
    });
    
    // 2. 再載入非固定成員（臨時新增的）
    Object.entries(positions).forEach(([name, areaId]) => {
        // 跳過固定成員（已經載入過了）
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
    document.querySelectorAll(".list").forEach(list => list.innerHTML = "");
    localStorage.removeItem(STORAGE_KEY);
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
    
    // 取得區域顯示名稱
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
        
        // 固定成員加上標記
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
    // 確保取得正確的 player-box 元素（避免點到偽元素）
    const player = e.target.closest(".player-box");
    if (!player) return;
    
    const playerName = player.innerText;
    const parentId = player.parentElement.id;
    
    if (parentId === "rest") {
        // 從休息區點擊 → 進入可用場地
        const targetCourt = findAvailableCourt();
        if (targetCourt) {
            targetCourt.appendChild(player);
            console.log(`${playerName} 進入 ${targetCourt.id}`);
        } else {
            alert("所有場地都滿了！請等待。");
        }
    } else if (parentId.startsWith("court")) {
        // 從場地點擊 → 返回休息區
        document.getElementById("rest").appendChild(player);
        console.log(`${playerName} 返回休息區`);
    }
    // 等待區的成員點擊不做任何事（需要用拖曳）
    
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
    console.log(`等待1的 ${MAX_PLAYERS_PER_COURT - court.children.length} 人上場 ${court.id}`);
}

function rearrangeWaitingQueues() {
    const wait1 = document.getElementById("wait1");
    if (wait1) wait1.innerHTML = "";
    
    const wait2 = document.getElementById("wait2");
    if (wait2 && wait2.children.length > 0) {
        while (wait2.children.length > 0) {
            wait1.appendChild(wait2.firstElementChild);
        }
        console.log("等待2 → 等待1");
    }
    
    const wait3 = document.getElementById("wait3");
    if (wait3 && wait3.children.length > 0) {
        while (wait3.children.length > 0) {
            wait2.appendChild(wait3.firstElementChild);
        }
        console.log("等待3 → 等待2");
    }
    
    if (wait3) wait3.innerHTML = "";
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

// 觸控相關變數
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let isTouchDragging = false;
let touchClone = null;

function initDragDrop() {
    // 為所有 player-box 綁定拖曳事件（移除舊的再綁定新的）
    document.querySelectorAll(".player-box").forEach(box => {
        // 移除舊的事件監聽器（使用 clone 技巧）
        const newBox = box.cloneNode(true);
        box.parentNode.replaceChild(newBox, box);
        
        // 重新綁定事件
        newBox.addEventListener("click", onPlayerClick);
        
        // 電腦拖曳事件
        newBox.addEventListener("dragstart", dragStart);
        newBox.addEventListener("dragend", dragEnd);
        
        // 手機觸控事件
        newBox.addEventListener("touchstart", touchStart, { passive: false });
        newBox.addEventListener("touchmove", touchMove, { passive: false });
        newBox.addEventListener("touchend", touchEnd, { passive: false });
    });
    
    // Drop zones 只需要初始化一次
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

// ===== 電腦拖曳 =====
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

// ===== 手機觸控拖曳 =====
function touchStart(e) {
    const player = e.target.closest(".player-box");
    if (!player) return;
    
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
    isTouchDragging = false;
    
    draggedElement = player;
}

function touchMove(e) {
    if (!draggedElement) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);
    
    // 移動超過 10px 才視為拖曳
    if (deltaX > 10 || deltaY > 10) {
        isTouchDragging = true;
        e.preventDefault();
        e.stopPropagation();
        
        // 建立拖曳中的視覺複製品
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
            
            // 防止頁面滾動
            document.body.classList.add("touch-dragging-active");
            
            // 原始元素變透明
            draggedElement.style.opacity = "0.3";
        }
        
        // 更新複製品位置（置中於手指）
        const boxWidth = touchClone.offsetWidth;
        const boxHeight = touchClone.offsetHeight;
        touchClone.style.left = (touch.clientX - boxWidth / 2) + "px";
        touchClone.style.top = (touch.clientY - boxHeight / 2) + "px";
        
        // 檢查手指下方的放置區域
        highlightDropZone(touch.clientX, touch.clientY);
    }
}

function touchEnd(e) {
    if (!draggedElement) return;
    
    const touchDuration = Date.now() - touchStartTime;
    
    if (isTouchDragging) {
        // 是拖曳操作 - 找到放置目標
        const touch = e.changedTouches[0];
        const dropZone = getDropZoneAtPoint(touch.clientX, touch.clientY);
        
        if (dropZone && dropZone !== draggedElement.parentElement) {
            dropZone.appendChild(draggedElement);
            savePlayers();
            updatePlayerCounts();
            console.log(`${draggedElement.innerText} 移動到 ${dropZone.id}`);
        }
        
        // 清理拖曳狀態
        if (touchClone) {
            touchClone.remove();
            touchClone = null;
        }
        draggedElement.style.opacity = "1";
        clearDragOver();
        
        // 恢復頁面滾動
        document.body.classList.remove("touch-dragging-active");
        
    } else if (touchDuration < 300) {
        // 是點擊操作（短於 300ms）
        onPlayerClick({ target: draggedElement });
    }
    
    draggedElement = null;
    isTouchDragging = false;
}

// 根據座標找到放置區域
function getDropZoneAtPoint(x, y) {
    // 暫時隱藏複製品以便偵測下方元素
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

// 高亮手指下方的放置區域
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
    // initDragDrop() 已經在 loadPlayers() 中調用
    // updatePlayerCounts() 已經在 loadPlayers() 中調用
};
