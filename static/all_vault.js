document.getElementById("vaultForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);

  try {
    const response = await fetch("/generate_vault_vars", {
      method: "POST",
      body: formData
    });

    if (!response.ok) throw new Error("Erro ao gerar o arquivo");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "all_vault.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();

    document.getElementById("response").innerHTML =
      "<p style='color:green'>Arquivo all_vault.zip gerado com sucesso!</p>";
  } catch (error) {
    document.getElementById("response").innerHTML =
      "<p style='color:red'>Erro ao gerar o arquivo: " + error.message + "</p>";
  }
});
