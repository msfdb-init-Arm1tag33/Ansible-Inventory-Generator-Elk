document.getElementById("varsForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  // Pergunta ao usuário qual inventário usar
  const inventoryName = prompt("Digite o nome do inventário onde salvar as variáveis:");
  if (!inventoryName) return alert("Nome do inventário é obrigatório!");

  const formData = new FormData(e.target);

  try {
    const response = await fetch(`/generate_all_vars?inventory_name=${inventoryName}`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) throw new Error("Erro ao gerar all.yml");

    const result = await response.json();
    document.getElementById("response").innerHTML =
      `<p style="color:green">${result.message}</p>`;
  } catch (error) {
    document.getElementById("response").innerHTML =
      `<p style="color:red">Erro: ${error.message}</p>`;
  }
});

// Adicionar nova variável manualmente
document.getElementById("addVarBtn").addEventListener("click", () => {
  const container = document.getElementById("varsContainer");

  const div = document.createElement("div");
  div.classList.add("var-field");

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "nome_da_variavel";
  nameInput.name = `custom_${Date.now()}`;

  const valueInput = document.createElement("input");
  valueInput.type = "text";
  valueInput.placeholder = "valor_da_variavel";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "Remover";
  removeBtn.classList.add("remove-btn");
  removeBtn.addEventListener("click", () => div.remove());

  div.appendChild(nameInput);
  div.appendChild(valueInput);
  div.appendChild(removeBtn);
  container.appendChild(div);
});
