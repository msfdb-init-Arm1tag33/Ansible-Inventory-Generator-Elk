const hostsContainer = document.getElementById("hosts-container");
const addHostBtn = document.getElementById("add-host");
const generateBtn = document.getElementById("generate-btn");
const resultDiv = document.getElementById("result");
const filenameSpan = document.getElementById("filename");
const downloadLink = document.getElementById("download-link");

addHostBtn.addEventListener("click", () => {
  const row = document.createElement("div");
  row.classList.add("host-row");
  row.innerHTML = `
    <input type="text" placeholder="Nome do host" class="host-name" required>
    <input type="text" placeholder="IP do host" class="host-ip" required>
  `;
  hostsContainer.appendChild(row);
});

generateBtn.addEventListener("click", async () => {
  const group = document.getElementById("group").value.trim();
  if (!group) {
    alert("Por favor, insira o nome do grupo!");
    return;
  }

  const hosts = [];
  document.querySelectorAll(".host-row").forEach(row => {
    const name = row.querySelector(".host-name").value.trim();
    const ip = row.querySelector(".host-ip").value.trim();
    if (name && ip) hosts.push({ name, ip });
  });

  if (hosts.length === 0) {
    alert("Adicione pelo menos um host!");
    return;
  }

  const response = await fetch("/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ group, hosts })
  });

  const data = await response.json();
  filenameSpan.textContent = `Arquivo: ${data.filename}`;
  downloadLink.href = `/download/${data.filename}`;
  resultDiv.classList.remove("hidden");
});