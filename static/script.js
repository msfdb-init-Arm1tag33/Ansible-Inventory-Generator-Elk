const hostsContainer = document.getElementById("hosts-container");
const addHostBtn = document.getElementById("add-host");
const generateBtn = document.getElementById("generate-btn");
const resultDiv = document.getElementById("result");
const filenameSpan = document.getElementById("filename");
const downloadLink = document.getElementById("download-link");

const nodeTypes = [
  "master", "hot", "warm", "cold", "frozen",
  "kibana", "logstash", "fleet-server",
  "machine_learning", "coordinator"
];

const possibleRoles = [
  "master", "data_content", "data_hot", "data_cold",
  "data_warm", "data_frozen", "ingest"
];

addHostBtn.addEventListener("click", () => {
  const row = document.createElement("div");
  row.classList.add("host-row");

  const options = nodeTypes.map(t => `<option value="${t}">${t}</option>`).join("");

  row.innerHTML = `
    <input type="text" placeholder="Nome do host" class="host-name" required>
    <input type="text" placeholder="IP do host" class="host-ip" required>
    <label>Tipo:</label>
    <select class="host-type">${options}</select>
    <div class="roles hidden"></div>
  `;

  const select = row.querySelector(".host-type");
  const rolesContainer = row.querySelector(".roles");

  // Exibir checkboxes se for tipo de data node
  select.addEventListener("change", () => {
    const type = select.value;
    rolesContainer.innerHTML = "";
    if (["master", "hot", "warm", "cold", "frozen"].includes(type)) {
      rolesContainer.classList.remove("hidden");
      rolesContainer.innerHTML = possibleRoles.map(r => `
        <label class="role-item">
          <input type="checkbox" value="${r}"> ${r}
        </label>
      `).join("");
    } else {
      rolesContainer.classList.add("hidden");
    }
  });

  hostsContainer.appendChild(row);
});

generateBtn.addEventListener("click", async () => {
  const hosts = [];

  document.querySelectorAll(".host-row").forEach(row => {
    const name = row.querySelector(".host-name").value.trim();
    const ip = row.querySelector(".host-ip").value.trim();
    const type = row.querySelector(".host-type").value.trim();
    const roles = [...row.querySelectorAll(".roles input:checked")].map(cb => cb.value);

    if (name && ip) hosts.push({ name, ip, type, roles });
  });

  if (hosts.length === 0) {
    alert("Adicione pelo menos um host!");
    return;
  }

  const response = await fetch("/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hosts })
  });

  const data = await response.json();
  filenameSpan.textContent = `Arquivo: ${data.filename}`;
  downloadLink.href = `/download/${data.filename}`;
  resultDiv.classList.remove("hidden");
});