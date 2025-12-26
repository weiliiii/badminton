function createPlayer(name) {
    const div = document.createElement("div");
    div.className = "player-box";
    div.innerText = name;
    return div;
}

function addPlayer() {
    const input = document.getElementById("playerInput");
    const name = input.value.trim();

    if (!name) return;

    document.getElementById("rest").appendChild(createPlayer(name));
    input.value = "";
}

function resetAll() {
    document.querySelectorAll(".list").forEach(list => list.innerHTML = "");
}

function removePlayer() {
    const name = prompt("輸入要刪除的隊員名字：");

    if (!name) return;

    document.querySelectorAll(".player-box").forEach(box => {
        if (box.innerText === name) box.remove();
    });
}
