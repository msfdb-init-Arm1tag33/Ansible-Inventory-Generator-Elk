document.getElementById("varsForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);

  try {
    const response = await fetch("/generate_fleetserver_vars", {
      method: "POST",
      body: formData
    });

    if (!response.ok) throw new Error("Erro ao gerar o arquivo");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fleetserver_vars.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();

    document.getElementById("response").innerHTML =
      "<p style='color:green'>Arquivo fleetserver_vars.zip gerado com sucesso!</p>";
  } catch (error) {
    document.getElementById("response").innerHTML =
      "<p style='color:red'>Erro ao gerar o arquivo: " + error.message + "</p>";
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