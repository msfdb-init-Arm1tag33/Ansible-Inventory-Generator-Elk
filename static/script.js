function createRoleCheckboxes() {
    const roles = [
        "master", "data_content", "ingest", "data_hot",
        "data_warm", "data_cold", "data_frozen", "ml", "coordinator"
    ];
    return roles.map(role => `
        <label>
            <input type="checkbox" value="${role}"> ${role}
        </label>
    `).join(" ");
}

function addGroup() {
    const groupId = Date.now();
    const groupDiv = document.createElement("div");
    groupDiv.classList.add("group-block");
    groupDiv.innerHTML = `
        <h3>Grupo</h3>
        <label>Nome do grupo:</label>
        <input type="text" class="groupName" placeholder="ex: master_nodes">

        <div class="hostsContainer"></div>
        <button onclick="addHost(this)">Adicionar Host</button>
    `;
    document.getElementById("groupsContainer").appendChild(groupDiv);
}

function addHost(button) {
    const hostDiv = document.createElement("div");
    hostDiv.classList.add("host-block");
    hostDiv.innerHTML = `
        <label>Hostname:</label>
        <input type="text" class="hostname" placeholder="ex: master01">
        <label>IP:</label>
        <input type="text" class="ip" placeholder="ex: 192.168.0.10">
        <div class="roles">${createRoleCheckboxes()}</div>
    `;
    button.parentNode.querySelector(".hostsContainer").appendChild(hostDiv);
}

async function generateInventory() {
    const inventoryName = document.getElementById("inventoryName").value || "inventario_padrao";
    const groups = [];
    document.querySelectorAll(".group-block").forEach(groupBlock => {
        const groupName = groupBlock.querySelector(".groupName").value.trim();
        const hosts = [];
        groupBlock.querySelectorAll(".host-block").forEach(hostBlock => {
            const hostname = hostBlock.querySelector(".hostname").value.trim();
            const ip = hostBlock.querySelector(".ip").value.trim();
            const roles = Array.from(hostBlock.querySelectorAll(".roles input:checked")).map(i => i.value);
            if (hostname && ip) hosts.push({ hostname, ip, roles });
        });
        if (groupName && hosts.length > 0) groups.push({ group_name: groupName, hosts });
    });

    const res = await fetch("/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventory_name: inventoryName, groups })
    });
    const result = await res.json();

    document.getElementById("yamlOutput").textContent = jsyaml.dump(result.inventory);
}